// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, win and caught.
//
// ?seed=N fixes the night's randomness. ?shot=start|play|alarm|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_COIN, EVENT_PICKUP, EVENT_SPOTTED, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const info = { best: scene.best, score: world.score(), reason: '' };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, info);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toWorld(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let caughtReason = '';
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('The heist is on. Steal the Star Diamond and reach the exit.');
  }

  function finishGame() {
    const state = world.state;
    if (state.won) {
      screen = SCREEN_WIN;
      const score = world.score();
      if (score > best) {
        best = score;
        saveBest(best);
      }
      audio.win();
      announce(`Clean getaway. Score ${score}.`);
    } else {
      screen = SCREEN_CAUGHT;
      caughtReason = state.alarm >= 100
        ? 'The alarm hit 100% — the museum locked down around you.'
        : 'A guard got his hands on you.';
      audio.caught();
      announce('Caught. The heist is over.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.open();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT)) {
      input.takeClicks(); // The starting click is not a coin throw.
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('The heist resumes.');
    }
  }

  function step() {
    const state = world.state;
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, null, true);
      return;
    }
    // Coins first: a click this frame throws before the world moves.
    for (const click of input.takeClicks()) {
      if (world.throwCoin(click.x, click.y)) audio.coin();
    }
    const mouse = input.mouse();
    const aim = mouse.inside
      ? Math.atan2(mouse.y - state.thief.y, mouse.x - state.thief.x)
      : null;
    const events = world.step(STEP, input.move(), input.sneaking(), aim, false);
    if (events & EVENT_PICKUP) {
      audio.pickup(state.lastPickup === 'Star Diamond');
      announce(`Took the ${state.lastPickup}. Bag holds ${state.lootCount} pieces.`);
    }
    if (events & EVENT_SPOTTED) {
      audio.spotted();
      announce('Spotted! The alarm is climbing.');
    }
    if (events & (EVENT_WIN | EVENT_CAUGHT)) finishGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const info = { best, score: world.score(), reason: caughtReason };
    renderer.draw(world.state, screen, info);
  }

  // Leaving the tab pauses a running heist rather than letting it be lost unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vaultfall. Press Space or click to start the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

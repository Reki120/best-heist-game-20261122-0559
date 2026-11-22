// The screenshot scenes behind ?shot=start|play|alarm|end. Each one runs the real rules
// forward from a fresh world, or stages the thief and the watchers by hand for the frames
// a live game only sometimes gives (the moment of being spotted, the moment of escape),
// so every screenshot is the game's own code rendering its own state, and the same seed
// always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** The alarm scene is ordinary play with the meter high and SPOTTED lit; the end is the win. */
export const SCREEN_ALARM = SCREEN_PLAY;
export const SCREEN_END = SCREEN_WIN;

const IDLE = { x: 0, y: 0 };

/** Step the world with no input: the watch patrols and the cameras sweep on their own. */
function idle(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, IDLE, false, null, true);
}

/** Put a guard somewhere exact, looking an exact way, back on its patrol. */
function placeGuard(guard, x, y, facing) {
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.mode = 'patrol';
  guard.seesThief = false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it. Every scene keeps
 * the whole museum in frame: the thief crossing a room, guards and cameras with their
 * vision cones, loot waiting, and the alarm meter up top.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();

  if (name === 'play') {
    idle(world, 7);
    // Mid-crossing in the great hall, a guard's cone sweeping past, the vault beyond.
    state.thief.x = 648;
    state.thief.y = 318;
    state.thief.facing = 0.5;
    state.alarm = 16;
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'alarm') {
    idle(world, 3);
    // Caught in a guard's cone in the gallery, emerald already in the bag, alarm climbing.
    const guard = state.guards[0];
    placeGuard(guard, 268, 208, 0.35);
    state.thief.x = 356;
    state.thief.y = 232;
    state.thief.facing = 2.6;
    guard.seesThief = true;
    guard.mode = 'chase';
    state.seen = true;
    state.seenByGuard = true;
    state.cameras[1].seesThief = false;
    state.alarm = 76;
    state.lootValue = 700;
    state.lootCount = 1;
    for (const item of state.loot) if (item.kind === 'gem' && item.value === 700) item.taken = true;
    return { screen: SCREEN_ALARM, best: 0 };
  }

  if (name === 'end') {
    idle(world, 5);
    // Home: at the exit with the diamond held high and most of the museum in the bag.
    state.thief.x = 104;
    state.thief.y = 730;
    state.thief.facing = -Math.PI / 2;
    state.hasDiamond = true;
    state.lootValue = 7850;
    state.lootCount = 6;
    state.alarm = 12;
    for (const item of state.loot) {
      if (item.kind === 'diamond' || item.value === 600 || item.value === 800 || item.value === 450 || item.value === 700 || item.value === 300) {
        item.taken = true;
      }
    }
    state.over = true;
    state.won = true;
    return { screen: SCREEN_END, best: 0 };
  }

  // 'start' and anything else: the title over the living museum, mid-patrol.
  idle(world, 4);
  return { screen: SCREEN_TITLE, best: 0 };
}

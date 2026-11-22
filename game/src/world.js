// The heist itself, with no drawing and no browser in it: the thief, the patrolling guards,
// the sweeping cameras, the loot and the alarm. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react with sound and screens without the
// world knowing about either. A watcher sees the thief when he is inside its vision cone,
// in range, and no wall stands between them; every watcher who sees him feeds the alarm.

import {
  ALARM, CAMERA, CAMERAS, EXIT, GUARD, GUARD_PATROLS, LOOT, THIEF, WALLS,
} from './config.js';
import { angleDelta, lineOfSight, slideMove } from './geometry.js';

export const EVENT_PICKUP = 1;
export const EVENT_COIN = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_WIN = 8;
export const EVENT_CAUGHT = 16;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createWorld(random) {
  const thief = {
    x: THIEF.start.x, y: THIEF.start.y, facing: -Math.PI / 2, sneaking: false, coinCooldown: 0,
  };
  const guards = GUARD_PATROLS.map((patrol, index) => ({
    x: patrol[0].x,
    y: patrol[0].y,
    facing: Math.atan2(patrol[1].y - patrol[0].y, patrol[1].x - patrol[0].x),
    patrol,
    waypoint: 1,
    mode: 'patrol',
    memory: 0,
    seesThief: false,
    distractTimer: 0,
    phase: random.range(0, Math.PI * 2),
  }));
  const cameras = CAMERAS.map((spec) => ({
    x: spec.x, y: spec.y, baseAngle: spec.baseAngle, phase: spec.phase, angle: spec.baseAngle, seesThief: false,
  }));
  const loot = LOOT.map((spec) => ({ ...spec, taken: false }));
  const state = {
    thief,
    guards,
    cameras,
    loot,
    noise: null,
    alarm: 0,
    seen: false,
    seenByGuard: false,
    lootValue: 0,
    lootCount: 0,
    hasDiamond: false,
    elapsed: 0,
    over: false,
    won: false,
    lastPickup: '',
  };

  function reset() {
    thief.x = THIEF.start.x;
    thief.y = THIEF.start.y;
    thief.facing = -Math.PI / 2;
    thief.coinCooldown = 0;
    for (const guard of guards) {
      guard.x = guard.patrol[0].x;
      guard.y = guard.patrol[0].y;
      guard.waypoint = 1;
      guard.mode = 'patrol';
      guard.memory = 0;
      guard.seesThief = false;
      guard.distractTimer = 0;
    }
    for (const item of loot) item.taken = false;
    state.noise = null;
    state.alarm = 0;
    state.seen = false;
    state.seenByGuard = false;
    state.lootValue = 0;
    state.lootCount = 0;
    state.hasDiamond = false;
    state.elapsed = 0;
    state.over = false;
    state.won = false;
    state.lastPickup = '';
  }

  /** Whether a watcher at (x, y) looking along `facing` can see the thief right now. */
  function canSee(watcher, facing, range, halfAngle) {
    const dist = distance(watcher, thief);
    if (dist > range) return 0;
    const toward = Math.atan2(thief.y - watcher.y, thief.x - watcher.x);
    if (angleDelta(toward, facing) > halfAngle) return 0;
    if (!lineOfSight(watcher, thief, WALLS)) return 0;
    // The closer the thief, the faster he is recognised: 1 at arm's length, less at range.
    return 1.2 - (dist / range) * 0.7;
  }

  function moveGuard(guard, target, speed, dt) {
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const stepX = (dx / dist) * Math.min(speed * dt, dist);
    const stepY = (dy / dist) * Math.min(speed * dt, dist);
    const next = slideMove(guard, stepX, stepY, GUARD.radius, WALLS);
    guard.x = next.x;
    guard.y = next.y;
    guard.facing = Math.atan2(dy, dx);
    return dist <= speed * dt + 2;
  }

  function stepGuard(guard, dt) {
    if (guard.mode === 'chase') {
      moveGuard(guard, thief, GUARD.chaseSpeed, dt);
      return;
    }
    if (guard.mode === 'distracted' && state.noise !== null) {
      guard.distractTimer -= dt;
      const arrived = moveGuard(guard, state.noise, GUARD.speed * 1.15, dt);
      if (arrived) guard.facing += dt * 1.6; // At the noise, looking around for its maker.
      if (guard.distractTimer <= 0) guard.mode = 'patrol';
      return;
    }
    const target = guard.patrol[guard.waypoint];
    if (moveGuard(guard, target, GUARD.speed, dt)) {
      guard.waypoint = (guard.waypoint + 1) % guard.patrol.length;
    }
  }

  /**
   * Throw a coin toward (x, y): it lands no farther than the thief can throw, rings there,
   * and every guard close enough to hear it walks over to look. Returns false while the
   * thief's pockets are still cooling down.
   */
  function throwCoin(x, y) {
    if (thief.coinCooldown > 0 || state.over) return false;
    const dist = distance(thief, { x, y });
    const scale = dist > THIEF.coinRange ? THIEF.coinRange / dist : 1;
    const landing = { x: thief.x + (x - thief.x) * scale, y: thief.y + (y - thief.y) * scale };
    state.noise = { x: landing.x, y: landing.y, timer: GUARD.distractSeconds };
    thief.coinCooldown = THIEF.coinCooldown;
    for (const guard of guards) {
      if (guard.mode !== 'chase' && distance(guard, landing) <= GUARD.hearingRange) {
        guard.mode = 'distracted';
        guard.distractTimer = GUARD.distractSeconds;
      }
    }
    return true;
  }

  /**
   * One fixed step. `move` is the held direction (each axis -1, 0 or 1), `sneaking` the
   * Shift key, `aim` the mouse angle the thief faces when given. With `harmless` set (the
   * title screen's backdrop) the night watch patrols but nobody can be caught or rob.
   */
  function step(dt, move, sneaking, aim, harmless) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    if (thief.coinCooldown > 0) thief.coinCooldown = Math.max(0, thief.coinCooldown - dt);
    thief.sneaking = sneaking;

    // The thief.
    const length = Math.hypot(move.x, move.y);
    if (length > 0) {
      const speed = sneaking ? THIEF.sneakSpeed : THIEF.speed;
      const next = slideMove(
        thief,
        (move.x / length) * speed * dt,
        (move.y / length) * speed * dt,
        THIEF.radius,
        WALLS,
      );
      thief.x = next.x;
      thief.y = next.y;
      if (aim === null) thief.facing = Math.atan2(move.y, move.x);
    }
    if (aim !== null) thief.facing = aim;

    // The watchers.
    for (const guard of guards) stepGuard(guard, dt);
    for (const camera of cameras) {
      camera.angle = camera.baseAngle + Math.sin(state.elapsed * CAMERA.sweepSpeed + camera.phase) * CAMERA.sweepArc;
    }
    if (state.noise !== null) {
      state.noise.timer -= dt;
      if (state.noise.timer <= 0) state.noise = null;
    }
    if (harmless) return events;

    // Being seen.
    let rise = 0;
    let anySeen = false;
    let guardSeen = false;
    for (const guard of guards) {
      const strength = canSee(guard, guard.facing, GUARD.visionRange, GUARD.visionHalfAngle);
      guard.seesThief = strength > 0;
      if (guard.seesThief) {
        anySeen = true;
        guardSeen = true;
        rise += strength;
        guard.mode = 'chase';
        guard.memory = 1;
      } else if (guard.mode === 'chase') {
        guard.memory -= dt;
        if (guard.memory <= 0) guard.mode = 'patrol';
      }
      if (distance(guard, thief) < ALARM.catchDistance) {
        state.over = true;
        state.won = false;
        state.alarm = ALARM.max;
        return events | EVENT_CAUGHT;
      }
    }
    for (const camera of cameras) {
      const strength = canSee(camera, camera.angle, CAMERA.visionRange, CAMERA.visionHalfAngle);
      camera.seesThief = strength > 0;
      if (camera.seesThief) {
        anySeen = true;
        rise += strength;
      }
    }
    if (anySeen && !state.seen) events |= EVENT_SPOTTED;
    state.seen = anySeen;
    state.seenByGuard = guardSeen;
    if (anySeen) {
      const scale = (sneaking ? THIEF.sneakVisibility : 1) * ALARM.riseRate;
      state.alarm = Math.min(ALARM.max, state.alarm + Math.min(rise * scale, ALARM.riseCap) * dt);
      if (state.alarm >= ALARM.max) {
        state.over = true;
        state.won = false;
        return events | EVENT_CAUGHT;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decayRate * dt);
    }

    // The taking.
    for (const item of loot) {
      if (item.taken) continue;
      if (distance(thief, item) < THIEF.radius + 15) {
        item.taken = true;
        state.lootValue += item.value;
        state.lootCount += 1;
        state.lastPickup = item.label;
        if (item.kind === 'diamond') state.hasDiamond = true;
        events |= EVENT_PICKUP;
      }
    }

    // The getting away.
    if (
      state.hasDiamond
      && thief.x > EXIT.x && thief.x < EXIT.x + EXIT.width
      && thief.y > EXIT.y && thief.y < EXIT.y + EXIT.height
    ) {
      state.over = true;
      state.won = true;
      events |= EVENT_WIN;
    }
    return events;
  }

  /** The heist's score: what was carried out, plus a bonus for a quiet, quick night. */
  function score() {
    if (!state.won) return state.lootValue;
    const quietBonus = Math.round((ALARM.max - state.alarm) * 10);
    const timeBonus = Math.max(0, 900 - Math.floor(state.elapsed) * 4);
    return state.lootValue + quietBonus + timeBonus;
  }

  reset();
  return { state, reset, step, throwCoin, score };
}

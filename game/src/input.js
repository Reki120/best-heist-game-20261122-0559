// Keyboard and mouse input. Held keys give the thief a direction and a sneak flag; the
// mouse aims him and a click throws a coin; one-shot presses (start, pause) are queued as
// bit flags and taken once by the loop, so a press between frames is never lost or doubled.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight', 'KeyC']);

const KEYS = {
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
};

export function createInput(canvas, toWorld) {
  const held = { up: false, down: false, left: false, right: false, sneak: false };
  const mouse = { x: 0, y: 0, inside: false };
  let actions = 0;
  let clicks = [];

  function directionOf(event) {
    for (const name of Object.keys(KEYS)) if (KEYS[name].has(event.code)) return name;
    return null;
  }

  window.addEventListener('keydown', (event) => {
    const name = directionOf(event);
    if (name !== null) held[name] = true;
    else if (SNEAK.has(event.code)) held.sneak = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    const name = directionOf(event);
    if (name !== null) held[name] = false;
    else if (SNEAK.has(event.code)) held.sneak = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.sneak = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = toWorld(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toWorld(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    clicks.push({ x: point.x, y: point.y });
    actions |= ACTION_CONFIRM;
  });

  return {
    /** The held movement as a vector with each axis in -1, 0 or 1. */
    move() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    sneaking() {
      return held.sneak;
    },
    /** The mouse position in world coordinates: the thief faces it and coins land there. */
    mouse() {
      return mouse;
    },
    /** The clicks since the last call, oldest first. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

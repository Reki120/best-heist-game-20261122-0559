// Vaultfall's numbers in one place: the field, the thief, the watchers, the loot and the
// floor plan of the museum. Everything else reads these; nothing else hard-codes a size.

/** The world is a fixed 1280 by 800 stage; the canvas scales it to the window. */
export const FIELD = { width: 1280, height: 800 };

/** The simulation advances in fixed steps so a slow frame and a fast one play the same game. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  speed: 178,
  sneakSpeed: 96,
  /** Being seen while sneaking fills the alarm at this fraction of the standing rate. */
  sneakVisibility: 0.55,
  start: { x: 104, y: 716 },
  /** How far a thrown coin can land from the thief. */
  coinRange: 330,
  coinCooldown: 3,
};

export const GUARD = {
  radius: 14,
  speed: 74,
  chaseSpeed: 118,
  visionRange: 176,
  visionHalfAngle: 0.44,
  /** Seconds a guard keeps walking to a noise before giving up and resuming the patrol. */
  distractSeconds: 2.6,
  /** How close a noise must be for a guard to bother with it. */
  hearingRange: 280,
};

export const CAMERA = {
  visionRange: 208,
  visionHalfAngle: 0.36,
  sweepSpeed: 0.55,
  sweepArc: 0.75,
};

export const ALARM = {
  max: 100,
  /** Points per second from one watcher with a clear view, before distance and sneak scale it. */
  riseRate: 30,
  decayRate: 10,
  /** The fastest the meter can climb, however many watchers see the thief at once. */
  riseCap: 46,
  /** Touching a guard ends the heist at once, whatever the meter says. */
  catchDistance: 27,
};

/** The way out: the thief must stand in this zone holding the Star Diamond to win. */
export const EXIT = { x: 44, y: 744, width: 132, height: 40, label: 'EXIT' };

/**
 * The floor plan: solid wall rectangles. The gaps between them are the doorways; the rooms
 * they make are the gallery (top left), the great hall (top middle), the vault (top right),
 * the lobby (bottom left) and the offices (bottom right), joined by the corridor at y 516-580.
 */
export const WALLS = [
  // The outer shell.
  { x: 0, y: 0, width: 1280, height: 16 },
  { x: 0, y: 784, width: 1280, height: 16 },
  { x: 0, y: 0, width: 16, height: 800 },
  { x: 1264, y: 0, width: 16, height: 800 },
  // Gallery | great hall, with a doorway at y 220-300.
  { x: 500, y: 16, width: 16, height: 204 },
  { x: 500, y: 300, width: 16, height: 200 },
  // Great hall | vault, with the vault doorway at y 180-250.
  { x: 860, y: 16, width: 16, height: 164 },
  { x: 860, y: 250, width: 16, height: 250 },
  // Gallery | lobby, with a doorway at x 200-280.
  { x: 16, y: 500, width: 184, height: 16 },
  { x: 280, y: 500, width: 220, height: 16 },
  // Hall and vault | corridor and offices, with a doorway at x 880-960.
  { x: 516, y: 500, width: 364, height: 16 },
  { x: 960, y: 500, width: 304, height: 16 },
  // Inside the offices, with a doorway at y 620-690.
  { x: 980, y: 516, width: 16, height: 104 },
  { x: 980, y: 690, width: 16, height: 94 },
];

/** Faint names painted on the floor of each room. */
export const ROOM_LABELS = [
  { x: 258, y: 258, text: 'GALLERY' },
  { x: 688, y: 258, text: 'GREAT HALL' },
  { x: 1070, y: 258, text: 'THE VAULT' },
  { x: 258, y: 648, text: 'LOBBY' },
  { x: 760, y: 648, text: 'OFFICES' },
];

/** Each guard walks its waypoints in a loop, in order, then starts again. */
export const GUARD_PATROLS = [
  [{ x: 120, y: 120 }, { x: 420, y: 120 }, { x: 420, y: 420 }, { x: 120, y: 420 }],
  [{ x: 580, y: 400 }, { x: 800, y: 400 }, { x: 800, y: 96 }, { x: 580, y: 96 }],
  [{ x: 130, y: 646 }, { x: 1150, y: 646 }, { x: 1150, y: 726 }, { x: 220, y: 726 }],
];

/** Cameras sit on walls and sweep their cone back and forth around a base direction. */
export const CAMERAS = [
  { x: 892, y: 44, baseAngle: 0.5, phase: 0 },
  { x: 252, y: 540, baseAngle: Math.PI / 2, phase: 2.1 },
];

/** Everything worth stealing. The diamond is the target; the rest is greed. */
export const LOOT = [
  { x: 1070, y: 118, kind: 'diamond', value: 5000, label: 'Star Diamond' },
  { x: 138, y: 178, kind: 'painting', value: 400, label: 'Old Master' },
  { x: 386, y: 428, kind: 'gem', value: 350, label: 'Ruby' },
  { x: 622, y: 178, kind: 'gold', value: 600, label: 'Gold bars' },
  { x: 762, y: 330, kind: 'cash', value: 450, label: 'Cash bundle' },
  { x: 250, y: 700, kind: 'cash', value: 300, label: 'Till cash' },
  { x: 1096, y: 706, kind: 'gold', value: 800, label: 'Reserve gold' },
  { x: 1150, y: 300, kind: 'gem', value: 700, label: 'Emerald' },
  { x: 62, y: 596, kind: 'gem', value: 250, label: 'Opal' },
];

export const BEST_KEY = 'vaultfall-best-score';

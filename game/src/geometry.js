// The geometry the stealth rules stand on: whether a wall stands between two points, and
// the polygon of floor a watcher can actually see once the walls have cut its cone down.

/** The smaller angle between two directions, in [0, pi]. */
export function angleDelta(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** Where segments p1-p2 and p3-p4 cross, as the fraction t along p1-p2, or null. */
function segmentCrossing(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (denom === 0) return null;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return t;
}

/** The four edges of a wall rectangle, as segment endpoint pairs. */
function wallEdges(wall) {
  const { x, y, width, height } = wall;
  return [
    [{ x, y }, { x: x + width, y }],
    [{ x: x + width, y }, { x: x + width, y: y + height }],
    [{ x: x + width, y: y + height }, { x, y: y + height }],
    [{ x, y: y + height }, { x, y }],
  ];
}

/** True when the straight line from a to b crosses no wall: a watcher at a can see b. */
export function lineOfSight(a, b, walls) {
  for (const wall of walls) {
    for (const [p3, p4] of wallEdges(wall)) {
      const t = segmentCrossing(a, b, p3, p4);
      if (t !== null && t > 0.001 && t < 0.999) return false;
    }
  }
  return true;
}

/** The nearest wall hit along the ray from origin at angle, as a distance (range if none). */
function rayDistance(origin, angle, range, walls) {
  const end = { x: origin.x + Math.cos(angle) * range, y: origin.y + Math.sin(angle) * range };
  let best = range;
  for (const wall of walls) {
    for (const [p3, p4] of wallEdges(wall)) {
      const t = segmentCrossing(origin, end, p3, p4);
      if (t !== null && t * range < best) best = t * range;
    }
  }
  return best;
}

/**
 * The visible fan of a vision cone: rays swept across it, each stopped by the first wall,
 * returned as polygon points around the watcher. This is both what is drawn and, through
 * the same rays, a fair picture of what the watcher covers.
 */
export function visionPolygon(origin, facing, halfAngle, range, walls, rays = 17) {
  const points = [{ x: origin.x, y: origin.y }];
  for (let i = 0; i < rays; i += 1) {
    const angle = facing - halfAngle + (2 * halfAngle * i) / (rays - 1);
    const d = rayDistance(origin, angle, range, walls);
    points.push({ x: origin.x + Math.cos(angle) * d, y: origin.y + Math.sin(angle) * d });
  }
  return points;
}

/** True when a circle at (x, y) would overlap any wall rectangle. */
export function circleHitsWall(x, y, radius, walls) {
  for (const wall of walls) {
    const nearX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
    const nearY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** Move a circle by (dx, dy), sliding along walls it would cross: try both axes apart. */
export function slideMove(pos, dx, dy, radius, walls) {
  const next = { x: pos.x, y: pos.y };
  if (!circleHitsWall(pos.x + dx, pos.y, radius, walls)) next.x = pos.x + dx;
  if (!circleHitsWall(next.x, pos.y + dy, radius, walls)) next.y = pos.y + dy;
  return next;
}

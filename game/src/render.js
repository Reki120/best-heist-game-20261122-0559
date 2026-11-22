// Drawing only: the world's state and the current screen in, pixels out. The 1280x800
// stage is scaled to fit the window and centred. The order matters: floor, exit and loot,
// the noise a coin made, then the vision cones (already clipped by the walls), the walls
// themselves, the watchers and the thief, and the HUD over everything, so one frame shows
// the whole heist at a glance: the room, the cones, the cameras, the loot and the alarm.

import { ALARM, CAMERA, EXIT, FIELD, GUARD, ROOM_LABELS, WALLS } from './config.js';
import { visionPolygon } from './geometry.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const COLOURS = {
  backdrop: '#07090d',
  floor: '#181d29',
  floorAlt: '#1c222f',
  label: 'rgba(238, 241, 245, 0.055)',
  wall: '#3a4358',
  wallTop: '#55617c',
  exit: '#14532d',
  exitText: '#4ade80',
  guardBody: '#2f6bd8',
  guardCap: '#1c3f7c',
  cameraBody: '#232936',
  thiefBody: '#10151f',
  thiefTrim: '#2dd4bf',
  text: '#eef1f5',
  muted: '#98a2b3',
  gold: '#f2c94c',
  panel: 'rgba(16, 20, 30, 0.88)',
  panelEdge: '#3a4358',
};

function formatMoney(value) {
  return '$' + String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client (CSS pixel) point to world coordinates, for the mouse. */
  function toWorld(clientX, clientY) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.x) / view.scale,
      y: (clientY * ratio - view.y) / view.scale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight = 400) {
    const key = `${size}/${weight}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function polygon(points, fill, stroke) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.closePath();
    if (fill !== null) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke !== null) {
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  function circle(x, y, radius, fill) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
  }

  function drawFloor() {
    context.fillStyle = COLOURS.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const tile = 64;
    context.fillStyle = COLOURS.floorAlt;
    for (let y = 0; y < FIELD.height / tile; y += 1) {
      for (let x = 0; x < FIELD.width / tile; x += 1) {
        if ((x + y) % 2 === 0) context.fillRect(x * tile, y * tile, tile, tile);
      }
    }
    context.textBaseline = 'middle';
    for (const label of ROOM_LABELS) {
      text(label.text, label.x, label.y, 30, COLOURS.label, 'center', 700);
    }
  }

  function drawExit(state) {
    context.fillStyle = COLOURS.exit;
    context.fillRect(EXIT.x, EXIT.y, EXIT.width, EXIT.height);
    context.strokeStyle = COLOURS.exitText;
    context.lineWidth = 2;
    context.strokeRect(EXIT.x + 2, EXIT.y + 2, EXIT.width - 4, EXIT.height - 4);
    context.textBaseline = 'middle';
    const ready = state.hasDiamond;
    text(
      ready ? 'EXIT — GO!' : 'EXIT',
      EXIT.x + EXIT.width / 2,
      EXIT.y + EXIT.height / 2 + 1,
      20,
      ready ? '#bbf7d0' : COLOURS.exitText,
      'center',
      700,
    );
  }

  function drawLootItem(item, elapsed) {
    const { x, y } = item;
    context.fillStyle = 'rgba(0, 0, 0, 0.35)';
    context.beginPath();
    context.ellipse(x, y + 10, 15, 5, 0, 0, Math.PI * 2);
    context.fill();
    if (item.kind === 'diamond') {
      const pulse = 12 + Math.sin(elapsed * 3) * 2.5;
      circle(x, y, pulse + 7, 'rgba(103, 232, 249, 0.16)');
      polygon(
        [{ x, y: y - 13 }, { x: x + 11, y: y - 3 }, { x, y: y + 13 }, { x: x - 11, y: y - 3 }],
        '#67e8f9',
        '#cffafe',
      );
      polygon([{ x, y: y - 13 }, { x: x + 11, y: y - 3 }, { x: x - 11, y: y - 3 }], '#a5f3fc', null);
    } else if (item.kind === 'painting') {
      context.fillStyle = '#b45309';
      context.fillRect(x - 14, y - 11, 28, 22);
      context.fillStyle = '#7c2d12';
      context.fillRect(x - 10, y - 7, 20, 14);
      context.fillStyle = '#f59e0b';
      context.fillRect(x - 6, y - 3, 12, 6);
    } else if (item.kind === 'gem') {
      polygon(
        [{ x, y: y - 11 }, { x: x + 9, y: y - 4 }, { x: x + 6, y: y + 10 }, { x: x - 6, y: y + 10 }, { x: x - 9, y: y - 4 }],
        '#e879f9',
        '#f5d0fe',
      );
    } else if (item.kind === 'gold') {
      context.fillStyle = '#eab308';
      context.fillRect(x - 13, y + 1, 26, 7);
      context.fillRect(x - 10, y - 6, 20, 7);
      context.fillStyle = '#fde047';
      context.fillRect(x - 13, y + 1, 26, 2);
      context.fillRect(x - 10, y - 6, 20, 2);
    } else {
      context.fillStyle = '#16a34a';
      context.fillRect(x - 12, y - 7, 24, 14);
      context.fillStyle = '#bbf7d0';
      context.fillRect(x - 3, y - 7, 6, 14);
    }
  }

  function drawNoise(state) {
    if (state.noise === null) return;
    const { x, y, timer } = state.noise;
    const age = GUARD.distractSeconds - timer;
    const radius = 10 + age * 26;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(242, 201, 76, 0.55)';
    context.lineWidth = 2;
    context.stroke();
    circle(x, y, 4, COLOURS.gold);
    context.textBaseline = 'bottom';
    text('♪', x, y - radius - 2, 18, COLOURS.gold, 'center', 700);
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      const fan = visionPolygon(camera, camera.angle, CAMERA.visionHalfAngle, CAMERA.visionRange, WALLS);
      polygon(
        fan,
        camera.seesThief ? 'rgba(239, 68, 68, 0.30)' : 'rgba(251, 146, 60, 0.17)',
        camera.seesThief ? 'rgba(239, 68, 68, 0.45)' : 'rgba(251, 146, 60, 0.30)',
      );
    }
    for (const guard of state.guards) {
      const fan = visionPolygon(guard, guard.facing, GUARD.visionHalfAngle, GUARD.visionRange, WALLS);
      polygon(
        fan,
        guard.seesThief ? 'rgba(239, 68, 68, 0.32)' : 'rgba(250, 204, 21, 0.17)',
        guard.seesThief ? 'rgba(239, 68, 68, 0.5)' : 'rgba(250, 204, 21, 0.30)',
      );
    }
  }

  function drawWalls() {
    for (const wall of WALLS) {
      context.fillStyle = COLOURS.wall;
      context.fillRect(wall.x, wall.y, wall.width, wall.height);
      context.fillStyle = COLOURS.wallTop;
      context.fillRect(wall.x, wall.y, wall.width, Math.min(4, wall.height));
    }
  }

  function drawCamera(camera, elapsed) {
    context.fillStyle = COLOURS.cameraBody;
    context.fillRect(camera.x - 10, camera.y - 10, 20, 20);
    context.strokeStyle = '#4b5563';
    context.lineWidth = 1.5;
    context.strokeRect(camera.x - 10, camera.y - 10, 20, 20);
    const lensX = camera.x + Math.cos(camera.angle) * 6;
    const lensY = camera.y + Math.sin(camera.angle) * 6;
    circle(lensX, lensY, 5, '#0a0c10');
    const ledOn = camera.seesThief || Math.floor(elapsed * 2) % 2 === 0;
    circle(camera.x + 6, camera.y - 6, 2.4, ledOn ? '#ef4444' : '#7f1d1d');
    context.textBaseline = 'bottom';
    if (camera.seesThief) text('!', camera.x, camera.y - 14, 20, '#ef4444', 'center', 800);
  }

  function drawGuard(guard) {
    context.fillStyle = 'rgba(0, 0, 0, 0.35)';
    context.beginPath();
    context.ellipse(guard.x, guard.y + 9, 13, 5, 0, 0, Math.PI * 2);
    context.fill();
    circle(guard.x, guard.y, GUARD.radius, COLOURS.guardBody);
    // The cap brim points the way he faces.
    const bx = guard.x + Math.cos(guard.facing) * 9;
    const by = guard.y + Math.sin(guard.facing) * 9;
    circle(bx, by, 6.5, COLOURS.guardCap);
    circle(guard.x, guard.y, 4, '#fbbf24');
    context.textBaseline = 'bottom';
    if (guard.seesThief || guard.mode === 'chase') {
      text('!', guard.x, guard.y - GUARD.radius - 3, 22, '#ef4444', 'center', 800);
    } else if (guard.mode === 'distracted') {
      text('?', guard.x, guard.y - GUARD.radius - 3, 20, COLOURS.gold, 'center', 800);
    }
  }

  function drawThief(state) {
    const thief = state.thief;
    context.fillStyle = 'rgba(0, 0, 0, 0.4)';
    context.beginPath();
    context.ellipse(thief.x, thief.y + 9, 12, 5, 0, 0, Math.PI * 2);
    context.fill();
    if (state.lootCount > 0) {
      const bx = thief.x - Math.cos(thief.facing) * 12;
      const by = thief.y - Math.sin(thief.facing) * 12;
      circle(bx, by, 7, '#92400e');
    }
    circle(thief.x, thief.y, thief.sneaking ? 11.5 : 13, COLOURS.thiefBody);
    context.beginPath();
    context.arc(thief.x, thief.y, thief.sneaking ? 11.5 : 13, 0, Math.PI * 2);
    context.strokeStyle = COLOURS.thiefTrim;
    context.lineWidth = 2;
    context.stroke();
    // Eyes toward the facing, so the way he looks reads at a glance.
    const ex = Math.cos(thief.facing);
    const ey = Math.sin(thief.facing);
    const px = -ey;
    const py = ex;
    circle(thief.x + ex * 6 + px * 3.6, thief.y + ey * 6 + py * 3.6, 1.7, '#e5e7eb');
    circle(thief.x + ex * 6 - px * 3.6, thief.y + ey * 6 - py * 3.6, 1.7, '#e5e7eb');
    if (state.hasDiamond) {
      const dx = thief.x - ex * 4;
      const dy = thief.y - ey * 4 - 16;
      polygon(
        [{ x: dx, y: dy - 6 }, { x: dx + 5, y: dy }, { x: dx, y: dy + 6 }, { x: dx - 5, y: dy }],
        '#67e8f9',
        null,
      );
    }
  }

  function drawAlarmMeter(state) {
    const barX = 470;
    const barY = 13;
    const barWidth = 340;
    const barHeight = 17;
    context.textBaseline = 'middle';
    text('ALARM', barX - 12, barY + barHeight / 2 + 1, 17, state.alarm > 70 ? '#ef4444' : COLOURS.muted, 'right', 700);
    context.fillStyle = '#0d1119';
    context.fillRect(barX, barY, barWidth, barHeight);
    const fraction = state.alarm / ALARM.max;
    if (fraction > 0) {
      const hue = 120 - fraction * 120;
      context.fillStyle = `hsl(${hue}, 85%, 48%)`;
      context.fillRect(barX + 2, barY + 2, (barWidth - 4) * fraction, barHeight - 4);
    }
    context.strokeStyle = state.alarm > 70 && Math.floor(state.elapsed * 4) % 2 === 0 ? '#ef4444' : '#4b5563';
    context.lineWidth = 1.5;
    context.strokeRect(barX, barY, barWidth, barHeight);
    // The percentage sits inside the bar's right end, clear of the objective text.
    text(`${Math.floor(state.alarm)}%`, barX + barWidth - 7, barY + barHeight / 2 + 1, 13, '#eef1f5', 'right', 700);
    if (state.seen) {
      text('SPOTTED!', FIELD.width / 2, barY + barHeight + 17, 16, '#ef4444', 'center', 800);
    }
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(9, 12, 18, 0.82)';
    context.fillRect(0, 0, FIELD.width, 44);
    context.textBaseline = 'middle';
    text(`LOOT  ${formatMoney(state.lootValue)}`, 18, 23, 19, COLOURS.gold, 'left', 700);
    text(`BAG ${state.lootCount}`, 218, 23, 16, COLOURS.muted, 'left', 700);
    drawAlarmMeter(state);
    const objective = state.hasDiamond ? 'Diamond secured — reach the EXIT!' : 'Steal the Star Diamond';
    text(objective, FIELD.width - 170, 23, 16, state.hasDiamond ? '#4ade80' : COLOURS.text, 'right', 600);
    text(formatTime(state.elapsed), FIELD.width - 18, 23, 17, COLOURS.muted, 'right', 700);
  }

  function drawControlsHint() {
    context.textBaseline = 'alphabetic';
    text(
      'WASD / arrows move · mouse aims · click throws a coin · Shift sneaks · P pauses',
      FIELD.width / 2,
      FIELD.height - 22,
      15,
      'rgba(238, 241, 245, 0.5)',
      'center',
    );
  }

  function drawPanel(title, titleColour, lines, prompt) {
    const width = 640;
    const height = 118 + lines.length * 30 + 62;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2 - 20;
    context.fillStyle = COLOURS.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = COLOURS.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 66, 46, titleColour, 'center', 800);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 112 + i * 30, 19, COLOURS.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 24, 20, COLOURS.gold, 'center', 700);
  }

  /** Paint one frame: the room and everyone in it, the HUD, then the screen's own panel. */
  function draw(state, screen, info) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = COLOURS.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    drawFloor();
    drawExit(state);
    for (const item of state.loot) if (!item.taken) drawLootItem(item, state.elapsed);
    drawNoise(state);
    drawCones(state);
    drawWalls();
    for (const camera of state.cameras) drawCamera(camera, state.elapsed);
    for (const guard of state.guards) drawGuard(guard);
    drawThief(state);
    drawHud(state);

    if (screen === SCREEN_PLAY) {
      drawControlsHint();
    } else if (screen === SCREEN_TITLE) {
      drawPanel('VAULTFALL', COLOURS.text, [
        'One thief. One diamond. Three guards, two cameras, one alarm.',
        'Cross the museum, lift the Star Diamond from the vault,',
        'and slip out the exit before the alarm meter fills.',
        `Best haul so far: ${formatMoney(info.best)}`,
      ], 'Press Space or click to start the heist');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', COLOURS.text, ['The night watch waits for no one. Well — just this once.'], 'Press P to keep sneaking');
    } else if (screen === SCREEN_WIN) {
      drawPanel('CLEAN GETAWAY', '#4ade80', [
        `Loot carried out: ${formatMoney(state.lootValue)} in ${state.lootCount} pieces`,
        `Time inside: ${formatTime(state.elapsed)} · Alarm at escape: ${Math.floor(state.alarm)}%`,
        `Score: ${formatMoney(info.score)} · Best: ${formatMoney(info.best)}`,
      ], 'Press Space or click to rob it again');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel('CAUGHT!', '#ef4444', [
        info.reason,
        `You still had ${formatMoney(state.lootValue)} in the bag. It stays in the museum.`,
        `Best haul so far: ${formatMoney(info.best)}`,
      ], 'Press Space or click to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toWorld };
}

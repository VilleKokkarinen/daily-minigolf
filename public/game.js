import { TILE_SIZE, WIDTH, HEIGHT, MAX_POWER, WALL_BOUNCE_POWER, BALL_R, FRICTION, STOP, HOLE_R, frictionModifiers, HILL_ACCELERATION, todayStr} from './config.js';
import { updateStrokesText, updateTimeText, updateAimIcon} from './ui.js';
import { submitScore } from './supabase.js';
import { computePower } from "./physics.js";
import { playAudio } from './audio.js';
import { importLevel } from './level.js';

export let ball = { x: 0, y: 0, vx: 0, vy: 0 };
export let spawn = { x: 0, y: 0 };
export let hole = { x: 0, y: 0 };
export let aiming = false;
export let aimMode = 0; // 0: normal, 1: 90 degrees, 2: -90 degrees, 3: 180 degrees
export let strokes = 0;
export let muted = false;
export let finalTime = null;
export let previousLocation = { x: 0, y: 0 };
export let startedAt = null;

export let walls = [];
export let floors = [];  

function addWall(x, y, w, h, material) {
  walls.push({ x, y, w, h, material });
}

function addFloor(x, y, w, h, material) {
  floors.push({ x, y, w, h, material });
}

export function muteSwitch(state) {
  muted = state;
}

export function setAiming(state) {
  aiming = state;
}

export function setAimMode(mode) {
  aimMode = mode;
  updateAimIcon();
}

export function addStroke() {
  strokes++;
}

export function setStartedAt(time) {
  startedAt = time;
}

function alignHoleAndBall(hole, ball) { // Align hole and ball to the center of their respective tiles
  hole.x += HOLE_R;
  hole.y += HOLE_R;
  ball.x += BALL_R;
  ball.y += BALL_R;
}

export function resetGame(){
  importLevel();
}

export function resetGameParams() {
  finalTime = null;
  setAiming(false);
  strokes = 0;
  startedAt = null;
  updateStrokesText();
  updateTimeText(0);

  if(spawn != null)
    ball = { x: spawn.x, y: spawn.y, vx: 0, vy: 0 };
}

export function hitBall(dx, dy){
  const {power, pct} = computePower(dx, dy);

  if (power === 0) { // cancel shot
    setAiming(false);
    setAimMode(0)
    return;
  }

  if (!startedAt)
    setStartedAt(performance.now());

  playAudio('hit');

  previousLocation.x = ball.x;
  previousLocation.y = ball.y;

  const a = Math.atan2(dy, dx);
  ball.vx = Math.cos(a) * power;
  ball.vy = Math.sin(a) * power;

  setAiming(false);
  setAimMode(0)
  addStroke();
  updateStrokesText();
}

export function initializeGame(s, h, f, w){
  ball.x = s.x;
  ball.y = s.y;
  ball.vx = 0;
  ball.vy = 0;

  spawn = s;
  hole = h;

  alignHoleAndBall(hole, ball);

  setAiming(false);
  strokes = 0;
  startedAt = null;
  finalTime = null;

  setAimMode(0);

  f.forEach(o => {
    addFloor(o.x, o.y, o.w, o.h, o.material);
  });

  w.forEach(o => {
    addWall(o.x, o.y, o.w, o.h, o.material);
  });
}


export function getMaterialAt(x, y) {   
  // Check floors
  for (const f of floors) {
    if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) {
    return f.material;
    }
  }
  return null;
}

function stopBall(){
  ball.vx = 0;
  ball.vy = 0;
}

function resetIllegalMove() {
  ball.x = previousLocation.x;
  ball.y = previousLocation.y;
  ball.vx = ball.vy = 0;
  playAudio('illegal');
}

function HazardCheck() {
  if (getMaterialAt(ball.x, ball.y) === "water") {
    resetIllegalMove();
    return true;
  }

  if(ball.x < 0 || ball.x > WIDTH || ball.y < 0 || ball.y > HEIGHT) {
    resetIllegalMove();
    return true;
  }

  return false;
}

function getFrictionValue(modifier) {
  if(modifier == null)
    return FRICTION; // default friction if no modifier

  return FRICTION + modifier;
}

function applyFrictionForce(currentMaterial, dt) {
  const base = getFrictionValue(frictionModifiers[currentMaterial] ?? null); 
  const frictionCoefficient = -Math.log(base); 
  // e.g. base=0.98 → coefficient≈0.0202

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > 0) {
    const decel = frictionCoefficient * speed; // proportional to velocity
    const fx = (ball.vx / speed) * decel;
    const fy = (ball.vy / speed) * decel;

    ball.vx -= fx * dt;
    ball.vy -= fy * dt;
  }
}

function applyHillAcceleration(currentMaterial, dt) {
  if (currentMaterial && currentMaterial.startsWith('hill_')) {
    const hillDirection = currentMaterial.split('_')[1]; // 'n', 'ne', 'e', etc.

    // Angle in radians: 0 = right (east), π/2 = down (south)
    const angleMap = {
      n: -Math.PI / 2,      // up
      ne: -Math.PI / 4,     // up-right
      e: 0,                 // right
      se: Math.PI / 4,      // down-right
      s: Math.PI / 2,       // down
      sw: 3 * Math.PI / 4,  // down-left
      w: Math.PI,           // left
      nw: -3 * Math.PI / 4  // up-left
    };

    const angle = angleMap[hillDirection];
    const ax = Math.cos(angle) * HILL_ACCELERATION;
    const ay = Math.sin(angle) * HILL_ACCELERATION;

    // acceleration applied over time
    ball.vx += ax * dt;
    ball.vy += ay * dt;
  }
}

export function update(dt) {
  if (finalTime != null) return;

  if (HazardCheck()) {
    return;
  }

  updateBall(ball, dt, walls); // check wall collisions

  const currentMaterial = getMaterialAt(ball.x, ball.y);

  applyHillAcceleration(currentMaterial, dt);

  applyFrictionForce(currentMaterial, dt);

  // Stop ball if below velocity threshold
  if (Math.abs(ball.vx) + Math.abs(ball.vy) < STOP) {
    stopBall();
  }

  // Hole check
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  if (Math.hypot(dx, dy) < HOLE_R - 1 && Math.hypot(ball.vx, ball.vy) < 1.2 && strokes > 0) {
    ball.vx = ball.vy = 0;
    ball.x = hole.x;
    ball.y = hole.y;
    finalTime = (performance.now() - startedAt) / 1000;
    sendScore();
  }
}

function updateBall(ball, dt, walls) {
  // Compute speed and decide number of substeps
  const speed = Math.hypot(ball.vx, ball.vy);
  let steps = Math.ceil((speed * dt) / BALL_R);
  steps = Math.max(1, steps); // At least one step
  const stepDt = dt / steps;

  for (let i = 0; i < steps; i++) {
    moveBallStep(ball, stepDt, walls);
  }
}

function canPassThrough(wall, vx, vy) {
  if (!wall.material.startsWith('wall_')) return false;

  switch (wall.material) {
    case 'wall_n': return vy <= 0;   // can only pass south → north (vy < 0)
    case 'wall_s': return vy >= 0;   // north → south (vy > 0)
    case 'wall_e': return vx >= 0;   // west → east (vx > 0)
    case 'wall_w': return vx <= 0;   // east → west (vx < 0)
    default: return false;
  }
}

function reflect(vx, vy, nx, ny) {
  // Normalize the normal
  const len = Math.hypot(nx, ny);
  if (len === 0) return { vx, vy };
  nx /= len; ny /= len;

  // Reflect: v' = v - 2*(v·n)*n
  const dot = vx * nx + vy * ny;
  return {
    vx: vx - 2 * dot * nx,
    vy: vy - 2 * dot * ny
  };
}

function collideCircleTile(ball, wall, newX, newY) {
  const cx = wall.x + wall.w / 2;
  const cy = wall.y + wall.h / 2;
  const r = wall.w / 2;

  let vx = ball.vx;
  let vy = ball.vy;

  const dx = newX - cx;
  const dy = newY - cy;
  const dist = Math.hypot(dx, dy);

  let collision = false;

  if (dist < r + BALL_R) {    
    // push ball out
    const overlap = (r + BALL_R) - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    newX += nx * overlap;
    newY += ny * overlap;

    // reflect
    const newVel = reflect(vx, vy, nx, ny);
    vx = newVel.vx;
    vy = newVel.vy;

    collision = true;
  }

  return { newX, newY, vx, vy, collision, wall };
}

function collideLargeCircleTile(ball, wall, orientation, newX, newY) {

  // Tile contains one quarter of a circle

  const s = wall.w; // TILE_SIZE
  const r = s;
  let cx, cy;
  if (orientation === "br") {
    cx = wall.x + s;
    cy = wall.y + s;
  }
  else if (orientation === "bl") {
    cx = wall.x;
    cy = wall.y + s;
  }
  else if (orientation === "tl") {
    cx = wall.x;
    cy = wall.y;
  }
  else if (orientation === "tr") {
    cx = wall.x + s;
    cy = wall.y;
  }
  const dx = newX - cx;
  const dy = newY - cy;
  const dist = Math.hypot(dx, dy);
  let vx = ball.vx;
  let vy = ball.vy;
  let collision = false;

  if (dist < r + BALL_R) {
    // Ensure it's the correct quarter (not full circle)

    let valid = false;
    if (orientation === "br" && dx >= 0 && dy >= 0) valid = true;
    if (orientation === "bl" && dx <= 0 && dy >= 0) valid = true;
    if (orientation === "tl" && dx <= 0 && dy <= 0) valid = true;
    if (orientation === "tr" && dx >= 0 && dy <= 0) valid = true;

    if (valid) {
      const overlap = (r + BALL_R) - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      newX += nx * overlap;
      newY += ny * overlap;
      const newVel = reflect(vx, vy, nx, ny);
      vx = newVel.vx;
      vy = newVel.vy;
      collision = true;
    }
  }
  return { newX, newY, vx, vy, collision, wall };
}

function collideRectTile(ball, wall, newX, newY) {
  const cx = wall.x + wall.w / 2;
  const cy = wall.y + wall.h / 2;
  const r = wall.w / 2;

  const verts = [
    {x: cx - r, y: cy - r}, // top-left
    {x: cx + r, y: cy - r}, // top-right
    {x: cx + r, y: cy + r}, // bottom-right
    {x: cx - r, y: cy + r}  // bottom-left
  ];

  let vx = ball.vx;
  let vy = ball.vy;

  let collision = false;

  const closest = closestPointOnPolygon(newX, newY, verts);
  const dx = newX - closest.x;
  const dy = newY - closest.y;
  const dist = Math.hypot(dx, dy);

  if (dist < BALL_R) {
    if (canPassThrough(wall, vx, vy)){ // if the wall is one-way
      return { newX, newY, vx, vy, collision, wall };
    }

    const overlap = BALL_R - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    newX += nx * overlap;
    newY += ny * overlap;

    const newVel = reflect(vx, vy, nx, ny);
    vx = newVel.vx;
    vy = newVel.vy;
    collision = true;

    if(wall.material === 'wall_sticky') {
      vx *= STOP;
      vy *= STOP;
    }
    else if(wall.material === 'wall_bouncy') {
      const speed = Math.hypot(vx, vy);
      if (speed > 0) { 
        const scale = WALL_BOUNCE_POWER / speed;  // scaling factor
        vx *= scale;
        vy *= scale;
      }
    }
  }

  return { newX, newY, vx, vy, collision, wall };
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: x1, y: y1 };

  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return { x: x1 + t * dx, y: y1 + t * dy };
}

function closestPointOnPolygon(px, py, verts) {
  let closest = null;
  let minDist2 = Infinity;

  for (let i = 0; i < verts.length; i++) {
    const v1 = verts[i];
    const v2 = verts[(i + 1) % verts.length]; // loop around
    const p = closestPointOnSegment(px, py, v1.x, v1.y, v2.x, v2.y);

    const dx = px - p.x;
    const dy = py - p.y;
    const dist2 = dx * dx + dy * dy;

    if (dist2 < minDist2) {
      minDist2 = dist2;
      closest = p;
    }
  }
  return closest;
}

function collideTriangleTile(ball, wall, orientation, newX, newY) {
  const x = wall.x;
  const y = wall.y;
  const s = wall.w; // tile size

  let verts;
  if (orientation === "tl") {
    verts = [ {x, y}, {x: x+s, y}, {x, y:y+s} ];
  } else if (orientation === "tr") {
    verts = [ {x:x+s, y}, {x:x+s, y:y+s}, {x, y:y+s} ];
  } else if (orientation === "bl") {
    verts =  [ {x, y}, {x:x+s, y:y+s}, {x, y:y+s} ];
  } else if (orientation === "br") {
    verts =  [ {x:x+s, y}, {x:x+s, y:y+s}, {x, y:y+s} ];
  }

  if(verts == undefined) return { newX, newY, vx: ball.vx, vy: ball.vy, collision: false, wall };

  let vx = ball.vx;
  let vy = ball.vy;
  let collision = false;
  const closest = closestPointOnPolygon(newX, newY, verts);
  const dx = newX - closest.x;
  const dy = newY - closest.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < BALL_R) {
    const overlap = BALL_R - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    newX += nx * overlap;
    newY += ny * overlap;
    const newVel = reflect(vx, vy, nx, ny);
    vx = newVel.vx;
    vy = newVel.vy;
    collision = true;
  }

  return { newX, newY, vx, vy, collision, wall };
}

function collideDiamondTile(ball, wall, newX, newY) {
  const cx = wall.x + wall.w / 2;
  const cy = wall.y + wall.h / 2;
  const r = wall.w / 2;

  const verts = [
    {x: cx, y: cy - r}, // top
    {x: cx + r, y: cy}, // right
    {x: cx, y: cy + r}, // bottom
    {x: cx - r, y: cy}  // left
  ];

  let vx = ball.vx;
  let vy = ball.vy;

  let collision = false;

  const closest = closestPointOnPolygon(newX, newY, verts);
  const dx = newX - closest.x;
  const dy = newY - closest.y;
  const dist = Math.hypot(dx, dy);

  if (dist < BALL_R) {
    const overlap = BALL_R - dist;
    const nx = dx / dist;
    const ny = dy / dist;

    newX += nx * overlap;
    newY += ny * overlap;

    const newVel = reflect(vx, vy, nx, ny);
    vx = newVel.vx;
    vy = newVel.vy;
    collision = true;
  }

  return { newX, newY, vx, vy, collision, wall };
}

function collideHalfRectTile(ball, wall, newX, newY, orientation) {
  let rect;
  if (orientation === "s") {
    rect = { x: wall.x, y: wall.y, w: TILE_SIZE, h: TILE_SIZE/2, material: wall.material };
  } else if (orientation === "n") {
    rect = { x: wall.x, y: wall.y + TILE_SIZE/2, w: TILE_SIZE, h: TILE_SIZE/2, material: wall.material };
  } else if (orientation === "e") {
    rect = { x: wall.x, y: wall.y, w: TILE_SIZE/2, h: TILE_SIZE, material: wall.material };
  } else if (orientation === "w") {
    rect = { x: wall.x + TILE_SIZE/2, y: wall.y, w: TILE_SIZE/2, h: TILE_SIZE, material: wall.material };
  }
  return collideRectTile(ball, rect, newX, newY);
}

function collideQuarterRectTile(ball, wall, newX, newY, orientation) {
  let rect;
  if (orientation === "tl") {
    rect = { x: wall.x, y: wall.y, w: TILE_SIZE/2, h: TILE_SIZE/2, material: wall.material };
  } else if (orientation === "tr") {
    rect = { x: wall.x + TILE_SIZE/2, y: wall.y, w: TILE_SIZE/2, h: TILE_SIZE/2, material: wall.material };
  } else if (orientation === "bl") {
    rect = { x: wall.x, y: wall.y + TILE_SIZE/2, w: TILE_SIZE/2, h: TILE_SIZE/2, material: wall.material };
  } else if (orientation === "br") {
    rect = { x: wall.x + TILE_SIZE/2, y: wall.y + TILE_SIZE/2, w: TILE_SIZE/2, h: TILE_SIZE/2, material: wall.material };
  }
  return collideRectTile(ball, rect, newX, newY);
}

function collideHalfTriangleTile(ball, wall, orientation, newX, newY) {
  const x = wall.x;
  const y = wall.y;
  const s = wall.w;

  const tip = Math.ceil(s/2)+1;

  let verts;
  if (orientation === "e") {
    verts = [ {x, y}, {x:x+tip, y:y+s/2}, {x, y:y+s} ];
  } else if (orientation === "w") {
    verts = [ {x:x+s, y}, {x:x+s-tip, y:y+s/2}, {x:x+s, y:y+s} ];
  } else if (orientation === "s") {
    verts = [ {x, y}, {x:x+s/2, y:y+tip}, {x:x+s, y} ];
  } else if (orientation === "n") {
    verts = [ {x, y:y+s}, {x:x+s/2, y:y+s-tip}, {x:x+s, y:y+s} ];
  }

  const closest = closestPointOnPolygon(newX, newY, verts);
  const dx = newX - closest.x;
  const dy = newY - closest.y;
  const dist = Math.hypot(dx, dy);
  let vx = ball.vx;
  let vy = ball.vy;
  let collision = false;

  if (dist < BALL_R) {
    const overlap = BALL_R - dist;
    const nx = dx / dist;
    const ny = dy / dist;
    newX += nx * overlap;
    newY += ny * overlap;
    const newVel = reflect(vx, vy, nx, ny);
    vx = newVel.vx;
    vy = newVel.vy;
    collision = true;
  }
  return { newX, newY, vx, vy, collision, wall };
}

function collideRoundedEndTile(ball, wall, orientation, newX, newY) {
  // this tile is made up of 2 parts. a square at bottom sized at 2/3 of TILE_SIZE.
  // and a circle at the end with diameter TILE_SIZE.

  let rect, circle;
  if (orientation === "n") { // pointing up
    rect = { x: wall.x, y: wall.y + TILE_SIZE/3, w: TILE_SIZE, h: TILE_SIZE*2/3, material: wall.material };
    circle = { 
      x: wall.x, 
      y: wall.y - TILE_SIZE/2 + TILE_SIZE/3 + 1, // nudged down 1px
      w: TILE_SIZE, h: TILE_SIZE, material: wall.material 
    };
  } else if (orientation === "s") { // pointing down
    rect = { x: wall.x, y: wall.y, w: TILE_SIZE, h: TILE_SIZE*2/3, material: wall.material };
    circle = { 
      x: wall.x, 
      y: wall.y + TILE_SIZE*2/3 - TILE_SIZE/2 - 1, // nudged up 1px
      w: TILE_SIZE, h: TILE_SIZE, material: wall.material 
    };
  } else if (orientation === "e") { // pointing right
    rect = { x: wall.x, y: wall.y, w: TILE_SIZE*2/3, h: TILE_SIZE, material: wall.material };
    circle = { 
      x: wall.x + TILE_SIZE*2/3 - TILE_SIZE/2 - 1, // nudged left 1px
      y: wall.y, 
      w: TILE_SIZE, h: TILE_SIZE, material: wall.material 
    };
  } else if (orientation === "w") { // pointing left
    rect = { x: wall.x + TILE_SIZE/3, y: wall.y, w: TILE_SIZE*2/3, h: TILE_SIZE, material: wall.material };
    circle = { 
      x: wall.x + TILE_SIZE/3 - TILE_SIZE/2 + 1, // nudged right 1px
      y: wall.y, 
      w: TILE_SIZE, h: TILE_SIZE, material: wall.material 
    };
  }

  let res = collideRectTile(ball, rect, newX, newY);
  if (res.collision === true) return res;
  return collideCircleTile(ball, circle, newX, newY);  
}

const rectangleWalls = new Set([
  "wall", "wall_n", "wall_e", "wall_s", "wall_w",
  "wall_sticky", "wall_bouncy"
]);

const halfWalls = new Set([
  "wall_half_n", "wall_half_e", "wall_half_s", "wall_half_w"
]);

const quarterWalls = new Set([
  "wall_quarter_br", "wall_quarter_bl", "wall_quarter_tl", "wall_quarter_tr"
]);

const triangleWalls = new Set([
  "wall_triangle_br", "wall_triangle_bl", "wall_triangle_tl", "wall_triangle_tr"
]);

const halfTriangleWalls = new Set([
  "wall_small_triangle_n", "wall_small_triangle_e", "wall_small_triangle_s", "wall_small_triangle_w"
]);

const largeCircleWalls = new Set([
  "wall_large_circle_br", "wall_large_circle_bl", "wall_large_circle_tl", "wall_large_circle_tr"
]);

const roundedEndWalls = new Set([
  "wall_rounded_n", "wall_rounded_e", "wall_rounded_s", "wall_rounded_w"
]);

function moveBallStep(ball, dt, walls) {
  let newX = ball.x + ball.vx * dt;
  let newY = ball.y + ball.vy * dt;

  let collisions = [];

   for (let wall of walls) {

    const mat = wall.material;
    
    if(rectangleWalls.has(mat)) {
      const res = collideRectTile(ball, wall, newX, newY);
      if(res.collision === true) collisions.push(res);
      continue;
    }

    if(halfWalls.has(mat)) {
      const orientation = mat.split('_')[2]; // n, e, s, w
      const res = collideHalfRectTile(ball, wall, newX, newY, orientation);
      if(res.collision === true) collisions.push(res);
       continue;
    }

    if(quarterWalls.has(mat)) {
      const orientation = mat.split('_')[2]; // br, bl, tl, tr
      const res = collideQuarterRectTile(ball, wall, newX, newY, orientation);
      if(res.collision === true) collisions.push(res);
       continue;
    }

    if(mat === 'wall_circle') {
      const res = collideCircleTile(ball, wall, newX, newY);
      if(res.collision === true) collisions.push(res);
      continue;
    }

    if(mat === 'wall_circle_half') {
      const smallCircle = { x: wall.x + TILE_SIZE/4, y: wall.y + TILE_SIZE/4, w: (TILE_SIZE/2)+1, h: (TILE_SIZE/2)+1, material: wall.material };
      const res = collideCircleTile(ball, smallCircle, newX, newY);
      if(res.collision === true) collisions.push(res);
      continue;
    }

    if(largeCircleWalls.has(mat)) {
      const orientation = mat.split('_')[3]; // br, bl, tl, tr
      const res = collideLargeCircleTile(ball, wall, orientation, newX, newY);
      if(res.collision === true) collisions.push(res);
      continue;
    }

    if(mat === 'wall_diamond') {
      const res = collideDiamondTile(ball, wall, newX, newY);
      if(res.collision === true) collisions.push(res);
      continue;
    }

    if(triangleWalls.has(mat)) {
      const orientation = mat.split('_')[2]; // br, bl, tl, tr
      const res = collideTriangleTile(ball, wall, orientation, newX, newY);
      if(res.collision === true) collisions.push(res);
        continue;
    }

    if(halfTriangleWalls.has(mat)) {
      const orientation = mat.split('_')[3]; // n, e, s, w
      const res = collideHalfTriangleTile(ball, wall, orientation, newX, newY);
      if(res.collision === true) collisions.push(res);
        continue;
    }

    if(roundedEndWalls.has(mat)) {
      const orientation = mat.split('_')[2]; // n, e, s, w
       const res = collideRoundedEndTile(ball, wall, orientation, newX, newY);
      if(res.collision === true) collisions.push(res);
        continue;
    }
  }

  // --- If multiple collisions, pick the one closest to tile center ---

  var closestTileCenterCollision = null;
  let minDist2 = Infinity;
  for(const c of collisions) {
    const dx = c.wall.x + c.wall.w/2 - ball.x;
    const dy = c.wall.y + c.wall.h/2 - ball.y;
    const dist2 = dx*dx + dy*dy;
    if(dist2 < minDist2) {
      minDist2 = dist2;
      closestTileCenterCollision = c;
    }
  }

  if(closestTileCenterCollision != undefined && closestTileCenterCollision.collision === true){
    newX = closestTileCenterCollision.newX;
    newY = closestTileCenterCollision.newY;
    ball.vx = closestTileCenterCollision.vx;
    ball.vy = closestTileCenterCollision.vy;
  } 

  ball.x = newX;
  ball.y = newY;

  // --- Clamp speed to MAX_POWER ---
  if(ball.vx > MAX_POWER) ball.vx = MAX_POWER;
  if(ball.vx < -MAX_POWER) ball.vx = -MAX_POWER;
  if(ball.vy > MAX_POWER) ball.vy = MAX_POWER;
  if(ball.vy < -MAX_POWER) ball.vy = -MAX_POWER;
}

function sendScore(){
  const player_name=(document.getElementById('name').value||'anon').slice(0,12);
  const time_ms = Math.round((performance.now()-startedAt)||0);
  const time = Math.round(time_ms / 1000 * 10) / 10; // round to 1 decimal place
  const score = Number(strokes);
  const level = todayStr;
  const timestamp = new Date().toISOString();

  submitScore(player_name, time, score, level, timestamp)
}
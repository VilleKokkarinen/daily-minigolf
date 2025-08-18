import { WIDTH, HEIGHT, MAX_POWER, WALL_BOUNCE_POWER, BALL_R, FRICTION, STOP, HOLE_R, frictionModifiers, HILL_ACCELERATION, todayStr} from './config.js';
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

export function initializeGame(s, h, obstacles){
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

  walls = [];
  floors = [];

  obstacles.forEach(o => {
    if (o.material.includes('wall') && o.material !== 'wall_passable') {
      addWall(o.x, o.y, o.w, o.h, o.material);
    } else {
      addFloor(o.x, o.y, o.w, o.h, o.material);
    }
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
  
export function reflectVelocity(vel, normal) {
  // normalize normal
  let nLen = Math.hypot(normal.x, normal.y);
  let nx = normal.x / nLen, ny = normal.y / nLen;

  // dot product
  let dot = vel.x * nx + vel.y * ny;

  return {
    x: vel.x - 2 * dot * nx,
    y: vel.y - 2 * dot * ny
  };
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

  
/*
let friction = getFrictionValue(frictionModifiers[currentMaterial]);
  if(currentMaterial != null && currentMaterial.startsWith('hill_'))
    friction = 0.989; // no friction on hills

  ball.vx *= friction;
  ball.vy *= friction;
  */

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

function moveBallStep(ball, dt, walls) {
  let newX = ball.x + ball.vx * dt;
  let newY = ball.y + ball.vy * dt;

  let touchedBouncyWall = false;

  for (let wall of walls) {
    if(wall.material !== 'wall_bouncy') continue;

    const left   = wall.x - BALL_R;
    const right  = wall.x + wall.w + BALL_R;
    const top    = wall.y - BALL_R;
    const bottom = wall.y + wall.h + BALL_R;

    if (ball.y > top && ball.y < bottom && newX > left && newX < right) {
      touchedBouncyWall = true;
      break;
    }else if (ball.x > left && ball.x < right && newY > top && newY < bottom) {
      touchedBouncyWall = true;
      break;
    }
  }

  for (let wall of walls) {
    const left   = wall.x - BALL_R;
    const right  = wall.x + wall.w + BALL_R;
    const top    = wall.y - BALL_R;
    const bottom = wall.y + wall.h + BALL_R;

    // Y overlap → possible X collision
    if (ball.y > top && ball.y < bottom && newX > left && newX < right) {
      if (canPassThrough(wall, ball.vx, 0)) continue;

      if (ball.vx > 0) newX = left;
      else if (ball.vx < 0) newX = right;

      ball.vx *= -1; // normal reflection for X
    }
  }
  ball.x = newX;

  // --- Move in Y ---
  
  for (let wall of walls) {
    const left   = wall.x - BALL_R;
    const right  = wall.x + wall.w + BALL_R;
    const top    = wall.y - BALL_R;
    const bottom = wall.y + wall.h + BALL_R;

    // X overlap → possible Y collision
    if (ball.x > left && ball.x < right && newY > top && newY < bottom) {
      if (canPassThrough(wall, 0, ball.vy)) continue;

      if (ball.vy > 0) newY = top;
      else if (ball.vy < 0) newY = bottom;

      ball.vy *= -1; // normal reflection for Y
    }
  }
  ball.y = newY;

  // --- Apply bouncy wall speed boost ---
  if (touchedBouncyWall === true) {
    const speed = Math.hypot(ball.vx, ball.vy); // current total speed
    if (speed > 0) { 
      const scale = WALL_BOUNCE_POWER / speed;  // scaling factor
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }

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
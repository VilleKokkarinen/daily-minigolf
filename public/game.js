// game.js

import { BALL_R, FRICTION, STOP, HOLE_R, frictionModifiers, todayStr} from './config.js';
import { updateStrokesText, updateTimeText, updateAimIcon} from './ui.js';
import { submitScore } from './supabase.js';
import { computePower } from "./physics.js";
import { playAudio } from './audio.js';

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
  ball = { x: spawn.x, y: spawn.y, vx: 0, vy: 0 };
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

  aiming = false;
  strokes = 0;
  startedAt = null;
  finalTime = null;

  walls = [];
  floors = [];

  obstacles.forEach(o => {
    if (o.material === 'wall') {
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

export function update(dt) {
  if (finalTime != null) return;

  // Water hazard check
  if (getMaterialAt(ball.x, ball.y) === "water") {
    ball.x = previousLocation.x;
    ball.y = previousLocation.y;
    ball.vx = ball.vy = 0;
    playAudio('illegal');
    return;
  }

  updateBall(ball, dt, walls);

  // Apply friction
  const currentMaterial = getMaterialAt(ball.x, ball.y);
  let friction = frictionModifiers[currentMaterial] || FRICTION;

  ball.vx *= friction;
  ball.vy *= friction;

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

function sendScore(){
  const player_name=(document.getElementById('name').value||'anon').slice(0,12);
  const time_ms = Math.round((performance.now()-startedAt)||0);
  const time = Math.round(time_ms / 1000 * 10) / 10; // round to 1 decimal place
  const score = Number(strokes);
  const level = todayStr;
  const timestamp = new Date().toISOString();

  submitScore(player_name, time, score, level, timestamp)
}

export function updateBall(ball, dt, blocks) {
  // Compute speed and decide number of substeps
  const speed = Math.hypot(ball.vx, ball.vy);
  let steps = Math.ceil((speed * dt) / BALL_R);
  steps = Math.max(1, steps); // At least one step
  const stepDt = dt / steps;

  for (let i = 0; i < steps; i++) {
    moveBallStep(ball, stepDt, blocks);
  }
}

export function moveBallStep(ball, dt, blocks) {
  // --- Move in X direction ---
  let newX = ball.x + ball.vx * dt;

  for (let block of blocks) {
    const left   = block.x - BALL_R;
    const right  = block.x + block.w + BALL_R;
    const top    = block.y - BALL_R;
    const bottom = block.y + block.h + BALL_R;

    // Check if Y is overlapping → only vertical collision possible
    if (ball.y > top && ball.y < bottom && newX > left && newX < right) {
      if (ball.vx > 0) newX = left;       // hitting left wall
      else if (ball.vx < 0) newX = right; // hitting right wall
      ball.vx *= -1;                       // reflect X velocity
    }
  }
  ball.x = newX;

  // --- Move in Y direction ---
  let newY = ball.y + ball.vy * dt;

  for (let block of blocks) {
    const left   = block.x - BALL_R;
    const right  = block.x + block.w + BALL_R;
    const top    = block.y - BALL_R;
    const bottom = block.y + block.h + BALL_R;

    // Check if X is overlapping → only horizontal collision possible
    if (ball.x > left && ball.x < right && newY > top && newY < bottom) {
      if (ball.vy > 0) newY = top;        // hitting top wall
      else if (ball.vy < 0) newY = bottom; // hitting bottom wall
      ball.vy *= -1;                        // reflect Y velocity
    }
  }
  ball.y = newY;
}
import { HOLE_R, BALL_R, TILE_SIZE, WALL_TILE_MATERIALS } from './config.js';
import { resetGameParams } from './game.js';
import { getAsset } from './assets.js';
import { muteSwitch } from './game.js';
import { getLeaderboard } from './supabase.js';
import { FLOOR_TILE_PATTERNS, WALL_TILE_PATTERNS } from './assets.js';
import { mouse } from './input.js';
import { walls, floors, hole, ball, aiming, aimMode, strokes, setAimMode, spawn } from './game.js';
import { computePower } from './physics.js';

export const canvas = document.getElementById('g');
export const ctx = canvas.getContext('2d');

export const strokesEl = document.getElementById('strokes');
export const timeEl = document.getElementById('time');
export const dateEl = document.getElementById('date');
export const levelNameEl =  document.getElementById('levelname');
export const resetEl = document.getElementById('reset');

export const muteCheckbox = document.getElementById("mute");
export const muteIcon = document.getElementById("mute-icon");

export const AimModeIcon = document.getElementById("aim-icon");

export const statusEl = document.getElementById('status');
export const rowsEl = document.getElementById('rows');

export const playerNameEl = document.getElementById('name');

muteIcon.src = getAsset("audio.png");

muteCheckbox.addEventListener("change", () => {
  if (muteCheckbox.checked) {
    muteIcon.src = getAsset("mute.png");
    muteIcon.alt = "Muted";
    muteSwitch(true);
  } else {
    muteIcon.src = getAsset("audio.png");
    muteIcon.alt = "Audio On";
    muteSwitch(false);
  }
});

AimModeIcon.addEventListener("click", () => {
  setAimMode((aimMode + 1) % 4);
})

resetEl.onclick = () => {
  resetGameParams();
};

export function updateAimIcon() {
  AimModeIcon.src = getAsset(`aim${aimMode}.png`);
}

export function updateStrokesText() {
  strokesEl.textContent = strokes;
}

export function updateTimeText(time) {
  timeEl.textContent = `${time.toFixed(1)}s`;
}

export function updateStatusText(text) {
  statusEl.textContent = text;
}

export function resetTimeAndStrokesText(){
  strokesEl.textContent='0';
  timeEl.textContent='0.0s';
}

export async function drawLeaderBoard(){ 
  try{
    updateStatusText('Loading leaderboard...');
    const data = await getLeaderboard();
    updateStatusText(`Top ${data.length||0}`);
    renderLeaderBoardRows(data);
  }catch(e){
    updateStatusText('(offline leaderboard)')
  }
}

function renderLeaderBoardRows(list){
  rowsEl.innerHTML='';
  (list||[]).forEach((s,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${escapeHtml(s.player_name)}</td><td>${s.score}</td><td>${(s.time).toFixed(1)}s</td>`;
    rowsEl.appendChild(tr);
  });
}

function escapeHtml(s){return (s+"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

export function draw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const f of floors) {
    ctx.fillStyle = FLOOR_TILE_PATTERNS[f.material] || '#ff00ff';
    ctx.fillRect(f.x, f.y, f.w, f.h);
  }

  for (const w of walls) {
    ctx.fillStyle = WALL_TILE_PATTERNS[w.material] || '#ff00ff';
    ctx.fillRect(w.x, w.y, w.w, w.h);
  }

  /*
  ctx.fillStyle = tilePatterns.grass || '#ff00ff';
  ctx.fillRect(spawn.x, spawn.y, TILE_SIZE, TILE_SIZE);
  ctx.fillRect(hole.x-TILE_SIZE/2, hole.y-TILE_SIZE/2, TILE_SIZE, TILE_SIZE); // adjusted position, as hole pos is centered
  */
 
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(hole.x,hole.y,HOLE_R+2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(hole.x,hole.y,HOLE_R,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2); ctx.fill();

  // aim line
  if (aiming) {
    let dx = mouse.x - ball.x;
    let dy = mouse.y - ball.y;
    if (aimMode === 1) [dx, dy] = [ -dy, dx ];
    else if (aimMode === 2) [dx, dy] = [ dy, -dx ];
    else if (aimMode === 3) { dx = -dx; dy = -dy; }
    
    ctx.strokeStyle = '#e7ecef';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + dx, ball.y + dy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Power meter
    const barW = 60, barH = 8;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(ball.x - barW/2, ball.y - BALL_R - 15, barW, barH);

    const { pct } = computePower(dx, dy);

    // Ensure a minimum visual indicator when > 0
    let visualPct = pct > 0 ? Math.max(0.1, pct) : 0;

    let r, g, b = 0;

    if (visualPct <= 0) {
      ctx.fillStyle = '#555'; // dim if zero
    } else if (visualPct <= 0.5) {
      // Green to Yellow
      const t = visualPct / 0.5;
      r = Math.floor(255 * t);
      g = 255;
    } else {
      // Yellow to Red
      const t = (visualPct - 0.5) / 0.5;
      r = 255;
      g = Math.floor(255 * (1 - t));
    }

    ctx.fillStyle = `rgb(${r},${g},${b})`;

    // Draw the power bar
    ctx.fillRect(
      ball.x - barW / 2,
      ball.y - BALL_R - 15,
      barW * visualPct,
      barH
    );
  }
}
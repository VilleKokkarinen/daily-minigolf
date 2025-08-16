import { ball, aiming, aimMode, finalTime, setAiming, setAimMode, hitBall } from './game.js';
import { canvas } from "./ui.js";

export let mouse = { x: 0, y: 0 };

function getPos(e){const r=canvas.getBoundingClientRect(); const p=(e.touches?e.touches[0]:e); return {x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height};}

export function initCanvasListeners(){
  canvas.addEventListener('contextmenu', e => {
      e.preventDefault(); // prevent context menu (right-click)
      setAimMode((aimMode + 1) % 4);
  });

  canvas.addEventListener('pointerdown', e => {
    if (finalTime) return;
    if (ball.vx || ball.vy) return;
    setAiming(true);
    const p = getPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });

  canvas.addEventListener('pointermove', e => {
    canvas.setPointerCapture(e.pointerId);
    const p = getPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });

  canvas.addEventListener('pointerup', e => {
    if (!aiming) return;
    let dx = mouse.x - ball.x;
    let dy = mouse.y - ball.y;

    // Rotate aim vector according to aimMode
    if (aimMode === 1) [ dx, dy ] = [ -dy, dx ];
    else if (aimMode === 2) [ dx, dy ] = [ dy, -dx ];
    else if (aimMode === 3) { dx = -dx; dy = -dy; }

    hitBall(dx, dy);
  });
}

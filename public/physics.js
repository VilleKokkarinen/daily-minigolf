import { TILE_SIZE, MAX_DRAG_PX, MAX_POWER } from './config.js';

export function computePower(dx, dy) {
    const dist = Math.hypot(dx, dy);
    if (dist <= TILE_SIZE) return { power: 0, pct: 0 };
    const adj = dist - TILE_SIZE;
    const pct = Math.min(1, adj / (MAX_DRAG_PX - TILE_SIZE));
    return { power: pct * MAX_POWER, pct };
}
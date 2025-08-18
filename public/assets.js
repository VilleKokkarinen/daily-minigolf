import { base_URL, TILE_MATERIALS, TILE_SIZE } from './config.js';
import { ctx } from './ui.js';

export function getAsset(name) {
  return `${base_URL}/assets/${name}`;
}

export const tileImages = {};
export const tilePatterns = {};

let matKeys = Object.keys(TILE_MATERIALS);

// discard 2 last materials which are spawn + hole
matKeys = matKeys.slice(0, -2);

const tilemap = new Image();
tilemap.src = getAsset('tilemap.png');

tilemap.onload = () => {
  const tileWidth = TILE_SIZE;
  const tileHeight = TILE_SIZE;

  matKeys.forEach((mat, i) => {
    const col = i % 4;  // 4 tiles per row
    const row = Math.floor(i / 4);

    const sx = col * (tileWidth);
    const sy = row * (tileHeight);

    // extract tile into offscreen canvas
    const off = document.createElement('canvas');
    off.width = tileWidth;
    off.height = tileHeight;
    const offCtx = off.getContext('2d');

    offCtx.drawImage(
      tilemap,
      sx, sy, tileWidth, tileHeight,  // source
      0, 0, tileWidth, tileHeight     // dest
    );

    // directly use the canvas as the pattern source
    tilePatterns[mat] = ctx.createPattern(off, 'repeat');
  });
};
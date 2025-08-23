import { base_URL, FLOOR_TILE_MATERIALS, WALL_TILE_MATERIALS, TILE_SIZE } from './config.js';
import { ctx } from './ui.js';

export function getAsset(name) {
  return `${base_URL}/assets/${name}`;
}

const FLOOR_TILE_NAMES = Object.keys(FLOOR_TILE_MATERIALS);
export const FLOOR_TILE_PATTERNS = {};

const WALL_TILE_NAMES = Object.keys(WALL_TILE_MATERIALS)
export const WALL_TILE_PATTERNS = {};

const FLOOR_TILEMAP = new Image();
FLOOR_TILEMAP.src = getAsset('floor-palette.png');

const WALL_TILEMAP = new Image();
WALL_TILEMAP.src = getAsset('wall-palette.png');

function tilemapOnLoad(tilemap, patterns, tiles) {
  const tileWidth = TILE_SIZE;
  const tileHeight = TILE_SIZE;

  tiles.forEach((mat, i) => {
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
    patterns[mat] = ctx.createPattern(off, 'repeat');
  });  
}

FLOOR_TILEMAP.onload = () => {
  tilemapOnLoad(FLOOR_TILEMAP, FLOOR_TILE_PATTERNS, FLOOR_TILE_NAMES);
}

WALL_TILEMAP.onload = () => {
tilemapOnLoad(WALL_TILEMAP, WALL_TILE_PATTERNS, WALL_TILE_NAMES);
}
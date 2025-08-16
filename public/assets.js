// assets.js
import { base_URL, TILE_MATERIALS } from './config.js';
import { ctx } from './ui.js';

export function getAsset(name) {
    return `${base_URL}/assets/${name}`;
}

export const tileImages = {};
export const tilePatterns = {};

let matKeys = Object.keys(TILE_MATERIALS);

// discard 2 last materials which are spawn + hole
matKeys = matKeys.slice(0, -2);

matKeys.forEach(mat => {
  const img = new Image();
  img.src = getAsset(`${mat}.png`);
  tileImages[mat] = img;
  img.onload = () => {
    tilePatterns[mat] = ctx.createPattern(tileImages[mat], 'repeat');      
  };
});

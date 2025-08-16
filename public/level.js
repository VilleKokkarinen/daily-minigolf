// level.js
import { GRID_W, GRID_H, TILE_MATERIALS, TILE_SIZE, todayStr, base_URL } from './config.js';
import { initializeGame } from './game.js';

let grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE_MATERIALS.empty));

export function decodeLevel(encoded) {
    let flat = [];
    for (let [val, count] of encoded) flat.push(...Array(count).fill(val));
    let idx = 0;
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            grid[y][x] = flat[idx++];
        }
    }
}

export async function loadLevel(levelName) {
    const res = await fetch(`${base_URL}/levels/${levelName}.json`);
    if (!res.ok) throw new Error("Level not found");
    return await res.json();
}

export function importLevel() {
    loadLevel(todayStr).then((data) => {
      decodeLevel(data.level);

      document.getElementById('levelname').textContent = data.name;

      const spawn = {x: 0, y: 0};
      const hole = {x: 0, y: 0};
      const obstacles = [];

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (grid[y][x] === TILE_MATERIALS.spawn) {
            spawn.x = x * TILE_SIZE;
            spawn.y = y * TILE_SIZE;
          } else if (grid[y][x] === TILE_MATERIALS.hole) {
            hole.x = x * TILE_SIZE;
            hole.y = y * TILE_SIZE;
          } else if (grid[y][x] !== TILE_MATERIALS.empty) {
            var material = Object.keys(TILE_MATERIALS).find(key => TILE_MATERIALS[key] === grid[y][x]);
            obstacles.push({ x: x*TILE_SIZE, y: y*TILE_SIZE, w:TILE_SIZE, h:TILE_SIZE, material: material });
          }
        }
      }

      initializeGame(spawn, hole, obstacles);

    }).catch(err => {
      console.error("Error loading level:", err);
    });
  }
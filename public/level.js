import { GRID_W, GRID_H, FLOOR_TILE_MATERIALS, WALL_TILE_MATERIALS, TILE_SIZE, todayStr } from './config.js';
import { initializeGame, resetGameParams } from './game.js';
import { getDailyLevelId, getDailyLevel } from './supabase.js';

let floorGrid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(FLOOR_TILE_MATERIALS.grass));
let wallGrid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(WALL_TILE_MATERIALS.wall_empty));

export function decodeFloor(encoded) {
  let flat = [];
  for (let [val, count] of encoded) flat.push(...Array(count).fill(val));
  let idx = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      floorGrid[y][x] = flat[idx++];
    }
  }
}
export function decodeWalls(encoded) {
  let flat = [];
  for (let [val, count] of encoded) flat.push(...Array(count).fill(val));
  let idx = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      wallGrid[y][x] = flat[idx++];
    }
  }
}

export async function loadLevel() {
  const level = await getDailyLevelId()
  if (!level) {
    throw new Error("No daily level found");
  }
  const leveldata = await getDailyLevel(level.level_id);
  if (!leveldata) {
    throw new Error("Daily level data not found");
  }
  leveldata.level = JSON.parse(leveldata.level);
  return leveldata;
}

export function importLevel() {
  resetGameParams();
  loadLevel().then((data) => {
      
    decodeFloor(data.level.floor);
    decodeWalls(data.level.walls);

    document.getElementById('levelname').textContent = data.name;

    const spawn = data.level.spawn
    const hole = data.level.hole
    const floor = [];
    const walls = [];

    spawn.x *= TILE_SIZE;
    spawn.y *= TILE_SIZE;

    hole.x *= TILE_SIZE;
    hole.y *= TILE_SIZE;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
          var floorMat = Object.keys(FLOOR_TILE_MATERIALS).find(key => FLOOR_TILE_MATERIALS[key] === floorGrid[y][x]);
          floor.push({ x: x*TILE_SIZE, y: y*TILE_SIZE, w:TILE_SIZE, h:TILE_SIZE, material: floorMat });

          var wallMat = Object.keys(WALL_TILE_MATERIALS).find(key => WALL_TILE_MATERIALS[key] === wallGrid[y][x]);
          if (wallMat !== 'wall_empty' && wallMat !== undefined) {
            walls.push({ x: x*TILE_SIZE, y: y*TILE_SIZE, w:TILE_SIZE, h:TILE_SIZE, material: wallMat });
          }
      }
    }
    initializeGame(spawn, hole, floor, walls);

  }).catch(err => {
    console.error("Error loading level:", err);
  });
}
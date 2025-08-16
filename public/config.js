export const TILE_SIZE = 16;
export const base_URL = "https://villekokkarinen.github.io";

export const SUPABASE_URL = 'https://unctnllexvziysrvjhvu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY3RubGxleHZ6aXlzcnZqaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU0MjEsImV4cCI6MjA3MDg1MTQyMX0.0CkYo3_kW48F1J4-oR95QryZXa28chiEcysWnJQB2qA';
export const GRID_W = 50;
export const GRID_H = 30;

export const WIDTH = GRID_W * TILE_SIZE;
export const HEIGHT = GRID_H * TILE_SIZE;
export const HOLE_R = TILE_SIZE / 2;
export const BALL_R = TILE_SIZE / 2;
export const FRICTION = 0.98;
export const STOP = 0.04;
export const MAX_POWER = TILE_SIZE;
export const MAX_DRAG_PX = TILE_SIZE * MAX_POWER;

export let todayStr = new Date().toISOString().slice(0,10);

export const TILE_MATERIALS = {
    grass: 0,
    stone: 1,
    sand: 2,
    mud: 3,
    water: 4,
    wall: 5,
    spawn: 6,
    hole: 7
};

export const frictionModifiers = {
    sand: 0.925,
    mud: 0.825,
    stone: 0.99
};
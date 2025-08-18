export const TILE_SIZE = 15;
export const GRID_W = 51;
export const GRID_H = 31;

export const base_URL = "https://villekokkarinen.github.io";

export const SUPABASE_URL = 'https://unctnllexvziysrvjhvu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY3RubGxleHZ6aXlzcnZqaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU0MjEsImV4cCI6MjA3MDg1MTQyMX0.0CkYo3_kW48F1J4-oR95QryZXa28chiEcysWnJQB2qA';

export const WIDTH = GRID_W * TILE_SIZE;
export const HEIGHT = GRID_H * TILE_SIZE;
export const HOLE_R = TILE_SIZE / 2;
export const BALL_R = TILE_SIZE / 2;
export const FRICTION = 0.97;
export const STOP = 0.04;
export const MAX_POWER = TILE_SIZE;
export const WALL_BOUNCE_POWER = MAX_POWER - 3;
export const MAX_DRAG_PX = TILE_SIZE * MAX_POWER;

export let todayStr = new Date().toISOString().slice(0,10);

export const TILE_MATERIALS = {
    grass: 0,
    dirt: 1,
    mud: 2,
    ice: 3,
    hill_n: 4,
    hill_ne: 5,
    hill_e: 6,
    hill_se: 7,
    hill_s: 8,
    hill_sw: 9,
    hill_w: 10,
    hill_nw: 11,
    water: 12,
    rough_grass: 13,
    grass_water: 14,
    grass_sand: 15,
    wall: 16,
    sand: 17,
    wall_bouncy: 18,
    wall_passable: 19,
    wall_n: 20,
    wall_e: 21,
    wall_s: 22,
    wall_w: 23,
    spawn: 24,
    hole: 25
};


// base friction is 0.98 for default grass.

export const frictionModifiers = {
    ice: 0.015,
    rough_grass: -0.02,
    grass_sand: -0.03,
    dirt: -0.04,
    sand: -0.05,
    grass_water: -0.08,
    mud: -0.15
};

export const HILL_ACCELERATION = 0.1; // amount of acceleration when rolling down a hill
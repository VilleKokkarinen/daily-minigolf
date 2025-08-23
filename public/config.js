export const TILE_SIZE = 15;
export const GRID_W = 53;
export const GRID_H = 35;

export const base_URL = "https://villekokkarinen.github.io";

export const SUPABASE_URL = 'https://unctnllexvziysrvjhvu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY3RubGxleHZ6aXlzcnZqaHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzU0MjEsImV4cCI6MjA3MDg1MTQyMX0.0CkYo3_kW48F1J4-oR95QryZXa28chiEcysWnJQB2qA';

export const WIDTH = GRID_W * TILE_SIZE;
export const HEIGHT = GRID_H * TILE_SIZE;
export const HOLE_R = (TILE_SIZE / 2)-1;
export const BALL_R = (TILE_SIZE / 2)-1;
export const FRICTION = 0.97;
export const STOP = 0.04;
export const MAX_POWER = TILE_SIZE;
export const WALL_BOUNCE_POWER = MAX_POWER - 3;
export const MAX_DRAG_PX = TILE_SIZE * MAX_POWER;

export let todayStr = new Date().toISOString().slice(0,10);

export const FLOOR_TILE_MATERIALS = {
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
    sand: 16
};

export const WALL_TILE_MATERIALS = {
    wall: 17,
    wall_passable: 18,
    wall_bouncy: 19,
    wall_sticky: 20,    
    wall_n: 21,
    wall_e: 22,
    wall_s: 23,
    wall_w: 24,
    wall_empty: 25,
    wall_circle: 26,
    wall_circle_half: 27,
    wall_diamond: 28,
    wall_triangle_br: 29,
    wall_triangle_bl: 30,
    wall_triangle_tl: 31,
    wall_triangle_tr: 32,
    wall_large_circle_br: 33,
    wall_large_circle_bl: 34,
    wall_large_circle_tl: 35,
    wall_large_circle_tr: 36,
    wall_rounded_n: 37,
    wall_rounded_e: 38,
    wall_rounded_s: 39,
    wall_rounded_w: 40,
    wall_small_triangle_n: 41,
    wall_small_triangle_e: 42,
    wall_small_triangle_s: 43,
    wall_small_triangle_w: 44,
    wall_half_n: 45,
    wall_half_e: 46,
    wall_half_s: 47,
    wall_half_w: 48,
    wall_quarter_br: 49,
    wall_quarter_bl: 50,
    wall_quarter_tl: 51,
    wall_quarter_tr: 52,
}

export const TILE_ROTATIONS = {
    tl: "tl",
    tr: "tr",
    bl: "bl",
    br: "br",
    n: "n",
    e: "e",
    s: "s",
    w: "w",
}



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
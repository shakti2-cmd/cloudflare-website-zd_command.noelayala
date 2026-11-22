/**
 * Zombie Defense Command - HTML5 Engine (00_zombie)
 * Canvas 2D Top-Down Grid Defense Game
 * Pure Vanilla JavaScript - 100% Offline Playable (file:// safe)
 * Version: v2.6.0 (Visual Spotlight & Animated Arrow Beginner Tutorial, Active 3-Tile Perimeter Commando AI, Commando-Only 1.25x Spawn Breach Destruction, Zombie-Only Towers & Stronger +20/+40/+70 HP/s Engineer Upgrade Scaling)
 */

(function () {
  'use strict';

  // --- GRID CONSTANTS (32x24 / 1280x960) ---
  const COLS = 32;
  const ROWS = 24;
  const TILE_SIZE = 40;
  const WIDTH = 1280;
  const HEIGHT = 960;
  const TOTAL_CELLS = COLS * ROWS; // 768
  const MAX_PATH_ITERATIONS = 1500;

  // Tile Types:
  // 0: Empty ground (walkable, buildable)
  // 1: Rock Wall (indestructible obstruction)
  // 2: Green Base Safe Zone (per-block HP in this.safeZones; rescues civilians; heals soldiers; buildable/upgradeable)
  // 3: Red Zombie Spawn Breach (per-breach HP in this.spawns; destructible siege objective)
  // 4: Pre-placed Barricade (destructible wall; becomes 0 when destroyed)

  const STATE = {
    START_MENU: 'START_MENU',
    PREPARE: 'PREPARE',
    ACTIVE: 'ACTIVE',
    CLEARED: 'CLEARED',
    GAMEOVER: 'GAMEOVER',
    VICTORY: 'VICTORY'
  };

  // Difficulty Configurations
  const DIFFICULTY_PRESETS = {
    easy: {
      name: 'Easy',
      startingScrap: 160,
      zombieHpMult: 0.75,
      zombieSpeedMult: 0.75,
      infectionWindow: 3.0
    },
    normal: {
      name: 'Normal',
      startingScrap: 100,
      zombieHpMult: 1.0,
      zombieSpeedMult: 1.0,
      infectionWindow: 2.0
    },
    hard: {
      name: 'Hard',
      startingScrap: 75,
      zombieHpMult: 1.35,
      zombieSpeedMult: 1.35,
      infectionWindow: 1.2
    }
  };

  // --- LEVEL MAP DEFINITIONS (24 ROWS x 32 COLS) ---
  const LEVEL_MAPS = [
    // Sector 1: Courtyard
    [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
      [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
      [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Sector 2: Choke Alley
    [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,1,1,0,0,0,4,0,0,0,0,1,1,0,0,0,4,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,1,1,0,0,0,4,0,0,0,0,1,1,0,0,0,4,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,4,4,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,4,4,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,1,1,0,0,0,4,0,0,0,0,1,1,0,0,0,4,0,0,0,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,1,1,0,0,0,4,0,0,0,0,1,1,0,0,0,4,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,3,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Sector 3: Twin Fronts
    [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,1,1,0,0,4,4,4,4,0,0,0,1,1,0,0,0,4,4,4,4,0,0,1,1,0,0,0,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,4,4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,4,4,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1],
      [1,0,0,0,1,1,0,0,4,4,4,4,0,0,0,1,1,0,0,0,4,4,4,4,0,0,1,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    // Sector 4: The Citadel
    [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
      [1,0,0,0,1,1,1,0,0,0,0,4,4,4,4,4,4,4,4,4,4,0,0,0,0,1,1,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,4,0,0,1,1,0,0,0,0,1,1,0,0,4,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,4,0,0,1,1,0,0,0,0,1,1,0,0,4,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,4,0,0,0,1,0,2,2,2,2,0,1,0,0,0,4,0,0,0,0,0,0,0,1],
      [3,0,0,0,0,0,0,0,4,0,0,0,0,0,2,2,2,2,0,0,0,0,0,4,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,4,0,0,0,0,0,2,2,2,2,0,0,0,0,0,4,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,4,0,0,0,0,0,2,2,2,2,0,0,0,0,0,4,0,0,0,0,0,0,0,3],
      [3,0,0,0,0,0,0,0,4,0,0,0,0,0,2,2,2,2,0,0,0,0,0,4,0,0,0,0,0,0,0,3],
      [1,0,0,0,0,0,0,0,4,0,0,0,1,0,2,2,2,2,0,1,0,0,0,4,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,4,0,0,1,1,0,0,0,0,1,1,0,0,4,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,4,0,0,1,1,0,0,0,0,1,1,0,0,4,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,1,1,1,0,0,0,0,4,4,4,4,4,4,4,4,4,4,0,0,0,0,1,1,1,0,0,0,1],
      [1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ]
  ];

  // --- STRUCTURE STATS & SPECS (v2.1.0: 2x Sentry, $75 Safe Zone, Barracks/Engineering/Habitat Safe-Zone Buildings) ---
  const STRUCTURE_SPECS = {
    wall: {
      name: 'Barricade Wall',
      role: 'wall',
      baseCost: 10,
      requiresAdjacency: false,
      levels: [
        { hp: 100, cost: 10, repairCost: 6, color: '#8B5A2B', border: '#D2B48C' },
        { hp: 250, cost: 90, repairCost: 55, color: '#555566', border: '#8888AA' },
        { hp: 500, cost: 180, repairCost: 105, color: '#1B3B5F', border: '#00FFFF' }
      ]
    },
    gate: {
      name: 'Security Gate',
      role: 'gate',
      baseCost: 100,
      requiresAdjacency: false,
      levels: [
        { name: 'Security Gate', hp: 160, cost: 100, repairCost: 25, color: '#26384C', border: '#00E5FF' },
        { name: 'Reinforced Gate', hp: 350, cost: 160, repairCost: 45, color: '#1F4B6E', border: '#38E8FF' },
        { name: 'Blast Gate', hp: 650, cost: 260, repairCost: 75, color: '#175B88', border: '#FFD23F' }
      ]
    },
    sentry: {
      name: 'Sentry Turret',
      role: 'turret',
      baseCost: 150,
      requiresAdjacency: true,
      levels: [
        { range: 120, rate: 0.40, dmg: 11, hp: 120, cost: 150, repairCost: 60, color: '#4477AA', barrels: 1 },
        { range: 160, rate: 0.25, dmg: 22, hp: 220, cost: 240, repairCost: 96, color: '#225588', barrels: 2 },
        { range: 200, rate: 0.15, dmg: 40, hp: 350, cost: 390, repairCost: 156, color: '#003366', barrels: 4 }
      ]
    },
    cryo: {
      name: 'Cryo Turret',
      role: 'turret',
      baseCost: 180,
      requiresAdjacency: true,
      levels: [
        { range: 100, aoe: 50, slow: 0.3, slowDur: 2.0, hp: 100, cost: 180, repairCost: 72, color: '#00AAAA' },
        { range: 140, aoe: 75, slow: 0.5, slowDur: 3.0, hp: 180, cost: 270, repairCost: 108, color: '#00CCCC' },
        { range: 180, aoe: 100, slow: 0.7, slowDur: 4.5, hp: 280, cost: 420, repairCost: 168, color: '#00FFFF' }
      ]
    },
    sniper: {
      name: 'Sniper Turret',
      role: 'turret',
      baseCost: 225,
      requiresAdjacency: true,
      levels: [
        { range: 250, rate: 2.0, dmg: 80, hp: 90, cost: 225, repairCost: 90, color: '#8833AA' },
        { range: 320, rate: 1.5, dmg: 160, hp: 160, cost: 330, repairCost: 132, color: '#AA33CC' },
        { range: 400, rate: 1.0, dmg: 300, hp: 250, cost: 525, repairCost: 210, color: '#CC33FF' }
      ]
    },
    bunker: {
      name: 'Combat Bunker',
      role: 'bunker',
      baseCost: 90,
      requiresAdjacency: false,
      capacity: 4,
      atkBuffMult: 1.5,
      levels: [
        { hp: 220, cost: 90, repairCost: 36, capacity: 4, color: '#1E5B4A', border: '#00E08A' },
        { hp: 400, cost: 150, repairCost: 60, capacity: 4, color: '#1A735D', border: '#38E8FF' },
        { hp: 650, cost: 270, repairCost: 108, capacity: 4, color: '#148F77', border: '#FFD23F' }
      ]
    },
    barracks: {
      name: 'Barracks',
      role: 'barracks',
      baseCost: 80,
      requiresAdjacency: false,
      requiresSafeZone: true,
      capacity: 4,
      maxRoster: 4,
      trainCost: 75,
      trainDuration: 4.0,
      healRate: 6,
      fireRange: 120,
      fireRate: 0.42,
      fireDmg: 24,
      levels: [
        { hp: 200, cost: 80, repairCost: 32, capacity: 4, range: 120, color: '#4B3A1E', border: '#FFD23F' },
        { hp: 360, cost: 140, repairCost: 56, capacity: 4, range: 140, color: '#634C22', border: '#FF9A1F' },
        { hp: 580, cost: 240, repairCost: 96, capacity: 4, range: 160, color: '#7D6028', border: '#00E5FF' }
      ]
    },
    engineering: {
      name: 'Engineering',
      role: 'engineering',
      baseCost: 90,
      requiresAdjacency: false,
      requiresSafeZone: true,
      capacity: 4,
      maxRoster: 4,
      trainCost: 50,
      trainDuration: 4.0,
      healRate: 6,
      levels: [
        { hp: 200, cost: 90, repairCost: 36, capacity: 4, color: '#2E3D4F', border: '#00E5FF' },
        { hp: 360, cost: 150, repairCost: 60, capacity: 4, color: '#274E6B', border: '#38E8FF' },
        { hp: 580, cost: 250, repairCost: 100, capacity: 4, color: '#1F628A', border: '#FFD23F' }
      ]
    },
    habitat: {
      name: 'Habitat',
      role: 'habitat',
      baseCost: 110,
      requiresAdjacency: false,
      requiresSafeZone: true,
      maxQueue: 20,
      trainCost: 65,
      levels: [
        { hp: 180, cost: 110, repairCost: 44, trainDuration: 3.5, color: '#1D4D3E', border: '#00E08A' },
        { hp: 320, cost: 180, repairCost: 72, trainDuration: 2.2, color: '#226953', border: '#38E8FF' },
        { hp: 500, cost: 280, repairCost: 112, trainDuration: 1.2, color: '#288568', border: '#FFD23F' }
      ]
    },
    safezone: {
      name: 'Safe Zone Block',
      role: 'safezone',
      baseCost: 10,
      requiresAdjacency: true,
      levels: [
        { hp: 150, cost: 10, repairCost: 4, color: '#0A3B28', border: '#00E08A' }
      ]
    }
  };

  // --- RESCUED SOLDIER & LINKED TERRITORY COMMANDO SPECS ---
  const SOLDIER_SPECS = [
    { level: 1, name: 'Recruit', maxHp: 60, range: 110, dmg: 8, rate: 0.70, upgradeCost: 0, color: '#2B8CFF' },
    { level: 2, name: 'Ranger', maxHp: 100, range: 150, dmg: 16, rate: 0.55, upgradeCost: 60, color: '#00B8FF' },
    { level: 3, name: 'Commando', maxHp: 160, range: 190, dmg: 28, rate: 0.40, upgradeCost: 120, color: '#38E8FF' }
  ];

  // Rebalanced (-50%) <=3-tile perimeter kiting Commandos trained in Barracks ($75, 4.0s; upgrades linked to Barracks Lv1-Lv3)
  const COMMANDO_SPECS = [
    { level: 1, name: 'Commando', maxHp: 150, range: 120, dmg: 24, rate: 0.42, speed: 82, color: '#00E5FF' },
    { level: 2, name: 'Elite Commando', maxHp: 210, range: 140, dmg: 34, rate: 0.36, speed: 86, color: '#38E8FF' },
    { level: 3, name: 'Spec-Ops Commando', maxHp: 280, range: 160, dmg: 46, rate: 0.30, speed: 90, color: '#FFD23F' }
  ];

  // --- AUTO-REPAIR ENGINEER SPECS (Trained in Engineering from Lv1 Recruits over 4.0s; upgrades linked to Engineering Lv1-Lv3) ---
  const ENGINEER_SPECS = [
    { level: 1, name: 'Engineer', maxHp: 70, speed: 70, repairRate: 20, upgradeCost: 0, color: '#FFB800' },
    { level: 2, name: 'Master Engineer', maxHp: 110, speed: 75, repairRate: 40, upgradeCost: 60, color: '#FFD23F' },
    { level: 3, name: 'Chief Engineer', maxHp: 160, speed: 80, repairRate: 70, upgradeCost: 120, color: '#FFEE77' }
  ];

  const STRUCT_ICONS = {
    wall: '&#9646;',
    gate: '&#9638;',
    sentry: '&#9881;',
    cryo: '&#10052;',
    sniper: '&#8982;',
    bunker: '&#9962;',
    barracks: '&#9874;',
    engineering: '&#9881;',
    habitat: '&#8962;',
    safezone: '&#10010;',
    soldier: '&#9733;',
    engineer: '&#9874;'
  };

  // --- PROCEDURAL WEB AUDIO SYNTHESIZER ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }

    unlock() {
      try {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      } catch (e) {}
    }

    setMuted(m) {
      this.muted = !!m;
    }

    tone(freqStart, freqEnd, dur, type = 'sine', vol = 0.08) {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        if (freqEnd && freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
        }
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
      } catch (e) {}
    }

    playClick() { this.tone(680, 920, 0.055, 'triangle', 0.06); }
    playLaser(f1 = 560, f2 = 220, d = 0.07) { this.tone(f1, f2, d, 'sawtooth', 0.045); }
    playCryoPulse() { this.tone(880, 320, 0.22, 'sine', 0.06); }
    playSniperRail() { this.tone(1100, 140, 0.16, 'square', 0.065); }
    playHit() { this.tone(190, 95, 0.06, 'square', 0.05); }
    playBarricadeBreak() { this.tone(130, 42, 0.25, 'sawtooth', 0.09); }
    playInfection() { this.tone(310, 220, 0.24, 'sawtooth', 0.07); }

    playRescue() {
      this.tone(523.25, 523.25, 0.09, 'triangle', 0.08);
      setTimeout(() => this.tone(659.25, 659.25, 0.09, 'triangle', 0.08), 70);
      setTimeout(() => this.tone(783.99, 1046.5, 0.16, 'triangle', 0.09), 140);
    }

    playUpgrade() {
      this.tone(440, 880, 0.18, 'triangle', 0.09);
    }
  }

  // --- DOM & GRID HELPERS ---
  function showEl(el, display) {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = display || 'flex';
  }

  function hideEl(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  function inBounds(c, r) {
    return c >= 0 && c < COLS && r >= 0 && r < ROWS;
  }

  function tileCenter(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE * 0.5,
      y: row * TILE_SIZE + TILE_SIZE * 0.5
    };
  }

  // --- SHARED ZOMBIE CANVAS SPRITE RENDERER (Used on Battlefield AND in Bestiary Portraits) ---
  function drawZombieSprite(ctx, z, t) {
    if (z.type === 'demolisher') {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle || 0);

      ctx.fillStyle = '#FF9A1F';
      for (const sy of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(z.radius - 2, sy - 2.5);
        ctx.lineTo(z.radius + 6, sy);
        ctx.lineTo(z.radius - 2, sy + 2.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FF9A1F';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius - 1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = Math.sin(t * 10) > 0 ? '#FF9A1F' : '#FF3B3B';
      ctx.beginPath();
      ctx.arc(z.x, z.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
    } else if (z.type === 'wrecker') {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.angle || 0);

      ctx.fillStyle = '#FFD23F';
      for (const sy of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(z.radius - 2, sy - 2);
        ctx.lineTo(z.radius + 6, sy);
        ctx.lineTo(z.radius - 2, sy + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFD23F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius - 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(z.x, z.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
    } else if (z.type === 'tank') {
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- REUSABLE BOUNDED BFS PATHFINDER (768 cells, 1500 cap) ---
  const bfsQueue = new Int16Array(TOTAL_CELLS);
  const bfsParent = new Int16Array(TOTAL_CELLS);
  const bfsVisited = new Uint8Array(TOTAL_CELLS);
  const BFS_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const DIRS_8 = [[0, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];

  function findPath(startCol, startRow, goalCol, goalRow, isBlockedFn) {
    if (!inBounds(startCol, startRow) || !inBounds(goalCol, goalRow)) return null;
    if (startCol === goalCol && startRow === goalRow) return [];
    if (isBlockedFn(goalCol, goalRow)) return null;

    bfsVisited.fill(0);
    bfsParent.fill(-1);

    const startIdx = startRow * COLS + startCol;
    const goalIdx = goalRow * COLS + goalCol;
    let head = 0;
    let tail = 0;

    bfsVisited[startIdx] = 1;
    bfsQueue[tail++] = startIdx;

    let iterations = 0;
    let found = false;

    while (head < tail && iterations < MAX_PATH_ITERATIONS) {
      iterations++;
      const curIdx = bfsQueue[head++];
      if (curIdx === goalIdx) {
        found = true;
        break;
      }

      const cx = curIdx % COLS;
      const cy = (curIdx - cx) / COLS;

      for (let i = 0; i < 4; i++) {
        const nx = cx + BFS_DIRS[i][0];
        const ny = cy + BFS_DIRS[i][1];
        if (!inBounds(nx, ny)) continue;
        const nIdx = ny * COLS + nx;
        if (bfsVisited[nIdx]) continue;
        if (isBlockedFn(nx, ny)) continue;

        bfsVisited[nIdx] = 1;
        bfsParent[nIdx] = curIdx;
        bfsQueue[tail++] = nIdx;
      }
    }

    if (!found) return null;

    const path = [];
    let trace = goalIdx;
    let traceSteps = 0;
    while (trace !== startIdx && trace !== -1 && traceSteps < TOTAL_CELLS) {
      traceSteps++;
      const tx = trace % COLS;
      const ty = (trace - tx) / COLS;
      path.push([tx, ty]);
      trace = bfsParent[trace];
    }
    path.reverse();
    return path;
  }

  // Non-linear randomized weighted zombie pathfinding (4-bucket Dial's shortest path with shuffled neighbors & jittered costs 1..3)
  const zBfsDist = new Int16Array(TOTAL_CELLS);
  const zBfsParent = new Int16Array(TOTAL_CELLS);
  const zDirOrder = [0, 1, 2, 3];

  function findZombiePath(startCol, startRow, goalCol, goalRow, isBlockedFn) {
    if (!inBounds(startCol, startRow) || !inBounds(goalCol, goalRow)) return null;
    if (startCol === goalCol && startRow === goalRow) return [];
    if (isBlockedFn(goalCol, goalRow)) return null;

    zBfsDist.fill(30000);
    zBfsParent.fill(-1);

    const startIdx = startRow * COLS + startCol;
    const goalIdx = goalRow * COLS + goalCol;
    zBfsDist[startIdx] = 0;

    const buckets = [[startIdx], [], [], []];
    const bucketHeads = [0, 0, 0, 0];
    let totalQueued = 1;
    let curCost = 0;
    let iterations = 0;
    let found = false;

    while (totalQueued > 0 && iterations < MAX_PATH_ITERATIONS) {
      const b = curCost & 3;
      if (bucketHeads[b] >= buckets[b].length) {
        buckets[b].length = 0;
        bucketHeads[b] = 0;
        curCost++;
        continue;
      }
      const curIdx = buckets[b][bucketHeads[b]++];
      totalQueued--;
      if (zBfsDist[curIdx] < curCost) continue;
      iterations++;

      if (curIdx === goalIdx) {
        found = true;
        break;
      }

      const cx = curIdx % COLS;
      const cy = (curIdx - cx) / COLS;

      for (let i = 3; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = zDirOrder[i];
        zDirOrder[i] = zDirOrder[j];
        zDirOrder[j] = tmp;
      }

      for (let i = 0; i < 4; i++) {
        const d = BFS_DIRS[zDirOrder[i]];
        const nx = cx + d[0];
        const ny = cy + d[1];
        if (!inBounds(nx, ny)) continue;
        if (isBlockedFn(nx, ny)) continue;
        const nIdx = ny * COLS + nx;
        const stepCost = 1 + Math.floor(Math.random() * 3);
        const nd = curCost + stepCost;
        if (nd < zBfsDist[nIdx]) {
          zBfsDist[nIdx] = nd;
          zBfsParent[nIdx] = curIdx;
          buckets[nd & 3].push(nIdx);
          totalQueued++;
        }
      }
    }

    if (!found) return null;

    const path = [];
    let trace = goalIdx;
    let traceSteps = 0;
    while (trace !== startIdx && trace !== -1 && traceSteps < TOTAL_CELLS) {
      traceSteps++;
      const tx = trace % COLS;
      const ty = (trace - tx) / COLS;
      path.push([tx, ty]);
      trace = zBfsParent[trace];
    }
    path.reverse();
    return path;
  }

  // --- NON-REPEATING PROCEDURAL RANDOM SECTOR GENERATOR (v1.9.0) ---
  const RANDOM_ARCHETYPES = [
    'Central Fortress',
    'Twin North/South Bunkers',
    'East-West Siege',
    'Corner Redoubt',
    'Diagonal Crossfire',
    'Split Bastion'
  ];
  const usedMapSignatures = new Set();

  function createBlankGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      const row = new Array(COLS).fill(0);
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          row[c] = 1;
        }
      }
      g.push(row);
    }
    return g;
  }

  function fillRect(g, r0, r1, c0, c1, val) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (inBounds(c, r)) g[r][c] = val;
      }
    }
  }

  function gridSignature(g) {
    return g.map((row) => row.join('')).join('|');
  }

  function validateGeneratedGrid(g) {
    const safeTiles = [];
    const spawnTiles = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === 2) safeTiles.push([c, r]);
        else if (g[r][c] === 3) spawnTiles.push([c, r]);
      }
    }
    if (safeTiles.length < 8 || spawnTiles.length < 4) return false;

    const seenRockFree = new Uint8Array(TOTAL_CELLS);
    const q1 = [];
    for (const [sc, sr] of safeTiles) {
      seenRockFree[sr * COLS + sc] = 1;
      q1.push([sc, sr]);
    }
    for (let h = 0; h < q1.length; h++) {
      const [cx, cy] = q1[h];
      for (let i = 0; i < 4; i++) {
        const nx = cx + BFS_DIRS[i][0];
        const ny = cy + BFS_DIRS[i][1];
        if (!inBounds(nx, ny)) continue;
        const idx = ny * COLS + nx;
        if (seenRockFree[idx] || g[ny][nx] === 1) continue;
        seenRockFree[idx] = 1;
        q1.push([nx, ny]);
      }
    }
    for (const [spc, spr] of spawnTiles) {
      if (!seenRockFree[spr * COLS + spc]) return false;
    }

    const seenOpen = new Uint8Array(TOTAL_CELLS);
    const q2 = [];
    for (const [sc, sr] of safeTiles) {
      seenOpen[sr * COLS + sc] = 1;
      q2.push([sc, sr]);
    }
    let openEmptyCount = 0;
    for (let h = 0; h < q2.length; h++) {
      const [cx, cy] = q2[h];
      for (let i = 0; i < 4; i++) {
        const nx = cx + BFS_DIRS[i][0];
        const ny = cy + BFS_DIRS[i][1];
        if (!inBounds(nx, ny)) continue;
        const idx = ny * COLS + nx;
        if (seenOpen[idx] || g[ny][nx] === 1 || g[ny][nx] === 4) continue;
        seenOpen[idx] = 1;
        if (g[ny][nx] === 0) openEmptyCount++;
        q2.push([nx, ny]);
      }
    }
    if (openEmptyCount < 120) return false;

    for (const [spc, spr] of spawnTiles) {
      if (!seenOpen[spr * COLS + spc]) return false;
    }

    return true;
  }

  function generateRandomSector(sectorNumber = 1) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const g = createBlankGrid();
      const archIdx = Math.floor(Math.random() * RANDOM_ARCHETYPES.length);
      const archetype = RANDOM_ARCHETYPES[archIdx];

      // Randomize safe zone dimensions & jitter
      const dc = Math.floor(Math.random() * 5) - 2;
      const dr = Math.floor(Math.random() * 3) - 1;

      if (archetype === 'Central Fortress' || archetype === 'Diagonal Crossfire') {
        const r0 = Math.max(6, Math.min(13, 10 + dr));
        const c0 = Math.max(9, Math.min(18, 13 + dc));
        const h = 3 + (attempt % 2);
        const w = 4 + (Math.floor(Math.random() * 3));
        fillRect(g, r0, r0 + h, c0, c0 + w, 2);

        // Partial randomized barricade ring with wide gates
        for (let c = c0 - 2; c <= c0 + w + 2; c++) {
          if (Math.random() < 0.55 && Math.abs(c - (c0 + Math.floor(w / 2))) > 1) {
            if (inBounds(c, r0 - 2)) g[r0 - 2][c] = 4;
            if (inBounds(c, r0 + h + 2)) g[r0 + h + 2][c] = 4;
          }
        }
        // Random rock clusters outside keep
        const numRocks = 7 + Math.floor(Math.random() * 6);
        for (let k = 0; k < numRocks; k++) {
          const pr = 2 + Math.floor(Math.random() * (ROWS - 5));
          const pc = 2 + Math.floor(Math.random() * (COLS - 5));
          if (pr >= r0 - 3 && pr <= r0 + h + 3 && pc >= c0 - 3 && pc <= c0 + w + 3) continue;
          fillRect(g, pr, pr + (Math.random() < 0.6 ? 1 : 0), pc, pc + (Math.random() < 0.7 ? 1 : 0), 1);
        }
      } else if (archetype === 'Twin North/South Bunkers' || archetype === 'Split Bastion') {
        const cLeft = 5 + Math.floor(Math.random() * 5);
        const cRight = 18 + Math.floor(Math.random() * 6);
        fillRect(g, 1, 2, cLeft, cLeft + 3, 2);
        fillRect(g, 21, 22, cRight, cRight + 3, 2);
        for (let c = cLeft; c <= cLeft + 3; c++) if (Math.random() < 0.65) g[4][c] = 4;
        for (let c = cRight; c <= cRight + 3; c++) if (Math.random() < 0.65) g[19][c] = 4;

        const numRocks = 8 + Math.floor(Math.random() * 5);
        for (let k = 0; k < numRocks; k++) {
          const pr = 6 + Math.floor(Math.random() * 11);
          const pc = 4 + Math.floor(Math.random() * 23);
          fillRect(g, pr, pr + 1, pc, pc + 1, 1);
        }
      } else if (archetype === 'East-West Siege') {
        const eastSafe = Math.random() < 0.5;
        const rStart = 4 + Math.floor(Math.random() * 5);
        const rEnd = rStart + 8 + Math.floor(Math.random() * 5);
        if (eastSafe) {
          fillRect(g, rStart, Math.min(21, rEnd), 29, 30, 2);
        } else {
          fillRect(g, rStart, Math.min(21, rEnd), 1, 2, 2);
        }
        const cols = [7 + Math.floor(Math.random() * 2), 14 + Math.floor(Math.random() * 3), 21 + Math.floor(Math.random() * 2)];
        for (const col of cols) {
          const gap1 = 2 + Math.floor(Math.random() * 7);
          const gap2 = 13 + Math.floor(Math.random() * 7);
          for (let r = 2; r < ROWS - 2; r++) {
            const inGap1 = Math.abs(r - gap1) <= 2;
            const inGap2 = Math.abs(r - gap2) <= 2;
            if (!inGap1 && !inGap2) {
              g[r][col] = 1;
            } else if (r === gap1 || r === gap2) {
              g[r][col] = 4;
            }
          }
        }
      } else {
        // Corner Redoubt (randomized corner: SE, SW, NE, or NW)
        const corner = Math.floor(Math.random() * 4);
        const sr0 = corner < 2 ? 17 : 2;
        const sc0 = corner % 2 === 0 ? 24 : 2;
        fillRect(g, sr0, sr0 + 4, sc0, sc0 + 5, 2);
        const numRocks = 9 + Math.floor(Math.random() * 5);
        for (let k = 0; k < numRocks; k++) {
          const pr = 2 + Math.floor(Math.random() * (ROWS - 5));
          const pc = 2 + Math.floor(Math.random() * (COLS - 5));
          if (Math.abs(pr - sr0) < 6 && Math.abs(pc - sc0) < 7) continue;
          fillRect(g, pr, pr + 1, pc, pc + 1, 1);
        }
      }

      // Place 6 to 10 randomized perimeter Spawn Breaches (tile === 3) far from Safe Zones
      const safeCoords = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g[r][c] === 2) safeCoords.push([c, r]);
        }
      }

      const candidateBreaches = [];
      for (let c = 1; c < COLS - 1; c++) {
        candidateBreaches.push([c, 1], [c, ROWS - 2]);
      }
      for (let r = 2; r < ROWS - 2; r++) {
        candidateBreaches.push([1, r], [COLS - 2, r]);
      }

      const validBreaches = candidateBreaches.filter(([c, r]) => {
        if (g[r][c] !== 0) return false;
        return safeCoords.every(([sc, sr]) => Math.abs(sc - c) + Math.abs(sr - r) >= 9);
      });

      for (let i = validBreaches.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validBreaches[i], validBreaches[j]] = [validBreaches[j], validBreaches[i]];
      }

      const targetSpawns = Math.min(validBreaches.length, 6 + Math.floor(Math.random() * 5));
      for (let i = 0; i < targetSpawns; i++) {
        const [bc, br] = validBreaches[i];
        g[br][bc] = 3;
      }

      const sig = gridSignature(g);
      if (!usedMapSignatures.has(sig) && validateGeneratedGrid(g)) {
        usedMapSignatures.add(sig);
        return { grid: g, archetype };
      }
    }

    return {
      grid: LEVEL_MAPS[(sectorNumber - 1) % LEVEL_MAPS.length].map((row) => [...row]),
      archetype: 'Central Fortress'
    };
  }

  // --- MAIN GAME ENGINE ---
  class ZombieGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.sound = new SoundFX();

      this.currentLevel = 0;
      this.startMenuMode = 'campaign'; // 'campaign', 'random', 'post_defense'
      this.isRandomMode = false;
      this.isPostDefenseMode = false;
      this.postDefenseGrid = null;
      this.randomSectorCount = 0;
      this.randomArchetype = '';
      this.elapsedTime = 0;
      this.threatMult = 1.0;
      this.hordeScale = { hp: 1.0, dmg: 1.0, speed: 1.0 };
      this.initialSpawnCount = 1;

      this.grid = [];
      this.structures = new Map(); // "c,r" -> structure (wall, gate, sentry, cryo, sniper, bunker, barracks)
      this.safeZones = new Map();  // "c,r" -> destructible/upgradeable Safe Zone block (tile === 2)
      this.spawns = new Map();     // "c,r" -> destructible Spawn Breach (tile === 3)
      this.sealedSpawns = [];      // Post Defense temporarily sealed spawns: { col, row, reopenWave }
      this.civilians = [];
      this.soldiers = [];
      this.engineers = [];
      this.zombies = [];
      this.projectiles = [];
      this.particles = [];
      this.pulseRings = [];
      this.floatingTexts = [];

      this.difficulty = 'normal';
      this.zombieHpMult = 1.0;
      this.zombieSpeedMult = 1.0;
      this.infectionWindow = 2.0;

      this.scrap = 100;
      this.score = 0;
      this.savedCount = 0;
      this.infectedCount = 0;
      this.civTotal = 0;
      this.baseIntegrity = 100;

      // Periodic stranded civilian breach spawn timer (15s-22s)
      this.breachCivTimer = 17.0;

      // Wave & anytime next-wave state
      this.wave = 0;
      this.totalWaves = 5;
      this.waveState = STATE.START_MENU;
      this.nextWaveTimer = 20.0;
      this.waveSpawnQueue = [];
      this.spawnTimer = 0;

      this.isPaused = false;
      this.gameSpeed = 1;
      this.helpOpen = false;
      this.helpPausedGame = false;
      this.zombieGuideOpen = false;
      this.zombieGuidePausedGame = false;

      this.selectModeActive = false;
      this.selectedBuildType = null;
      this.selectedCivilian = null;
      this.selectedSoldier = null;
      this.selectedEngineer = null;
      this.selectedStructure = null;
      this.safeZoneDrag = null;
      this.wallDrag = null;
      this.suppressNextClick = false;
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;
      this.hudMenuConfirmUntil = 0;
      this.isTutorialMode = false;
      this.tutorialStep = 0;
      this.tutorialPulseElId = null;

      this.mousePos = { x: -100, y: -100 };
      this.mouseTile = { col: -1, row: -1 };
      this.isMobileTouch = false;
      this.camera = { zoom: 1, panX: 0, panY: 0, minZoom: 1, maxZoom: 2.8 };
      this.touchState = {
        active: false,
        pinching: false,
        panning: false,
        moved: false,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastY: 0,
        startTime: 0,
        prevPinchDist: 0,
        prevPinchMidX: 0,
        prevPinchMidY: 0
      };
      this.lastTimestamp = 0;
      this.uiTimer = 0;
      this.timerText = '';

      this.bindDOM();
      this.bindEvents();
      this.updateMobileMode(true);
      this.renderBestiaryPortraits();

      this.initLevel(0);
      this.waveState = STATE.START_MENU;
      this.syncStartCards();
      showEl(this.startScreenOverlay, 'flex');
      this.updateHUD();
      this.updateTimerHud();

      requestAnimationFrame((ts) => this.loop(ts));
    }

    get inPlay() {
      return (
        this.waveState === STATE.PREPARE ||
        this.waveState === STATE.ACTIVE ||
        this.waveState === STATE.CLEARED
      );
    }

    get modalBlocking() {
      return this.helpOpen || this.zombieGuideOpen;
    }

    get isEndlessMode() {
      return this.isRandomMode || this.isPostDefenseMode;
    }

    get requiredQuota() {
      return Math.max(1, Math.ceil(this.civTotal * 0.5));
    }

    get garrisonedSoldierCount() {
      let total = 0;
      for (const st of this.structures.values()) {
        if ((st.type === 'bunker' || st.type === 'barracks' || st.type === 'engineering') && st.occupants) {
          for (const u of st.occupants) {
            if (u.unitType !== 'engineer') total++;
          }
        }
      }
      return total;
    }

    get garrisonedEngineerCount() {
      let total = 0;
      for (const st of this.structures.values()) {
        if (st.type === 'engineering' && st.occupants) {
          for (const u of st.occupants) {
            if (u.unitType === 'engineer') total++;
          }
        }
      }
      return total;
    }

    get garrisonedCivilianCount() {
      return 0;
    }

    bindDOM() {
      const $ = (id) => document.getElementById(id);
      this.hudScrap = $('hudScrap');
      this.hudSoldiers = $('hudSoldiers');
      this.hudWave = $('hudWave');
      this.hudThreatBadge = $('hudThreatBadge');
      this.hudThreat = $('hudThreat');
      this.hudTimer = $('hudTimer');
      this.hudBase = $('hudBase');
      this.hudSzDmg = $('hudSzDmg');

      this.levelSelect = $('levelSelect');
      this.btnResetLevel = $('btnResetLevel');
      this.btnHudMainMenu = $('btnHudMainMenu');
      this.buildPanel = $('buildPanel');
      this.upgradePanel = $('upgradePanel');
      this.deckHint = $('deckHint');

      this.btnStartWave = $('btnStartWave');
      this.waveBonusLabel = $('waveBonusLabel');
      this.btnPause = $('btnPause');
      this.btnSpeed = $('btnSpeed');
      this.btnMute = $('btnMute');
      this.btnHudHelp = $('btnHudHelp');
      this.btnHudZombies = $('btnHudZombies');
      this.statusMessage = $('statusMessage');

      this.startScreenOverlay = $('startScreenOverlay');
      this.difficultySelect = $('difficultySelect');
      this.startLevelSelect = $('startLevelSelect');
      this.campaignSectorPanel = $('campaignSectorPanel');
      this.btnStartMission = $('btnStartMission');
      this.btnStartTutorial = $('btnStartTutorial');
      this.btnStartZombies = $('btnStartZombies');
      this.btnHowToPlay = $('btnHowToPlay');

      this.gameContainer = $('gameContainer');
      this.tutorialOverlay = $('tutorialOverlay');
      this.tutorialStepBadge = $('tutorialStepBadge');
      this.tutorialIcon = $('tutorialIcon');
      this.tutorialTitle = $('tutorialTitle');
      this.tutorialBody = $('tutorialBody');
      this.btnSkipTutorial = $('btnSkipTutorial');
      this.tutorialUiArrow = $('tutorialUiArrow');
      this.tutorialUiArrowText = $('tutorialUiArrowText');
      this.tutorialUiArrowGlyph = $('tutorialUiArrowGlyph');

      this.howToPlayModal = $('howToPlayModal');
      this.btnCloseHowToPlay = $('btnCloseHowToPlay');
      this.btnDismissHelp = $('btnDismissHelp');

      this.zombieGuideModal = $('zombieGuideModal');
      this.btnCloseZombieGuide = $('btnCloseZombieGuide');
      this.btnDismissZombieGuide = $('btnDismissZombieGuide');

      this.gameOverOverlay = $('gameOverOverlay');
      this.btnRestart = $('btnRestart');
      this.btnNextLevel = $('btnNextLevel');
      this.btnMainMenu = $('btnMainMenu');

      this.inspectIcon = $('inspectIcon');
      this.inspectName = $('inspectName');
      this.inspectTier = $('inspectTier');
      this.inspectHpText = $('inspectHpText');
      this.inspectHpBar = $('inspectHpBar');
      this.inspectStatRange = $('inspectStatRange');
      this.inspectStatDmg = $('inspectStatDmg');
      this.inspectStatKills = $('inspectStatKills');

      this.unitTrainSelect = $('unitTrainSelect');
      this.btnTrainUnit = $('btnTrainUnit');
      this.trainCostLabel = $('trainCostLabel');
      this.btnCancelTrain = $('btnCancelTrain');
      this.cancelTrainLabel = $('cancelTrainLabel');
      this.btnRelease = $('btnRelease');
      this.releaseCountLabel = $('releaseCountLabel');
      this.inspectRepairStatus = $('inspectRepairStatus');
      this.btnUpgrade = $('btnUpgrade');
      this.upgradeCostLabel = $('upgradeCostLabel');
      this.btnSalvage = $('btnSalvage');
      this.salvageRefundLabel = $('salvageRefundLabel');

      this.topHud = $('topHud');
      this.viewportContainer = $('viewportContainer');
      this.inspectorSlot = $('inspectorSlot');
      this.cameraControls = $('cameraControls');
      this.btnCamZoomOut = $('btnCamZoomOut');
      this.btnCamReset = $('btnCamReset');
      this.btnCamZoomIn = $('btnCamZoomIn');
      this.btnCamFocusBase = $('btnCamFocusBase');

      // Mobile 6-Tab Navigation Bar & Sub-Drawer
      this.mobileTabBar = $('mobileTabBar');
      this.mobileSubDrawer = $('mobileSubDrawer');
      this.tabNextWave = $('tabNextWave');
      this.mobileWaveBonusLabel = $('mobileWaveBonusLabel');
      this.tabPause = $('tabPause');
      this.tabPauseIcon = $('tabPauseIcon');
      this.tabPauseLabel = $('tabPauseLabel');
      this.tabSafeZone = $('tabSafeZone');
      this.tabWalls = $('tabWalls');
      this.tabBuildings = $('tabBuildings');
      this.tabTowers = $('tabTowers');
      this.subGroupWalls = $('subGroupWalls');
      this.subGroupBuildings = $('subGroupBuildings');
      this.subGroupTowers = $('subGroupTowers');
      this.activeMobileCategory = null;
    }

    bindEvents() {
      const on = (el, evt, fn) => {
        if (el) el.addEventListener(evt, fn);
      };

      document.addEventListener('click', (e) => {
        if (e.target && e.target.closest('button')) {
          this.sound.unlock();
          e.target.closest('button').blur();
        }
      });

      // Startup screen difficulty cards
      document.querySelectorAll('[data-diff]').forEach((card) => {
        on(card, 'click', () => {
          if (this.difficultySelect) this.difficultySelect.value = card.dataset.diff;
          this.syncStartCards();
          this.sound.playClick();
        });
      });

      // Startup screen primary mode cards (Campaign / Random Sector / Post Defense)
      document.querySelectorAll('[data-mode]').forEach((card) => {
        on(card, 'click', () => {
          const mode = card.dataset.mode;
          this.startMenuMode = mode;
          if (this.startLevelSelect) {
            if (mode === 'random') {
              this.startLevelSelect.value = 'random';
            } else if (mode === 'post_defense') {
              this.startLevelSelect.value = 'post_defense';
            } else {
              // Restore currently selected campaign sector card (1..4)
              const activeLvlCard = document.querySelector('#levelCards .level-card.selected');
              this.startLevelSelect.value = activeLvlCard ? activeLvlCard.dataset.level : '1';
            }
          }
          this.syncStartCards();
          this.sound.playClick();
        });
      });

      // Startup screen Campaign Sector sub-cards (1..4)
      document.querySelectorAll('[data-level]').forEach((card) => {
        on(card, 'click', () => {
          this.startMenuMode = 'campaign';
          if (this.startLevelSelect) this.startLevelSelect.value = card.dataset.level;
          this.syncStartCards();
          this.sound.playClick();
        });
      });

      on(this.difficultySelect, 'change', () => this.syncStartCards());
      on(this.startLevelSelect, 'change', () => {
        const v = this.startLevelSelect.value;
        this.startMenuMode = (v === 'random' || v === 'post_defense') ? v : 'campaign';
        this.syncStartCards();
      });

      on(this.btnStartMission, 'click', () => this.deployFromStartScreen());
      on(this.btnStartTutorial, 'click', () => this.startTutorial());
      on(this.btnSkipTutorial, 'click', () => this.returnToStartMenu());
      on(this.btnStartZombies, 'click', () => this.openZombieGuide());
      on(this.btnHowToPlay, 'click', () => this.openHowToPlay());
      on(this.btnCloseHowToPlay, 'click', () => this.closeHowToPlay());
      on(this.btnDismissHelp, 'click', () => this.closeHowToPlay());
      on(this.btnHudHelp, 'click', () => this.openHowToPlay());

      // Zombie Intel modal bindings
      on(this.btnHudZombies, 'click', () => {
        if (this.zombieGuideOpen) this.closeZombieGuide();
        else this.openZombieGuide();
      });
      on(this.btnCloseZombieGuide, 'click', () => this.closeZombieGuide());
      on(this.btnDismissZombieGuide, 'click', () => this.closeZombieGuide());

      // HUD controls
      on(this.levelSelect, 'change', () => {
        const val = this.levelSelect.value;
        if (val === 'tutorial') {
          this.startTutorial();
          return;
        } else if (val === 'random') {
          this.initLevel('random');
        } else if (val === 'post_defense') {
          this.postDefenseGrid = null;
          this.initLevel('post_defense');
        } else {
          const idx = Math.max(0, Math.min(LEVEL_MAPS.length - 1, (parseInt(val, 10) || 1) - 1));
          this.initLevel(idx);
        }
        if (this.waveState !== STATE.START_MENU) {
          this.waveState = STATE.PREPARE;
        }
        this.updateHUD();
        this.updateTimerHud();
      });

      on(this.btnResetLevel, 'click', () => this.resetCurrentLevel());
      on(this.btnHudMainMenu, 'click', () => {
        const now = performance.now();
        if (now < this.hudMenuConfirmUntil) {
          this.hudMenuConfirmUntil = 0;
          if (this.btnHudMainMenu) {
            this.btnHudMainMenu.innerText = 'Menu';
            this.btnHudMainMenu.classList.remove('confirming');
          }
          this.returnToStartMenu();
          return;
        }
        this.hudMenuConfirmUntil = now + 2500;
        if (this.btnHudMainMenu) {
          this.btnHudMainMenu.innerText = 'Confirm?';
          this.btnHudMainMenu.classList.add('confirming');
        }
        this.sound.playClick();
        this.showStatus('Click Menu again within 2.5s to return to Main Menu.');
        setTimeout(() => {
          if (performance.now() >= this.hudMenuConfirmUntil && this.btnHudMainMenu) {
            this.hudMenuConfirmUntil = 0;
            this.btnHudMainMenu.innerText = 'Menu';
            this.btnHudMainMenu.classList.remove('confirming');
          }
        }, 2550);
      });
      on(this.btnStartWave, 'click', () => this.triggerNextWaveEarly());
      on(this.btnPause, 'click', () => this.togglePause());

      on(this.btnSpeed, 'click', () => {
        this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
        if (this.btnSpeed) this.btnSpeed.innerText = `Speed: ${this.gameSpeed}x`;
        this.sound.playClick();
      });

      on(this.btnMute, 'click', () => this.toggleMute());

      // End modal buttons
      on(this.btnRestart, 'click', () => {
        if (this.isTutorialMode) {
          this.startTutorial();
          return;
        } else if (this.isPostDefenseMode) {
          this.initLevel('post_defense');
        } else if (this.isRandomMode) {
          this.initLevel('random');
        } else {
          this.initLevel(this.currentLevel);
        }
        this.waveState = STATE.PREPARE;
        this.updateHUD();
        this.updateTimerHud();
      });

      on(this.btnNextLevel, 'click', () => {
        if (this.isTutorialMode) {
          this.clearTutorial();
          this.initLevel(0);
        } else if (this.isPostDefenseMode) {
          this.postDefenseGrid = null;
          this.initLevel('post_defense');
        } else if (this.isRandomMode || this.currentLevel >= LEVEL_MAPS.length - 1) {
          this.initLevel('random');
        } else {
          this.initLevel(this.currentLevel + 1);
        }
        this.waveState = STATE.PREPARE;
        this.updateHUD();
        this.updateTimerHud();
      });

      on(this.btnMainMenu, 'click', () => this.returnToStartMenu());

      // Build panel buttons
      if (this.buildPanel) {
        this.buildPanel.querySelectorAll('[data-tool]').forEach((btn) => {
          on(btn, 'click', () => this.setBuildType(btn.dataset.tool));
        });
      }

      // Mobile 6-Tab Navigation Bar & Sub-Drawer buttons
      on(this.tabNextWave, 'click', () => {
        this.closeMobileSubDrawer();
        this.triggerNextWaveEarly();
      });

      on(this.tabPause, 'click', () => {
        this.togglePause();
      });

      on(this.tabSafeZone, 'click', () => {
        this.closeMobileSubDrawer();
        this.setBuildType('safezone');
      });

      on(this.tabWalls, 'click', () => {
        this.toggleMobileCategory('walls');
      });

      on(this.tabBuildings, 'click', () => {
        this.toggleMobileCategory('buildings');
      });

      on(this.tabTowers, 'click', () => {
        this.toggleMobileCategory('towers');
      });

      if (this.mobileSubDrawer) {
        this.mobileSubDrawer.querySelectorAll('[data-tool]').forEach((btn) => {
          on(btn, 'click', () => {
            this.setBuildType(btn.dataset.tool);
            this.closeMobileSubDrawer();
          });
        });
      }

      // Inspector buttons
      on(this.btnTrainUnit, 'click', () => this.trainFromSelectedBuilding(this.selectedStructure));
      on(this.btnCancelTrain, 'click', () => this.cancelLastQueuedTraining(this.selectedStructure));
      on(this.btnRelease, 'click', () => this.releaseGarrisonedUnits(this.selectedStructure));
      on(this.btnUpgrade, 'click', () => this.upgradeSelectedEntity());
      on(this.btnSalvage, 'click', () => this.salvageSelectedStructure(false));

      // Canvas mouse coordinates, drag-to-paint Safe Zones, line-drag Barricades & clicks
      on(this.canvas, 'mousedown', (e) => {
        if (e.button !== 0 || !this.inPlay || this.modalBlocking) return;
        if (this.selectedBuildType !== 'safezone' && this.selectedBuildType !== 'wall') return;
        const pt = this.screenToWorld(e.clientX, e.clientY);
        if (!pt || !inBounds(pt.col, pt.row)) return;
        if (this.selectedBuildType === 'safezone') {
          this.safeZoneDrag = { startCol: pt.col, startRow: pt.row, curCol: pt.col, curRow: pt.row };
        } else {
          this.wallDrag = { startCol: pt.col, startRow: pt.row, curCol: pt.col, curRow: pt.row };
        }
      });

      on(this.canvas, 'mousemove', (e) => {
        const pt = this.screenToWorld(e.clientX, e.clientY);
        if (!pt) return;
        this.mousePos.x = pt.x;
        this.mousePos.y = pt.y;
        this.mouseTile.col = pt.col;
        this.mouseTile.row = pt.row;
        if (this.safeZoneDrag) {
          this.safeZoneDrag.curCol = Math.max(0, Math.min(COLS - 1, this.mouseTile.col));
          this.safeZoneDrag.curRow = Math.max(0, Math.min(ROWS - 1, this.mouseTile.row));
        }
        if (this.wallDrag) {
          this.wallDrag.curCol = Math.max(0, Math.min(COLS - 1, this.mouseTile.col));
          this.wallDrag.curRow = Math.max(0, Math.min(ROWS - 1, this.mouseTile.row));
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        if (this.safeZoneDrag) {
          const drag = this.safeZoneDrag;
          this.safeZoneDrag = null;
          this.suppressNextClick = true;
          if (this.inPlay && !this.modalBlocking && this.selectedBuildType === 'safezone') {
            this.executeSafeZoneDragPurchase(drag.startCol, drag.startRow, drag.curCol, drag.curRow);
          }
          return;
        }
        if (this.wallDrag) {
          const drag = this.wallDrag;
          this.wallDrag = null;
          this.suppressNextClick = true;
          if (this.inPlay && !this.modalBlocking && this.selectedBuildType === 'wall') {
            this.executeWallLineDragPurchase(drag.startCol, drag.startRow, drag.curCol, drag.curRow);
          }
        }
      });

      on(this.canvas, 'mouseleave', () => {
        this.mouseTile.col = -1;
        this.mouseTile.row = -1;
      });

      on(this.canvas, 'click', (e) => {
        if (this.suppressNextClick) {
          this.suppressNextClick = false;
          return;
        }
        this.sound.unlock();
        if (this.activeMobileCategory) this.closeMobileSubDrawer();
        const pt = this.screenToWorld(e.clientX, e.clientY);
        if (!pt) return;
        this.handleCanvasClick(pt.x, pt.y);
      });

      on(this.canvas, 'contextmenu', (e) => {
        e.preventDefault();
        if (this.inPlay) this.clearSelection();
      });

      // Unified touch panning, pinch-to-zoom, tap-to-act & drag-to-paint
      if (this.canvas) {
        const getTouchCanvasPoint = (touch) => {
          const rect = this.canvas.getBoundingClientRect();
          if (!rect || rect.width <= 0 || rect.height <= 0) return null;
          return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height),
            scaleX: this.canvas.width / rect.width,
            scaleY: this.canvas.height / rect.height
          };
        };

        this.canvas.addEventListener('touchstart', (e) => {
          if (!this.inPlay || this.modalBlocking) return;
          e.preventDefault();
          this.sound.unlock();
          if (!this.isMobileTouch) {
            this.isMobileTouch = true;
            this.updateMobileMode();
          }
          if (this.activeMobileCategory) {
            this.closeMobileSubDrawer();
          }

          if (e.touches.length >= 2) {
            this.safeZoneDrag = null;
            this.wallDrag = null;
            this.touchState.active = true;
            this.touchState.pinching = true;
            this.touchState.panning = false;
            this.touchState.moved = true;
            this.suppressNextClick = true;
            const p0 = getTouchCanvasPoint(e.touches[0]);
            const p1 = getTouchCanvasPoint(e.touches[1]);
            if (p0 && p1) {
              this.touchState.prevPinchDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
              this.touchState.prevPinchMidX = (p0.x + p1.x) * 0.5;
              this.touchState.prevPinchMidY = (p0.y + p1.y) * 0.5;
            }
            return;
          }

          if (e.touches.length === 1) {
            const t0 = e.touches[0];
            const pt = this.screenToWorld(t0.clientX, t0.clientY);
            if (!pt) return;
            this.mousePos.x = pt.x;
            this.mousePos.y = pt.y;
            this.mouseTile.col = pt.col;
            this.mouseTile.row = pt.row;

            this.touchState.active = true;
            this.touchState.pinching = false;
            this.touchState.panning = false;
            this.touchState.moved = false;
            this.touchState.startX = t0.clientX;
            this.touchState.startY = t0.clientY;
            this.touchState.lastX = t0.clientX;
            this.touchState.lastY = t0.clientY;
            this.touchState.startTime = performance.now();

            if ((this.selectedBuildType === 'safezone' || this.selectedBuildType === 'wall') && inBounds(pt.col, pt.row)) {
              if (this.selectedBuildType === 'safezone') {
                this.safeZoneDrag = { startCol: pt.col, startRow: pt.row, curCol: pt.col, curRow: pt.row };
              } else {
                this.wallDrag = { startCol: pt.col, startRow: pt.row, curCol: pt.col, curRow: pt.row };
              }
            }
          }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
          if (!this.inPlay || this.modalBlocking || !this.touchState.active) return;
          e.preventDefault();

          if (e.touches.length >= 2) {
            this.safeZoneDrag = null;
            this.wallDrag = null;
            this.touchState.pinching = true;
            this.touchState.moved = true;
            const p0 = getTouchCanvasPoint(e.touches[0]);
            const p1 = getTouchCanvasPoint(e.touches[1]);
            if (p0 && p1) {
              const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
              const midX = (p0.x + p1.x) * 0.5;
              const midY = (p0.y + p1.y) * 0.5;
              if (this.touchState.prevPinchDist > 8) {
                const factor = dist / this.touchState.prevPinchDist;
                this.setCameraZoom(this.camera.zoom * factor, midX, midY);
              }
              this.camera.panX += midX - this.touchState.prevPinchMidX;
              this.camera.panY += midY - this.touchState.prevPinchMidY;
              this.clampCamera();
              this.touchState.prevPinchDist = dist;
              this.touchState.prevPinchMidX = midX;
              this.touchState.prevPinchMidY = midY;
            }
            return;
          }

          if (e.touches.length === 1 && !this.touchState.pinching) {
            const t0 = e.touches[0];
            const pt = this.screenToWorld(t0.clientX, t0.clientY);
            if (pt) {
              this.mousePos.x = pt.x;
              this.mousePos.y = pt.y;
              this.mouseTile.col = pt.col;
              this.mouseTile.row = pt.row;
            }

            if (this.safeZoneDrag && pt) {
              this.touchState.moved = true;
              this.safeZoneDrag.curCol = Math.max(0, Math.min(COLS - 1, pt.col));
              this.safeZoneDrag.curRow = Math.max(0, Math.min(ROWS - 1, pt.row));
              return;
            }
            if (this.wallDrag && pt) {
              this.touchState.moved = true;
              this.wallDrag.curCol = Math.max(0, Math.min(COLS - 1, pt.col));
              this.wallDrag.curRow = Math.max(0, Math.min(ROWS - 1, pt.row));
              return;
            }

            const distFromStart = Math.hypot(t0.clientX - this.touchState.startX, t0.clientY - this.touchState.startY);
            if (distFromStart > 10) {
              this.touchState.panning = true;
              this.touchState.moved = true;
            }
            if (this.touchState.panning && this.canPanCamera()) {
              const rect = this.canvas.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const dx = (t0.clientX - this.touchState.lastX) * (this.canvas.width / rect.width);
                const dy = (t0.clientY - this.touchState.lastY) * (this.canvas.height / rect.height);
                this.camera.panX += dx;
                this.camera.panY += dy;
                this.clampCamera();
              }
            }
            this.touchState.lastX = t0.clientX;
            this.touchState.lastY = t0.clientY;
          }
        }, { passive: false });

        const finishTouch = (e) => {
          if (!this.touchState.active) return;
          e.preventDefault();

          if (e.touches && e.touches.length === 1 && this.touchState.pinching) {
            this.touchState.pinching = false;
            this.touchState.panning = false;
            this.touchState.moved = true;
            this.touchState.lastX = e.touches[0].clientX;
            this.touchState.lastY = e.touches[0].clientY;
            return;
          }

          if (!e.touches || e.touches.length === 0) {
            if (this.safeZoneDrag) {
              const drag = this.safeZoneDrag;
              this.safeZoneDrag = null;
              this.suppressNextClick = true;
              if (this.inPlay && !this.modalBlocking && this.selectedBuildType === 'safezone') {
                this.executeSafeZoneDragPurchase(drag.startCol, drag.startRow, drag.curCol, drag.curRow);
              }
            } else if (this.wallDrag) {
              const drag = this.wallDrag;
              this.wallDrag = null;
              this.suppressNextClick = true;
              if (this.inPlay && !this.modalBlocking && this.selectedBuildType === 'wall') {
                this.executeWallLineDragPurchase(drag.startCol, drag.startRow, drag.curCol, drag.curRow);
              }
            } else if (!this.touchState.moved && !this.touchState.pinching && !this.touchState.panning) {
              const changed = e.changedTouches && e.changedTouches[0];
              if (changed && this.inPlay && !this.modalBlocking) {
                const pt = this.screenToWorld(changed.clientX, changed.clientY);
                if (pt) {
                  this.suppressNextClick = true;
                  this.handleCanvasClick(pt.x, pt.y);
                }
              }
            }
            this.touchState.active = false;
            this.touchState.pinching = false;
            this.touchState.panning = false;
            this.touchState.moved = false;
          }
        };

        this.canvas.addEventListener('touchend', finishTouch, { passive: false });
        this.canvas.addEventListener('touchcancel', () => {
          this.safeZoneDrag = null;
          this.wallDrag = null;
          this.touchState.active = false;
          this.touchState.pinching = false;
          this.touchState.panning = false;
          this.touchState.moved = false;
        }, { passive: false });

        this.canvas.addEventListener('wheel', (e) => {
          if (!this.inPlay || this.modalBlocking) return;
          if (!e.ctrlKey && !this.isMobileTouch && this.camera.zoom <= 1.001) return;
          e.preventDefault();
          const rect = this.canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          const cx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
          const cy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
          const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
          this.setCameraZoom(this.camera.zoom * factor, cx, cy);
        }, { passive: false });
      }

      on(this.btnCamZoomIn, 'click', () => this.setCameraZoom(this.camera.zoom + 0.35));
      on(this.btnCamZoomOut, 'click', () => this.setCameraZoom(this.camera.zoom - 0.35));
      on(this.btnCamReset, 'click', () => this.setCameraZoom(1.0));
      on(this.btnCamFocusBase, 'click', () => this.focusCameraOnSafeZones(Math.max(1.6, this.camera.zoom)));

      const handleLayoutChange = () => this.updateMobileMode();
      window.addEventListener('resize', handleLayoutChange);
      if (window.matchMedia) {
        const mq = window.matchMedia('(max-width: 1024px), (pointer: coarse)');
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handleLayoutChange);
        else if (typeof mq.addListener === 'function') mq.addListener(handleLayoutChange);
      }

      const onStripScroll = () => this.refreshTutorialArrowPosition();
      on(this.topHud, 'scroll', onStripScroll);
      on(this.buildPanel, 'scroll', onStripScroll);
      on(this.inspectorSlot, 'scroll', onStripScroll);

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
          if (this.zombieGuideOpen) {
            this.closeZombieGuide();
          } else if (this.helpOpen) {
            this.closeHowToPlay();
          } else if (this.inPlay) {
            this.clearSelection();
          }
          return;
        }
        if (key === 'm') {
          this.toggleMute();
          return;
        }
        if (this.modalBlocking || !this.inPlay || e.repeat) return;

        if (key === 'q') this.quickConscript();
        else if (key === '1') this.setBuildType('wall');
        else if (key === '2') this.setBuildType('gate');
        else if (key === '3') this.setBuildType('bunker');
        else if (key === '4') this.setBuildType('barracks');
        else if (key === '5') this.setBuildType('engineering');
        else if (key === '6') this.setBuildType('habitat');
        else if (key === '7') this.setBuildType('safezone');
        else if (key === '8') this.setBuildType('sentry');
        else if (key === '9') this.setBuildType('cryo');
        else if (key === '0') this.setBuildType('sniper');
        else if (key === 'w') this.upgradeSelectedEntity();
        else if (key === 's') this.salvageSelectedStructure(true);
        else if (key === 'e') {
          if (this.selectedStructure && (this.selectedStructure.type === 'bunker' || this.selectedStructure.type === 'barracks' || this.selectedStructure.type === 'engineering')) {
            this.releaseGarrisonedUnits(this.selectedStructure);
          }
        } else if (key === ' ') {
          e.preventDefault();
          this.togglePause();
        }
      });
    }

    updateMobileMode() {
      const mq = window.matchMedia && window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
      this.isMobileTouch = Boolean(mq || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024));
      if (document.body) {
        document.body.classList.toggle('is-mobile-touch', this.isMobileTouch);
        document.body.classList.toggle(
          'is-mobile-landscape',
          this.isMobileTouch && window.innerWidth > window.innerHeight && window.innerHeight <= 520
        );
      }
      this.syncCanvasViewportSize();
      this.clampCamera();
      this.refreshTutorialArrowPosition();
    }

    syncCanvasViewportSize() {
      if (!this.canvas) return;
      if (this.isMobileTouch) {
        const host = this.viewportContainer || this.canvas;
        const rect = host.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = Math.max(1, Math.round(rect.width * dpr));
          const targetH = Math.max(1, Math.round(rect.height * dpr));
          if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
          }
        }
        this.camera.maxZoom = Math.max(2.8, this.getCoverZoom() * 2.2);
      } else {
        if (this.canvas.width !== WIDTH || this.canvas.height !== HEIGHT) {
          this.canvas.width = WIDTH;
          this.canvas.height = HEIGHT;
        }
        this.camera.maxZoom = 2.8;
      }
    }

    getFitScale() {
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      return Math.min(cw / WIDTH, ch / HEIGHT);
    }

    getCoverZoom() {
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      const fit = Math.min(cw / WIDTH, ch / HEIGHT);
      const cover = Math.max(cw / WIDTH, ch / HEIGHT);
      return fit > 0 ? cover / fit : 1;
    }

    getCameraScale() {
      return this.getFitScale() * this.camera.zoom;
    }

    canPanCamera() {
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      const s = this.getCameraScale();
      return WIDTH * s > cw + 1 || HEIGHT * s > ch + 1;
    }

    screenToWorld(clientX, clientY) {
      if (!this.canvas) return null;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return null;
      const canvasX = (clientX - rect.left) * (this.canvas.width / rect.width);
      const canvasY = (clientY - rect.top) * (this.canvas.height / rect.height);
      const s = this.getCameraScale();
      const worldX = (canvasX - this.camera.panX) / s;
      const worldY = (canvasY - this.camera.panY) / s;
      return {
        x: worldX,
        y: worldY,
        col: Math.floor(worldX / TILE_SIZE),
        row: Math.floor(worldY / TILE_SIZE),
        canvasX,
        canvasY
      };
    }

    clampCamera() {
      this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, this.camera.zoom));
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      if (this.camera.zoom <= 1.001) {
        this.camera.zoom = 1;
      }
      const s = this.getCameraScale();
      const worldW = WIDTH * s;
      const worldH = HEIGHT * s;
      if (worldW <= cw) {
        this.camera.panX = (cw - worldW) * 0.5;
      } else {
        this.camera.panX = Math.max(cw - worldW, Math.min(0, this.camera.panX));
      }
      if (worldH <= ch) {
        this.camera.panY = (ch - worldH) * 0.5;
      } else {
        this.camera.panY = Math.max(ch - worldH, Math.min(0, this.camera.panY));
      }
      if (this.btnCamReset) {
        this.btnCamReset.innerText = `${this.camera.zoom.toFixed(1)}x`;
      }
      if (this.cameraControls) {
        if (!this.isMobileTouch && this.camera.zoom > 1.001) {
          showEl(this.cameraControls, 'flex');
        } else {
          hideEl(this.cameraControls);
        }
      }
    }

    setCameraZoom(nextZoom, focusCanvasX = null, focusCanvasY = null) {
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      const fx = focusCanvasX === null ? cw * 0.5 : focusCanvasX;
      const fy = focusCanvasY === null ? ch * 0.5 : focusCanvasY;
      const oldS = this.getCameraScale();
      const worldFocusX = (fx - this.camera.panX) / oldS;
      const worldFocusY = (fy - this.camera.panY) / oldS;
      const clampedZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, nextZoom));
      this.camera.zoom = clampedZoom;
      const newS = this.getCameraScale();
      this.camera.panX = fx - worldFocusX * newS;
      this.camera.panY = fy - worldFocusY * newS;
      this.clampCamera();
    }

    centerCameraOnWorld(worldX, worldY, targetZoom = null) {
      if (targetZoom !== null) {
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, targetZoom));
      }
      const cw = this.canvas ? this.canvas.width : WIDTH;
      const ch = this.canvas ? this.canvas.height : HEIGHT;
      const s = this.getCameraScale();
      this.camera.panX = cw * 0.5 - worldX * s;
      this.camera.panY = ch * 0.5 - worldY * s;
      this.clampCamera();
    }

    focusCameraOnSafeZones(targetZoom = 1.6) {
      let sx = 0;
      let sy = 0;
      let count = 0;
      for (const sz of this.safeZones.values()) {
        sx += sz.x;
        sy += sz.y;
        count++;
      }
      const wx = count > 0 ? sx / count : WIDTH * 0.5;
      const wy = count > 0 ? sy / count : HEIGHT * 0.5;
      this.centerCameraOnWorld(wx, wy, targetZoom);
    }

    syncStartCards() {
      const diff = this.difficultySelect ? this.difficultySelect.value : 'normal';
      const lvl = this.startLevelSelect ? this.startLevelSelect.value : '1';
      if (lvl === 'random') this.startMenuMode = 'random';
      else if (lvl === 'post_defense') this.startMenuMode = 'post_defense';
      else this.startMenuMode = 'campaign';

      document.querySelectorAll('[data-diff]').forEach((c) => {
        c.classList.toggle('selected', c.dataset.diff === diff);
      });
      document.querySelectorAll('[data-mode]').forEach((c) => {
        c.classList.toggle('selected', c.dataset.mode === this.startMenuMode);
      });
      document.querySelectorAll('[data-level]').forEach((c) => {
        c.classList.toggle('selected', c.dataset.level === lvl);
      });
      if (this.campaignSectorPanel) {
        if (this.startMenuMode === 'campaign') {
          showEl(this.campaignSectorPanel, 'block');
        } else {
          hideEl(this.campaignSectorPanel);
        }
      }
    }

    // --- LIVE CANVAS PORTRAITS IN ZOMBIE BESTIARY (#zombieGuideModal) ---
    renderBestiaryPortraits() {
      const portraits = [
        { id: 'zPortraitWalker', type: 'walker', radius: 11, color: '#FF3333' },
        { id: 'zPortraitRunner', type: 'runner', radius: 9, color: '#FF7700' },
        { id: 'zPortraitTank', type: 'tank', radius: 15, color: '#990000' },
        { id: 'zPortraitDemolisher', type: 'demolisher', radius: 15, color: '#3B0910' },
        { id: 'zPortraitWrecker', type: 'wrecker', radius: 13, color: '#B833FF' }
      ];
      for (const p of portraits) {
        const cvs = document.getElementById(p.id);
        if (!cvs || !cvs.getContext) continue;
        const pctx = cvs.getContext('2d');
        pctx.clearRect(0, 0, cvs.width, cvs.height);
        drawZombieSprite(
          pctx,
          {
            type: p.type,
            x: cvs.width * 0.5,
            y: cvs.height * 0.5,
            radius: p.radius,
            color: p.color,
            angle: -Math.PI / 6
          },
          0.15
        );
      }
    }

    // --- MENUS & MODALS ---
    openHowToPlay() {
      if (this.helpOpen) return;
      if (this.zombieGuideOpen) this.closeZombieGuide();
      this.helpOpen = true;
      this.helpPausedGame = false;
      if (this.inPlay && !this.isPaused) {
        this.setPaused(true);
        this.helpPausedGame = true;
      }
      showEl(this.howToPlayModal, 'flex');
      this.updateTimerHud();
    }

    closeHowToPlay() {
      if (!this.helpOpen) return;
      this.helpOpen = false;
      hideEl(this.howToPlayModal);
      if (this.helpPausedGame && this.inPlay) {
        this.setPaused(false);
      }
      this.helpPausedGame = false;
      this.updateTimerHud();
    }

    openZombieGuide() {
      if (this.zombieGuideOpen) return;
      if (this.helpOpen) this.closeHowToPlay();
      this.zombieGuideOpen = true;
      this.zombieGuidePausedGame = false;
      if (this.inPlay && !this.isPaused) {
        this.setPaused(true);
        this.zombieGuidePausedGame = true;
      }
      this.renderBestiaryPortraits();
      showEl(this.zombieGuideModal, 'flex');
      if (this.btnHudZombies) this.btnHudZombies.classList.add('active');
      this.sound.playClick();
      this.updateTimerHud();
    }

    closeZombieGuide() {
      if (!this.zombieGuideOpen) return;
      this.zombieGuideOpen = false;
      hideEl(this.zombieGuideModal);
      if (this.btnHudZombies) this.btnHudZombies.classList.remove('active');
      if (this.zombieGuidePausedGame && this.inPlay) {
        this.setPaused(false);
      }
      this.zombieGuidePausedGame = false;
      this.updateTimerHud();
    }

    deployFromStartScreen() {
      this.sound.unlock();
      const diffVal = this.difficultySelect ? this.difficultySelect.value : 'normal';
      this.difficulty = DIFFICULTY_PRESETS[diffVal] ? diffVal : 'normal';
      const preset = DIFFICULTY_PRESETS[this.difficulty];
      this.zombieHpMult = preset.zombieHpMult;
      this.zombieSpeedMult = preset.zombieSpeedMult;
      this.infectionWindow = preset.infectionWindow;

      const rawLvl = this.startLevelSelect ? this.startLevelSelect.value : '1';
      if (rawLvl === 'tutorial') {
        this.startTutorial();
        return;
      } else if (rawLvl === 'random') {
        this.randomSectorCount = 0;
        this.initLevel('random');
      } else if (rawLvl === 'post_defense') {
        this.postDefenseGrid = null;
        this.initLevel('post_defense');
      } else {
        const startLvl = Math.max(0, Math.min(LEVEL_MAPS.length - 1, (parseInt(rawLvl, 10) || 1) - 1));
        this.initLevel(startLvl);
      }

      hideEl(this.startScreenOverlay);
      this.waveState = STATE.PREPARE;
      this.updateHUD();
      this.updateTimerHud();
      const modeDesc = this.isPostDefenseMode
        ? `Post Defense (${this.randomArchetype} - Endless Single-Outpost Siege)`
        : this.isRandomMode
        ? `Random Sector #${this.randomSectorCount} (${this.randomArchetype})`
        : `Sector ${this.currentLevel + 1}`;
      this.showStatus(`Mission deployed (${preset.name} - ${modeDesc}). Destroy all Red Spawn Breaches & defend Safe Zones!`);
      this.addFloatingText(`${preset.name.toUpperCase()} THREAT LEVEL`, WIDTH / 2, HEIGHT / 2 - 40, '#00FFFF');
    }

    returnToStartMenu() {
      this.clearTutorial();
      this.waveState = STATE.START_MENU;
      this.setPaused(false);
      this.clearSelection();
      hideEl(this.gameOverOverlay);
      this.syncStartCards();
      showEl(this.startScreenOverlay, 'flex');
      this.updateTimerHud();
      this.showStatus('Select threat level and mission mode, then start the mission.');
    }

    toggleMute() {
      this.sound.setMuted(!this.sound.muted);
      if (this.btnMute) {
        this.btnMute.innerHTML = this.sound.muted ? '&#128263;' : '&#128266;';
        this.btnMute.classList.toggle('muted', this.sound.muted);
      }
    }

    resetCurrentLevel() {
      if (!this.inPlay && this.waveState === STATE.START_MENU) return;
      this.sound.unlock();
      if (this.isTutorialMode) {
        this.startTutorial();
        return;
      } else if (this.isPostDefenseMode) {
        this.postDefenseGrid = null;
        this.initLevel('post_defense');
      } else if (this.isRandomMode) {
        this.initLevel('random');
      } else {
        this.initLevel(this.currentLevel);
      }
      this.waveState = STATE.PREPARE;
      this.updateHUD();
      this.updateTimerHud();
      this.sound.playClick();
    }

    // Roll 1 unified 3x3 (9-tile) green Safe Zone cluster on interior walkable ground (>= 5 Manhattan distance from any Spawn Breach)
    rollStartingSafeZoneClusters() {
      const spawns = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c] === 2 || this.grid[r][c] === 4) this.grid[r][c] = 0;
          if (this.grid[r][c] === 3) spawns.push([c, r]);
        }
      }

      const candidates = [];
      for (let r = 1; r <= ROWS - 4; r++) {
        for (let c = 1; c <= COLS - 4; c++) {
          let valid = true;
          for (let dr = 0; dr < 3 && valid; dr++) {
            for (let dc = 0; dc < 3 && valid; dc++) {
              const cc = c + dc;
              const rr = r + dr;
              if (this.grid[rr][cc] !== 0) {
                valid = false;
                break;
              }
              for (const [sc, sr] of spawns) {
                if (Math.abs(sc - cc) + Math.abs(sr - rr) < 5) {
                  valid = false;
                  break;
                }
              }
            }
          }
          if (valid) candidates.push({ c, r });
        }
      }

      const checkReachableFromSpawns = (cl) => {
        if (!cl) return false;
        const seen = new Uint8Array(TOTAL_CELLS);
        const q = [];
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            const cc = cl.c + dc;
            const rr = cl.r + dr;
            seen[rr * COLS + cc] = 1;
            q.push([cc, rr]);
          }
        }
        for (let h = 0; h < q.length; h++) {
          const [cx, cy] = q[h];
          for (let i = 0; i < 4; i++) {
            const nx = cx + BFS_DIRS[i][0];
            const ny = cy + BFS_DIRS[i][1];
            if (!inBounds(nx, ny)) continue;
            const idx = ny * COLS + nx;
            if (seen[idx] || this.grid[ny][nx] === 1) continue;
            seen[idx] = 1;
            q.push([nx, ny]);
          }
        }
        for (const [sc, sr] of spawns) {
          if (!seen[sr * COLS + sc]) return false;
        }
        return true;
      };

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      let picked = null;
      for (let attempt = 0; attempt < Math.min(30, candidates.length); attempt++) {
        if (checkReachableFromSpawns(candidates[attempt])) {
          picked = candidates[attempt];
          break;
        }
      }
      if (!picked && candidates.length > 0) {
        picked = candidates[0];
      }

      if (picked) {
        for (let dr = 0; dr < 3; dr++) {
          for (let dc = 0; dc < 3; dc++) {
            this.grid[picked.r + dr][picked.c + dc] = 2;
          }
        }
        return 1;
      }
      return 0;
    }

    minChebyshevDistToSafeZone(col, row) {
      let minDist = Infinity;
      for (const sz of this.safeZones.values()) {
        const d = Math.max(Math.abs(col - sz.col), Math.abs(row - sz.row));
        if (d < minDist) minDist = d;
      }
      return minDist;
    }

    isValidBarricadeTile(col, row) {
      if (!inBounds(col, row)) return false;
      const key = `${col},${row}`;
      if (this.structures.has(key)) return false;
      if (this.grid[row][col] === 2 && this.safeZones.has(key)) return true;
      if (this.grid[row][col] !== 0 || this.safeZones.has(key)) return false;
      return this.minChebyshevDistToSafeZone(col, row) <= 3;
    }

    canBuildBarricadeAt(col, row) {
      return this.isValidBarricadeTile(col, row);
    }

    countStructures(type) {
      let count = 0;
      for (const s of this.structures.values()) {
        if (s.type === type) count++;
      }
      return count;
    }

    getSafeZoneDmgMult() {
      return 1 + Math.min(0.50, this.safeZones.size * 0.01);
    }

    rollStartingBarricades(targetCount) {
      const candidates = [];
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          const key = `${c},${r}`;
          if (this.grid[r][c] === 0 && !this.structures.has(key) && !this.safeZones.has(key)) {
            const d = this.minChebyshevDistToSafeZone(c, r);
            if (d === 2 || d === 3) {
              candidates.push([c, r]);
            }
          }
        }
      }
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const checkSpawnsOpen = () => {
        if (this.safeZones.size === 0) return false;
        const seen = new Uint8Array(TOTAL_CELLS);
        const q = [];
        for (const sz of this.safeZones.values()) {
          const idx = sz.row * COLS + sz.col;
          seen[idx] = 1;
          q.push([sz.col, sz.row]);
        }
        let openEmpty = 0;
        for (let h = 0; h < q.length; h++) {
          const [cx, cy] = q[h];
          for (let i = 0; i < 4; i++) {
            const nx = cx + BFS_DIRS[i][0];
            const ny = cy + BFS_DIRS[i][1];
            if (!inBounds(nx, ny)) continue;
            const nIdx = ny * COLS + nx;
            const t = this.grid[ny][nx];
            if (seen[nIdx] || t === 1 || t === 4) continue;
            seen[nIdx] = 1;
            if (t === 0) openEmpty++;
            q.push([nx, ny]);
          }
        }
        if (openEmpty < 50) return false;
        for (const sp of this.spawns.values()) {
          if (!seen[sp.row * COLS + sp.col]) return false;
        }
        return true;
      };

      const wl = STRUCTURE_SPECS.wall.levels[0];
      let placed = 0;
      for (const [c, r] of candidates) {
        if (placed >= targetCount) break;
        this.grid[r][c] = 4;
        if (checkSpawnsOpen()) {
          const p = tileCenter(c, r);
          this.structures.set(`${c},${r}`, {
            id: Math.random().toString(36).slice(2, 11),
            type: 'wall',
            level: 1,
            hp: wl.hp,
            maxHp: wl.hp,
            col: c,
            row: r,
            x: p.x,
            y: p.y,
            kills: 0,
            invested: wl.cost,
            preplaced: true,
            flash: 0
          });
          placed++;
        } else {
          this.grid[r][c] = 0;
        }
      }
      return placed;
    }

    // --- LEVEL INITIALIZATION (Rolled Safe Zones & Destructible Spawn Breaches) ---
    initLevel(levelTarget) {
      if (levelTarget === 'tutorial') {
        this.isTutorialMode = true;
        this.isPostDefenseMode = false;
        this.isRandomMode = false;
        this.currentLevel = 0;
        this.tutorialStep = 1;
        this.grid = Array.from({ length: ROWS }, (_, r) =>
          Array.from({ length: COLS }, (__, c) => (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 ? 1 : 0))
        );
        for (let r = 10; r <= 12; r++) {
          for (let c = 14; c <= 16; c++) this.grid[r][c] = 2;
        }
        this.grid[11][10] = 3;
        if (this.levelSelect) this.levelSelect.value = 'tutorial';
        if (this.startLevelSelect) this.startLevelSelect.value = 'tutorial';
      } else {
        this.clearTutorial();
        if (levelTarget === 'post_defense') {
          this.isPostDefenseMode = true;
          this.isRandomMode = false;
          this.currentLevel = 3;
          if (!this.postDefenseGrid) {
            this.randomSectorCount += 1;
            const gen = generateRandomSector(this.randomSectorCount);
            this.postDefenseGrid = gen.grid.map((row) => [...row]);
            this.randomArchetype = gen.archetype;
          }
          this.grid = this.postDefenseGrid.map((row) => [...row]);
          if (this.levelSelect) this.levelSelect.value = 'post_defense';
          if (this.startLevelSelect) this.startLevelSelect.value = 'post_defense';
        } else if (levelTarget === 'random') {
          this.isRandomMode = true;
          this.isPostDefenseMode = false;
          this.randomSectorCount += 1;
          this.currentLevel = 3;
          const gen = generateRandomSector(this.randomSectorCount);
          this.grid = gen.grid;
          this.randomArchetype = gen.archetype;
          if (this.levelSelect) this.levelSelect.value = 'random';
          if (this.startLevelSelect) this.startLevelSelect.value = 'random';
        } else {
          this.isRandomMode = false;
          this.isPostDefenseMode = false;
          this.currentLevel = Math.max(0, Math.min(LEVEL_MAPS.length - 1, Number(levelTarget) || 0));
          if (this.levelSelect) this.levelSelect.value = String(this.currentLevel + 1);
          if (this.startLevelSelect) this.startLevelSelect.value = String(this.currentLevel + 1);
          this.grid = LEVEL_MAPS[this.currentLevel].map((row) => [...row]);
        }
      }

      this.structures.clear();
      this.safeZones.clear();
      this.spawns.clear();
      this.sealedSpawns = [];
      this.civilians = [];
      this.soldiers = [];
      this.engineers = [];
      this.zombies = [];
      this.projectiles = [];
      this.particles = [];
      this.pulseRings = [];
      this.floatingTexts = [];

      const preset = DIFFICULTY_PRESETS[this.difficulty] || DIFFICULTY_PRESETS.normal;
      this.scrap = this.isTutorialMode ? 260 : preset.startingScrap;
      this.score = 0;
      this.savedCount = 0;
      this.infectedCount = 0;
      this.baseIntegrity = 100;

      this.elapsedTime = 0;
      this.threatMult = 1.0;
      this.hordeScale = { hp: 1.0, dmg: 1.0, speed: 1.0, weakened: false };
      this.breachCivTimer = 16.0 + Math.random() * 5.0;

      this.wave = 0;
      this.totalWaves = this.isEndlessMode ? Infinity : this.isTutorialMode ? 1 : 5;
      this.nextWaveTimer = this.isTutorialMode ? 999.0 : 20.0;
      this.waveSpawnQueue = [];
      this.spawnTimer = 0;

      this.setPaused(false);
      this.clearSelection();
      hideEl(this.gameOverOverlay);

      const wl = STRUCTURE_SPECS.wall.levels[0];
      const szLv1 = STRUCTURE_SPECS.safezone.levels[0];
      const breachHp = this.isTutorialMode ? 240 : 600 + (this.isEndlessMode ? Math.max(0, this.randomSectorCount - 1) * 150 : this.currentLevel * 150);

      // Clear template safe zones & randomly roll 1 unified 3x3 (9-tile) Safe Zone cluster (standard maps)
      const rolledClusters = this.isTutorialMode ? 1 : this.rollStartingSafeZoneClusters();

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const t = this.grid[r][c];
          const p = tileCenter(c, r);
          if (t === 4) {
            this.structures.set(`${c},${r}`, {
              type: 'wall',
              level: 1,
              hp: wl.hp,
              maxHp: wl.hp,
              col: c,
              row: r,
              x: p.x,
              y: p.y,
              kills: 0,
              invested: wl.cost,
              preplaced: true,
              flash: 0
            });
          } else if (t === 2) {
            this.safeZones.set(`${c},${r}`, {
              id: Math.random().toString(36).slice(2, 11),
              type: 'safezone',
              level: 1,
              hp: szLv1.hp,
              maxHp: szLv1.hp,
              col: c,
              row: r,
              x: p.x,
              y: p.y,
              invested: szLv1.cost,
              preplaced: true,
              flash: 0
            });
          } else if (t === 3) {
            this.spawns.set(`${c},${r}`, {
              type: 'spawn',
              col: c,
              row: r,
              x: p.x,
              y: p.y,
              hp: breachHp,
              maxHp: breachHp,
              flash: 0,
              timeSinceHit: 99,
              isRegenerating: false
            });
          }
        }
      }

      if (!this.isTutorialMode) {
        const initWallsTarget = 8 + this.currentLevel * 2;
        this.rollStartingBarricades(initWallsTarget);
      }
      this.initialSpawnCount = Math.max(1, this.spawns.size);
      const initCivCount = this.isTutorialMode ? 2 : this.isEndlessMode ? 10 : 8 + this.currentLevel * 2;
      this.spawnInitialCivilians(initCivCount);
      this.civTotal = this.civilians.length;

      this.recalcBaseIntegrity();
      this.updateHUD();
      this.updateTimerHud();
      if (this.isTutorialMode) {
        this.showStatus('Tutorial active! Follow the glowing spotlight arrows on screen & map.');
      } else if (this.isPostDefenseMode) {
        this.showStatus(`Post Defense (${this.randomArchetype}, 3x3 Safe Zone) active!`);
      } else if (this.isRandomMode) {
        this.showStatus(`Random Sector #${this.randomSectorCount} (${this.randomArchetype}, 3x3 Safe Zone) ready!`);
      } else {
        this.showStatus(`Sector ${this.currentLevel + 1} loaded (${rolledClusters}x 3x3 Safe Zone). Destroy all Red Spawn Breaches!`);
      }
      if (this.isMobileTouch) {
        this.syncCanvasViewportSize();
        const startZoom = Math.min(this.camera.maxZoom, Math.max(1.45, this.getCoverZoom()));
        this.focusCameraOnSafeZones(startZoom);
      } else {
        this.setCameraZoom(1.0);
      }
    }

    startTutorial() {
      this.sound.unlock();
      this.difficulty = 'normal';
      const preset = DIFFICULTY_PRESETS.normal;
      this.zombieHpMult = preset.zombieHpMult;
      this.zombieSpeedMult = preset.zombieSpeedMult;
      this.infectionWindow = preset.infectionWindow;
      this.initLevel('tutorial');
      hideEl(this.startScreenOverlay);
      this.waveState = STATE.PREPARE;
      this.updateTutorial();
      this.updateHUD();
      this.updateTimerHud();
      this.sound.playClick();
    }

    clearTutorial(keepMode = false) {
      if (!keepMode) this.isTutorialMode = false;
      this.tutorialStep = 0;
      this.setTutorialPulse(null);
      if (this.tutorialOverlay) hideEl(this.tutorialOverlay);
      if (this.tutorialUiArrow) hideEl(this.tutorialUiArrow);
      if (this.gameContainer) this.gameContainer.classList.remove('tutorial-active');
    }

    toggleMobileCategory(cat) {
      if (!this.inPlay) return;
      if (this.activeMobileCategory === cat) {
        this.closeMobileSubDrawer();
      } else {
        this.openMobileCategory(cat);
      }
      this.sound.playClick();
    }

    openMobileCategory(cat) {
      this.activeMobileCategory = cat;
      if (this.mobileSubDrawer) showEl(this.mobileSubDrawer, 'block');
      if (this.subGroupWalls) {
        if (cat === 'walls') showEl(this.subGroupWalls, 'block');
        else hideEl(this.subGroupWalls);
      }
      if (this.subGroupBuildings) {
        if (cat === 'buildings') showEl(this.subGroupBuildings, 'block');
        else hideEl(this.subGroupBuildings);
      }
      if (this.subGroupTowers) {
        if (cat === 'towers') showEl(this.subGroupTowers, 'block');
        else hideEl(this.subGroupTowers);
      }
      if (this.tabWalls) this.tabWalls.setAttribute('aria-expanded', cat === 'walls' ? 'true' : 'false');
      if (this.tabBuildings) this.tabBuildings.setAttribute('aria-expanded', cat === 'buildings' ? 'true' : 'false');
      if (this.tabTowers) this.tabTowers.setAttribute('aria-expanded', cat === 'towers' ? 'true' : 'false');
      this.updateBuildPanelUI();
      this.refreshTutorialArrowPosition();
    }

    closeMobileSubDrawer() {
      this.activeMobileCategory = null;
      if (this.mobileSubDrawer) hideEl(this.mobileSubDrawer);
      if (this.subGroupWalls) hideEl(this.subGroupWalls);
      if (this.subGroupBuildings) hideEl(this.subGroupBuildings);
      if (this.subGroupTowers) hideEl(this.subGroupTowers);
      if (this.tabWalls) this.tabWalls.setAttribute('aria-expanded', 'false');
      if (this.tabBuildings) this.tabBuildings.setAttribute('aria-expanded', 'false');
      if (this.tabTowers) this.tabTowers.setAttribute('aria-expanded', 'false');
      this.updateBuildPanelUI();
      this.refreshTutorialArrowPosition();
    }

    setTutorialPulse(elId, arrowLabel = 'CLICK') {
      if (this.tutorialPulseElId) {
        const prev = document.getElementById(this.tutorialPulseElId);
        if (prev) prev.classList.remove('tutorial-pulse');
      }
      this.tutorialPulseElId = elId || null;
      this.tutorialArrowLabel = arrowLabel || 'CLICK';
      if (this.tutorialPulseElId) {
        let targetEl = document.getElementById(this.tutorialPulseElId);
        if (this.isMobileTouch && targetEl) {
          // Map desktop build tool button to mobile tab if sub-menu is closed
          const toolToCategory = {
            toolWall: { tabId: 'tabWalls', cat: 'walls' },
            toolGate: { tabId: 'tabWalls', cat: 'walls' },
            toolBunker: { tabId: 'tabBuildings', cat: 'buildings' },
            toolBarracks: { tabId: 'tabBuildings', cat: 'buildings' },
            toolEngineering: { tabId: 'tabBuildings', cat: 'buildings' },
            toolHabitat: { tabId: 'tabBuildings', cat: 'buildings' },
            toolSafezone: { tabId: 'tabSafeZone', cat: null },
            btnStartWave: { tabId: 'tabNextWave', cat: null },
            toolSentry: { tabId: 'tabTowers', cat: 'towers' },
            toolCryo: { tabId: 'tabTowers', cat: 'towers' },
            toolSniper: { tabId: 'tabTowers', cat: 'towers' }
          };
          const mapping = toolToCategory[this.tutorialPulseElId];
          if (mapping) {
            if (mapping.cat && this.activeMobileCategory !== mapping.cat) {
              targetEl = document.getElementById(mapping.tabId) || targetEl;
            } else if (mapping.cat && this.activeMobileCategory === mapping.cat) {
              const subItem = this.mobileSubDrawer ? this.mobileSubDrawer.querySelector(`[data-tool="${targetEl.dataset.tool}"]`) : null;
              if (subItem) targetEl = subItem;
            } else if (mapping.tabId) {
              targetEl = document.getElementById(mapping.tabId) || targetEl;
            }
          }
        }
        if (targetEl && !targetEl.classList.contains('hidden')) {
          targetEl.classList.add('tutorial-pulse');
          if (this.isMobileTouch && typeof targetEl.scrollIntoView === 'function') {
            targetEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
          }
        }
      }
      this.refreshTutorialArrowPosition();
    }

    refreshTutorialArrowPosition() {
      const arrowEl = this.tutorialUiArrow;
      if (!arrowEl) return;
      if (this.tutorialPulseElId && this.isTutorialMode && this.inPlay) {
        let next = document.getElementById(this.tutorialPulseElId);
        if (this.isMobileTouch && next) {
          const toolToCategory = {
            toolWall: { tabId: 'tabWalls', cat: 'walls' },
            toolGate: { tabId: 'tabWalls', cat: 'walls' },
            toolBunker: { tabId: 'tabBuildings', cat: 'buildings' },
            toolBarracks: { tabId: 'tabBuildings', cat: 'buildings' },
            toolEngineering: { tabId: 'tabBuildings', cat: 'buildings' },
            toolHabitat: { tabId: 'tabBuildings', cat: 'buildings' },
            toolSafezone: { tabId: 'tabSafeZone', cat: null },
            btnStartWave: { tabId: 'tabNextWave', cat: null },
            toolSentry: { tabId: 'tabTowers', cat: 'towers' },
            toolCryo: { tabId: 'tabTowers', cat: 'towers' },
            toolSniper: { tabId: 'tabTowers', cat: 'towers' }
          };
          const mapping = toolToCategory[this.tutorialPulseElId];
          if (mapping) {
            if (mapping.cat && this.activeMobileCategory !== mapping.cat) {
              next = document.getElementById(mapping.tabId) || next;
            } else if (mapping.cat && this.activeMobileCategory === mapping.cat) {
              const subItem = this.mobileSubDrawer ? this.mobileSubDrawer.querySelector(`[data-tool="${next.dataset.tool}"]`) : null;
              if (subItem) next = subItem;
            } else if (mapping.tabId) {
              next = document.getElementById(mapping.tabId) || next;
            }
          }
        }
        if (next && !next.classList.contains('hidden') && typeof next.getBoundingClientRect === 'function') {
          const rect = next.getBoundingClientRect();
          if (rect && (rect.width > 0 || rect.height > 0)) {
            const cx = rect.left + rect.width * 0.5;
            const pointUp = rect.top < 90;
            arrowEl.classList.toggle('arrow-up', pointUp);
            arrowEl.style.left = `${Math.round(cx)}px`;
            arrowEl.style.top = pointUp ? `${Math.round(rect.bottom + 6)}px` : `${Math.round(rect.top - 42)}px`;
            if (this.tutorialUiArrowText) this.tutorialUiArrowText.innerText = this.tutorialArrowLabel || 'CLICK';
            if (this.tutorialUiArrowGlyph) this.tutorialUiArrowGlyph.innerHTML = pointUp ? '&#9650;' : '&#9660;';
            showEl(arrowEl, 'flex');
            return;
          }
        }
      }
      hideEl(arrowEl);
    }

    getTutorialStepMeta() {
      const hab = [...this.structures.values()].find((s) => s.type === 'habitat');
      const engHub = [...this.structures.values()].find((s) => s.type === 'engineering');
      const barHub = [...this.structures.values()].find((s) => s.type === 'barracks');
      const hasHabitat = !!hab;
      const hasEng = !!engHub;
      const hasBar = !!barHub;
      const habSelected = hasHabitat && this.selectedStructure === hab;
      const engSelected = hasEng && this.selectedStructure === engHub;
      const barSelected = hasBar && this.selectedStructure === barHub;
      const waveLive = this.wave >= 1;
      const steps = {
        1: {
          icon: '&#10010;',
          title: 'Click [7] Safe Zone \u2192 Paint 3 Tiles',
          body: 'Expand <b>Safe Zone ($10, Key 7)</b> onto the highlighted green tiles.',
          pulse: 'toolSafezone',
          arrowLabel: 'KEY 7',
          tiles: [[13, 10], [13, 11], [13, 12]],
          tileLabel: 'PAINT 3 TILES'
        },
        2: {
          icon: '&#9646;',
          title: 'Click [1] Barricade \u2192 Drag Wall Line',
          body: 'Drag <b>Barricade ($10, Key 1)</b> across the highlighted wall line.',
          pulse: 'toolWall',
          arrowLabel: 'KEY 1',
          tiles: [[11, 10], [11, 11], [11, 12]],
          tileLabel: 'BUILD WALL'
        },
        3: {
          icon: '&#9881;',
          title: 'Click [8] Sentry \u2192 Place on Tile',
          body: 'Place <b>Sentry ($150, Key 8)</b> on the highlighted Safe Zone tile.',
          pulse: 'toolSentry',
          arrowLabel: 'KEY 8',
          tiles: [[13, 11]],
          tileLabel: 'PLACE SENTRY'
        },
        4: {
          icon: '&#8962;',
          title: hasHabitat
            ? (habSelected ? 'Click [Train Civilian $65] Below' : 'Click Habitat \u2192 Train Civilian')
            : 'Click [6] Habitat \u2192 Place on Tile',
          body: hasHabitat
            ? 'Click <b>Recruit Civilian ($65)</b> inside your selected <b>Habitat</b>.'
            : 'Place <b>Habitat ($110, Key 6)</b> on the highlighted green tile.',
          pulse: hasHabitat ? (habSelected ? 'btnTrainUnit' : null) : 'toolHabitat',
          arrowLabel: hasHabitat ? 'RECRUIT' : 'KEY 6',
          tiles: hasHabitat ? [[hab.col, hab.row]] : [[15, 10]],
          tileLabel: hasHabitat ? (habSelected ? 'HABITAT READY' : 'CLICK HABITAT') : 'PLACE HABITAT'
        },
        5: {
          icon: '&#9881;',
          title: hasEng
            ? (engSelected ? 'Click [Train Engineer $50] Below' : 'Click Engineering \u2192 Train Engineer')
            : 'Click [5] Engineering \u2192 Place on Tile',
          body: hasEng
            ? 'Click <b>Train Engineer ($50)</b> for automatic $0 base welding.'
            : 'Place <b>Engineering ($90, Key 5)</b> on the highlighted green tile.',
          pulse: hasEng ? (engSelected ? 'btnTrainUnit' : null) : 'toolEngineering',
          arrowLabel: hasEng ? 'TRAIN ENG' : 'KEY 5',
          tiles: hasEng ? [[engHub.col, engHub.row]] : [[15, 11]],
          tileLabel: hasEng ? (engSelected ? 'ENGINEERING' : 'CLICK HUB') : 'PLACE ENGINEERING'
        },
        6: {
          icon: '&#9874;',
          title: hasBar
            ? (barSelected ? 'Click [Train Commando $75] Below' : 'Click Barracks \u2192 Train Commando')
            : 'Click [4] Barracks \u2192 Place on Tile',
          body: hasBar
            ? 'Click <b>Train Commando ($75)</b> \u2014 only Commandos destroy Breaches!'
            : 'Place <b>Barracks ($80, Key 4)</b> on the highlighted green tile.',
          pulse: hasBar ? (barSelected ? 'btnTrainUnit' : null) : 'toolBarracks',
          arrowLabel: hasBar ? 'TRAIN CMD' : 'KEY 4',
          tiles: hasBar ? [[barHub.col, barHub.row]] : [[15, 12]],
          tileLabel: hasBar ? (barSelected ? 'BARRACKS' : 'CLICK BARRACKS') : 'PLACE BARRACKS'
        },
        7: {
          icon: '&#9654;',
          title: waveLive ? 'Commandos Auto-Destroy Red Breach!' : 'Press [\u25B6 Next Wave] \u2014 Commandos Destroy Breaches!',
          body: 'Press <b>&#9654; Next Wave</b>! Commandos auto-deploy &amp; destroy the Red Breach.',
          pulse: waveLive ? null : 'btnStartWave',
          arrowLabel: 'START WAVE',
          tiles: [[10, 11]],
          tileLabel: waveLive ? 'COMMANDO TARGET' : 'RED BREACH'
        }
      };
      return steps[this.tutorialStep] || null;
    }

    updateTutorial() {
      if (!this.isTutorialMode || !this.inPlay) {
        if (this.tutorialOverlay && !this.isTutorialMode) hideEl(this.tutorialOverlay);
        if (this.gameContainer) this.gameContainer.classList.remove('tutorial-active');
        this.setTutorialPulse(null);
        return;
      }

      const ensureScrap = (minAmt) => {
        if (this.scrap < minAmt) {
          const grant = minAmt - this.scrap + 40;
          this.scrap += grant;
          this.addFloatingText(`+$${grant} Training Grant`, WIDTH / 2, 130, '#00E08A');
          this.updateHUD();
        }
      };

      const hab = [...this.structures.values()].find((s) => s.type === 'habitat');
      const engHub = [...this.structures.values()].find((s) => s.type === 'engineering');
      const barHub = [...this.structures.values()].find((s) => s.type === 'barracks');

      if (this.tutorialStep === 1 && this.safeZones.size >= 10) {
        this.tutorialStep = 2;
        ensureScrap(180);
      } else if (this.tutorialStep === 2 && this.countStructures('wall') >= 1) {
        this.tutorialStep = 3;
        ensureScrap(180);
      } else if (this.tutorialStep === 3 && this.countStructures('sentry') >= 1) {
        this.tutorialStep = 4;
        ensureScrap(200);
      } else if (
        this.tutorialStep === 4 &&
        hab &&
        ((hab.trainQueue && hab.trainQueue.length >= 1) || (hab.trainTimer || 0) > 0 || (hab.spawnedCivs || 0) >= 1)
      ) {
        this.tutorialStep = 5;
        ensureScrap(180);
      } else if (
        this.tutorialStep === 5 &&
        engHub &&
        (this.engineers.length >= 1 ||
          (engHub.occupants && engHub.occupants.some((u) => u.unitType === 'engineer')) ||
          (engHub.activeTrainers && engHub.activeTrainers.length >= 1) ||
          (engHub.trainQueue && engHub.trainQueue.length >= 1))
      ) {
        this.tutorialStep = 6;
        ensureScrap(180);
      } else if (
        this.tutorialStep === 6 &&
        barHub &&
        (this.soldiers.some((s) => s.isCommando) ||
          (barHub.occupants && barHub.occupants.some((u) => u.isCommando)) ||
          (barHub.activeTrainers && barHub.activeTrainers.length >= 1) ||
          (barHub.trainQueue && barHub.trainQueue.length >= 1))
      ) {
        this.tutorialStep = 7;
        this.nextWaveTimer = 20.0;
      }

      if (this.gameContainer) this.gameContainer.classList.add('tutorial-active');
      const meta = this.getTutorialStepMeta();
      if (meta && this.tutorialOverlay) {
        showEl(this.tutorialOverlay, 'block');
        if (this.tutorialStepBadge) this.tutorialStepBadge.innerText = `Step ${this.tutorialStep} / 7`;
        if (this.tutorialIcon) this.tutorialIcon.innerHTML = meta.icon || '&#9733;';
        if (this.tutorialTitle) this.tutorialTitle.innerText = meta.title;
        if (this.tutorialBody) this.tutorialBody.innerHTML = meta.body || '';
        this.setTutorialPulse(meta.pulse, meta.arrowLabel || 'CLICK');
      }
    }

    renderTutorialHighlights(ctx, t) {
      if (!this.isTutorialMode || !this.inPlay) return;
      const meta = this.getTutorialStepMeta();
      if (!meta || !meta.tiles || meta.tiles.length === 0) {
        ctx.fillStyle = 'rgba(3, 6, 12, 0.62)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        return;
      }

      let minC = Infinity;
      let minR = Infinity;
      let maxC = -Infinity;
      let maxR = -Infinity;
      for (const [c, r] of meta.tiles) {
        if (c < minC) minC = c;
        if (r < minR) minR = r;
        if (c > maxC) maxC = c;
        if (r > maxR) maxR = r;
      }
      const pad = 4;
      const hx = Math.max(0, minC * TILE_SIZE - pad);
      const hy = Math.max(0, minR * TILE_SIZE - pad);
      const hr = Math.min(WIDTH, (maxC + 1) * TILE_SIZE + pad);
      const hb = Math.min(HEIGHT, (maxR + 1) * TILE_SIZE + pad);

      // Spotlight dimming backdrop (~62% before wave launches; lighter 0.25 mask during active Wave 1 fight)
      const dimAlpha = (this.tutorialStep >= 7 && this.wave >= 1) ? 0.25 : 0.62;
      ctx.fillStyle = `rgba(3, 6, 12, ${dimAlpha})`;
      if (hy > 0) ctx.fillRect(0, 0, WIDTH, hy);
      if (hb < HEIGHT) ctx.fillRect(0, hb, WIDTH, HEIGHT - hb);
      if (hx > 0) ctx.fillRect(0, hy, hx, hb - hy);
      if (hr < WIDTH) ctx.fillRect(hr, hy, WIDTH - hr, hb - hy);

      const pulse = 0.55 + 0.35 * Math.sin(t * 6);
      for (const [c, r] of meta.tiles) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        ctx.fillStyle = `rgba(0, 229, 255, ${(0.16 * pulse).toFixed(3)})`;
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeStyle = `rgba(255, 210, 63, ${(0.95 * pulse).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
      ctx.lineWidth = 1;

      // Animated bouncing battlefield pointer arrow + compact tag directly above target tiles
      const bounce = Math.abs(Math.sin(t * 5.5)) * 10;
      const ax = (hx + hr) * 0.5;
      const ay = Math.max(58, hy - 8 - bounce);
      ctx.save();
      ctx.fillStyle = '#FFD23F';
      ctx.strokeStyle = '#071019';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - 11, ay - 14);
      ctx.lineTo(ax - 4, ay - 14);
      ctx.lineTo(ax - 4, ay - 26);
      ctx.lineTo(ax + 4, ay - 26);
      ctx.lineTo(ax + 4, ay - 14);
      ctx.lineTo(ax + 11, ay - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (meta.tileLabel) {
        ctx.font = 'bold 11px Consolas, monospace';
        const tw = ctx.measureText(meta.tileLabel).width + 14;
        const bx = Math.max(4, Math.min(WIDTH - tw - 4, ax - tw * 0.5));
        const by = ay - 48;
        ctx.fillStyle = 'rgba(7, 16, 25, 0.94)';
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx, by, tw, 18);
        ctx.strokeRect(bx, by, tw, 18);
        ctx.fillStyle = '#FFD23F';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.tileLabel, bx + tw * 0.5, by + 9);
      }
      ctx.restore();
    }

    recalcBaseIntegrity() {
      if (this.safeZones.size === 0) {
        this.baseIntegrity = 0;
        return 0;
      }
      let cur = 0;
      let max = 0;
      for (const sz of this.safeZones.values()) {
        cur += Math.max(0, sz.hp);
        max += sz.maxHp;
      }
      this.baseIntegrity = max > 0 ? (cur / max) * 100 : 0;
      return this.baseIntegrity;
    }

    reachableFromSafe() {
      const seen = new Uint8Array(TOTAL_CELLS);
      const q = [];
      for (const sz of this.safeZones.values()) {
        seen[sz.row * COLS + sz.col] = 1;
        q.push([sz.col, sz.row]);
      }
      for (let h = 0; h < q.length; h++) {
        const [cx, cy] = q[h];
        for (let i = 0; i < 4; i++) {
          const nx = cx + BFS_DIRS[i][0];
          const ny = cy + BFS_DIRS[i][1];
          if (!inBounds(nx, ny)) continue;
          const idx = ny * COLS + nx;
          const stHere = this.structures.get(`${nx},${ny}`);
          if (seen[idx] || this.grid[ny][nx] === 1 || (stHere && stHere.type !== 'gate')) continue;
          seen[idx] = 1;
          q.push([nx, ny]);
        }
      }
      return seen;
    }

    findPathToNearestSafeZone(startCol, startRow) {
      let bestPath = null;
      let bestDist = Infinity;
      const candidates = [];
      for (const sz of this.safeZones.values()) {
        const d = Math.abs(sz.col - startCol) + Math.abs(sz.row - startRow);
        candidates.push({ sz, d });
      }
      candidates.sort((a, b) => a.d - b.d);
      const limit = Math.min(8, candidates.length);
      for (let i = 0; i < limit; i++) {
        const target = candidates[i].sz;
        const p = findPath(startCol, startRow, target.col, target.row, (c, r) => {
          if (c === startCol && r === startRow) return false;
          return this.unitBlocked(c, r);
        });
        if (p && p.length > 0 && p.length < bestDist) {
          bestDist = p.length;
          bestPath = p;
        }
      }
      return bestPath;
    }

    spawnInitialCivilians(count) {
      const reach = this.reachableFromSafe();
      const spawns = [];
      for (const sp of this.spawns.values()) {
        spawns.push([sp.col, sp.row]);
      }

      const candidates = [];
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          if (this.grid[r][c] !== 0 || !reach[r * COLS + c]) continue;
          let near = false;
          for (const s of spawns) {
            if (Math.abs(s[0] - c) + Math.abs(s[1] - r) < 5) {
              near = true;
              break;
            }
          }
          if (!near) candidates.push({ c, r });
        }
      }

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const n = Math.min(count, candidates.length);
      for (let i = 0; i < n; i++) {
        const c0 = candidates[i].c;
        const r0 = candidates[i].r;
        const p = tileCenter(c0, r0);
        const bfs = this.findPathToNearestSafeZone(c0, r0);
        let autoPath = [];
        let destTile = null;
        if (bfs && bfs.length > 0) {
          autoPath = bfs.map(([c, r]) => tileCenter(c, r));
          const last = bfs[bfs.length - 1];
          destTile = { col: last[0], row: last[1] };
        }
        this.civilians.push({
          id: Math.random().toString(36).slice(2, 11),
          x: p.x,
          y: p.y,
          radius: 6,
          speed: 60,
          path: autoPath,
          dest: destTile,
          targetBarracks: null,
          wanderTimer: Math.random() * 2 + 1,
          isIncubating: false,
          incubationTimer: 0
        });
      }
    }

    // --- PERIODIC STRANDED CIVILIAN SPAWN FROM BREACH POINTS (Auto-Runs to Nearest Safe Zone) ---
    spawnBreachCivilian() {
      if (this.civilians.length >= 10 || this.spawns.size === 0) return;

      const breachList = Array.from(this.spawns.values());
      const clearTiles = breachList.filter((sp) => {
        return !this.zombies.some((z) => Math.hypot(z.x - sp.x, z.y - sp.y) < 55);
      });
      const pool = clearTiles.length > 0 ? clearTiles : breachList;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const pos = { x: pick.x, y: pick.y };

      // Compute full BFS path straight to the nearest active green Safe Zone block!
      let autoPath = [];
      let destTile = null;
      const bfsToSafe = this.findPathToNearestSafeZone(pick.col, pick.row);
      if (bfsToSafe && bfsToSafe.length > 0) {
        autoPath = bfsToSafe.map(([c, r]) => tileCenter(c, r));
        const last = bfsToSafe[bfsToSafe.length - 1];
        destTile = { col: last[0], row: last[1] };
      } else {
        for (const [dc, dr] of BFS_DIRS) {
          const nc = pick.col + dc;
          const nr = pick.row + dr;
          if (inBounds(nc, nr) && this.grid[nr][nc] === 0 && !this.structures.has(`${nc},${nr}`)) {
            autoPath = [tileCenter(nc, nr)];
            break;
          }
        }
      }

      const civ = {
        id: Math.random().toString(36).slice(2, 11),
        x: pos.x,
        y: pos.y,
        radius: 6,
        speed: 60,
        path: autoPath,
        dest: destTile,
        targetBarracks: null,
        wanderTimer: 2.5,
        isIncubating: false,
        incubationTimer: 0
      };
      this.civilians.push(civ);
      this.civTotal += 1;

      this.pulseRings.push({
        x: pos.x,
        y: pos.y,
        radius: 8,
        maxRadius: 56,
        color: '#00E5FF',
        life: 0.75,
        maxLife: 0.75
      });
      this.addFloatingText('Stranded Civilian!', pos.x, pos.y - 14, '#00E5FF');
      this.addParticles(pos.x, pos.y, '#00E5FF', 10, 45);
      this.sound.playClick();
      this.showStatus(`Stranded Civilian emerged at breach (${pick.col}, ${pick.row}) and is running toward a Safe Zone!`);
      this.updateHUD();
    }

    // --- DYNAMIC BASE POWER & 10-WAVE HORDE SCALING (v2.4.0: Excludes Barricades, Gates & Commandos) ---
    computePlayerPower() {
      let power = 0;
      for (const sz of this.safeZones.values()) {
        power += Math.max(0, sz.hp) * 0.5 + sz.level * 40;
      }
      for (const st of this.structures.values()) {
        // Barricades (wall) and Gates (gate) contribute 0 so players can build perimeter mazes freely
        if (st.type === 'wall' || st.type === 'gate') continue;
        let occBonus = 0;
        if (st.occupants) {
          for (const u of st.occupants) {
            if (!u.isCommando) occBonus += 45;
          }
        }
        power += Math.max(0, st.hp) * 0.6 + st.level * 90 + occBonus;
      }
      for (const sol of this.soldiers) {
        if (sol.isCommando) continue;
        power += Math.max(0, sol.hp) * 0.8 + sol.level * 60;
      }
      for (const eng of this.engineers) {
        power += Math.max(0, eng.hp) * 0.8 + eng.level * 60;
      }
      return power;
    }

    recalculateHordeScale() {
      const power = this.computePlayerPower();
      if (power < 600) {
        const mult = Math.max(0.75, 0.75 + 0.25 * (power / 600));
        this.hordeScale = { hp: mult, dmg: mult, speed: 1.0, weakened: true };
      } else {
        const excess = power / 600 - 1;
        const root = Math.sqrt(excess);
        const hp = 1 + 0.35 * root;
        const dmg = 1 + 0.28 * root;
        const speed = Math.min(1.5, 1 + 0.10 * root);
        this.hordeScale = { hp, dmg, speed, weakened: false };
      }
      this.threatMult = this.hordeScale.hp;
      return this.hordeScale;
    }

    computeThreatMultipliers() {
      const w = this.wave || 1;
      const tier = Math.floor(Math.max(0, w - 1) / 10);
      if (w < 11) {
        this.threatMult = 1.0;
        return { hp: 1.0, dmg: 1.0, speed: 1.0, tier: 0 };
      }
      this.threatMult = this.hordeScale.hp;
      return {
        hp: this.hordeScale.hp,
        dmg: this.hordeScale.dmg,
        speed: this.hordeScale.speed,
        tier
      };
    }

    computeEarlyWaveBonus() {
      return Math.min(75, 30 + 2 * Math.floor(Math.max(0, this.nextWaveTimer)));
    }

    canLaunchNextWave() {
      if (!this.inPlay || this.isPaused || this.modalBlocking) return false;
      if (this.isTutorialMode && this.tutorialStep < 7) return false;
      if (this.spawns.size === 0 && !this.isPostDefenseMode) return false;
      return this.isEndlessMode || this.wave < this.totalWaves || this.spawns.size > 0;
    }

    triggerNextWaveEarly() {
      if (!this.canLaunchNextWave()) return;
      const bonus = this.computeEarlyWaveBonus();
      this.scrap += bonus;
      this.score += bonus * 2;
      this.addFloatingText(`+$${bonus} Early Wave!`, WIDTH / 2, 70, '#FFD700');
      this.launchNextWave(true, bonus);
    }

    reopenPostDefenseBreaches() {
      // v2.2.0: Destroyed Spawn Breaches are permanently eradicated and never respawn in any mode.
    }

    launchNextWave(wasEarly = false, earlyBonus = 0) {
      this.wave += 1;
      this.waveState = STATE.ACTIVE;

      if (this.isEndlessMode || this.wave < this.totalWaves || this.spawns.size > 0) {
        this.nextWaveTimer = this.isEndlessMode ? Math.max(25.0, 44.0 - this.wave * 1.0) : 45.0;
      } else {
        this.nextWaveTimer = 0;
      }

      // v1.9.0 Rule: Demolishers and Wreckers ONLY appear on Wave 6+ (never in Waves 1-5)
      const w = this.wave;
      const L = this.currentLevel;
      const allowSiege = w >= 6;
      const cfg = (this.isTutorialMode && w === 1)
        ? { walkers: 4, runners: 0, tanks: 0, demolishers: 0, wreckers: 0 }
        : {
            walkers: 8 + L * 2 + w * 3,
            runners: w >= 2 ? 3 + L + w * 2 : 0,
            tanks: w >= 3 ? 2 + Math.floor((w - 2) * 1.3) : 0,
            demolishers: allowSiege ? Math.min(2, 1 + Math.floor((w - 6) / 3)) : 0,
            wreckers: allowSiege ? Math.min(2, 1 + Math.floor((w - 6) / 2)) : 0
          };

      const batch = [];
      for (let i = 0; i < cfg.walkers; i++) batch.push('walker');
      for (let i = 0; i < cfg.runners; i++) batch.push('runner');
      for (let i = 0; i < cfg.tanks; i++) batch.push('tank');
      for (let i = 0; i < cfg.demolishers; i++) batch.push('demolisher');
      for (let i = 0; i < cfg.wreckers; i++) batch.push('wrecker');

      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }

      this.waveSpawnQueue.push(...batch);
      if (this.spawnTimer <= 0) this.spawnTimer = 0.35;

      // Recalculate Horde Scaling dynamically from Base Power every 10th wave boundary (Wave 11, 21, 31...)
      let scaleNote = '';
      if (w >= 11 && (w - 1) % 10 === 0) {
        this.recalculateHordeScale();
        const multTxt = `${this.hordeScale.hp.toFixed(2)}x`;
        if (this.hordeScale.weakened) {
          this.addFloatingText(`HORDE WEAKENED (${multTxt}) \u2014 REBUILD YOUR DEFENSES!`, WIDTH / 2, 110, '#00E5FF');
          scaleNote = ` Horde weakened to ${multTxt} for recovery!`;
        } else {
          this.addFloatingText(`HORDE SCALED TO BASE POWER (${multTxt})!`, WIDTH / 2, 110, '#FF9A1F');
          scaleNote = ` Horde scaled to Base Power (${multTxt})!`;
        }
      }

      this.computeThreatMultipliers();
      const earlyNote = wasEarly ? ` (+$${earlyBonus} early launch bonus!)` : '';
      const waveLabel = this.isEndlessMode
        ? `Wave ${this.wave} (Threat ${this.threatMult.toFixed(2)}x)`
        : `Wave ${this.wave}/${Math.max(this.totalWaves, this.wave)}`;
      const specials = [];
      if (cfg.wreckers > 0) specials.push(`${cfg.wreckers} Wrecker${cfg.wreckers > 1 ? 's' : ''}`);
      if (cfg.demolishers > 0) specials.push(`${cfg.demolishers} Demolisher${cfg.demolishers > 1 ? 's' : ''}`);
      const specialNote = specials.length > 0 ? ` [${specials.join(' + ')}!]` : '';
      this.showStatus(`${waveLabel} incoming!${specialNote}${scaleNote}${earlyNote}`);
      this.sound.playLaser(300, 150, 0.2);
      this.updateHUD();
      this.updateTimerHud();
    }

    // Count active Demolishers + Wreckers on screen (v1.9.0 Max 4 Combined Cap)
    activeSiegeZombieCount() {
      let count = 0;
      for (const z of this.zombies) {
        if (z.hp > 0 && (z.type === 'demolisher' || z.type === 'wrecker')) {
          count++;
        }
      }
      return count;
    }

    makeZombie(type, x, y) {
      // v1.9.0 Rebalance: Demolisher base dmg = 20 (-70% from 65), Wrecker base dmg = 14 (-70% from 45)
      const T = {
        walker: { hp: 40, speed: 45, dmg: 10, radius: 7, color: '#FF3333', reward: 5 },
        runner: { hp: 25, speed: 85, dmg: 8, radius: 6, color: '#FF7700', reward: 8 },
        tank: { hp: 220, speed: 25, dmg: 32, radius: 11, color: '#990000', reward: 20 },
        demolisher: { hp: 180, speed: 38, dmg: 20, radius: 12, color: '#3B0910', reward: 18 },
        wrecker: { hp: 110, speed: 62, dmg: 14, radius: 9, color: '#B833FF', reward: 14 }
      }[type] || { hp: 40, speed: 45, dmg: 10, radius: 7, color: '#FF3333', reward: 5 };

      const esc = this.computeThreatMultipliers();
      const hp = Math.round(T.hp * this.zombieHpMult * esc.hp);
      const speed = Math.round(T.speed * this.zombieSpeedMult * esc.speed);
      const dmg = Math.round(T.dmg * esc.dmg);

      return {
        id: Math.random().toString(36).slice(2, 11),
        type,
        x,
        y,
        hp,
        maxHp: hp,
        baseSpeed: speed,
        speed,
        dmg,
        radius: T.radius,
        color: T.color,
        reward: T.reward,
        angle: 0,
        bruteBreach: type === 'demolisher' ? true : Math.random() < 0.25,
        slowTimer: 0,
        slowFactor: 0,
        attackTimer: 0,
        path: [],
        repathTimer: Math.random() * 0.3,
        laneOffsetX: (Math.random() - 0.5) * 20,
        laneOffsetY: (Math.random() - 0.5) * 20
      };
    }

    spawnZombie(type) {
      if (this.spawns.size === 0) return;

      // Enforce Wave 6+ gate and Max 4 Combined on-screen cap for Demolisher & Wrecker
      let actualType = type;
      if (actualType === 'demolisher' || actualType === 'wrecker') {
        if (this.wave < 6 || this.activeSiegeZombieCount() >= 4) {
          actualType = this.wave >= 2 ? 'runner' : 'walker';
        }
      }

      const breachList = Array.from(this.spawns.values());
      const pick = breachList[Math.floor(Math.random() * breachList.length)];
      this.zombies.push(this.makeZombie(actualType, pick.x, pick.y));
    }

    getMaxHabitats() {
      return this.wave >= 20 ? 2 : 1;
    }

    // --- DESTRUCTIBLE SPAWN BREACH DAMAGE, REGEN RESET & LOAD TRANSFER ---
    damageSpawnBreach(breach, dmg, sourceUnitOrStruct) {
      if (!breach || breach.hp <= 0) return;
      if (this.isTutorialMode && this.tutorialStep < 7) return;
      if (!sourceUnitOrStruct || !sourceUnitOrStruct.isCommando) return;
      breach.hp -= dmg;
      breach.flash = 0.12;
      breach.timeSinceHit = 0;
      breach.isRegenerating = false;
      this.addParticles(breach.x, breach.y, '#FF3B3B', 4, 32);

      if (breach.hp <= 0) {
        const key = `${breach.col},${breach.row}`;
        this.spawns.delete(key);
        this.grid[breach.row][breach.col] = 0;

        this.scrap += 100;
        this.score += 500;
        if (sourceUnitOrStruct) {
          sourceUnitOrStruct.kills = (sourceUnitOrStruct.kills || 0) + 1;
        }

        this.sound.playBarricadeBreak();
        this.addFloatingText('BREACH DESTROYED! +$100', breach.x, breach.y - 14, '#FFD23F');
        this.addParticles(breach.x, breach.y, '#FF9A1F', 24, 95);
        this.pulseRings.push({
          x: breach.x,
          y: breach.y,
          radius: 10,
          maxRadius: 72,
          color: '#FFD23F',
          life: 0.8,
          maxLife: 0.8
        });

        this.showStatus(`Spawn Breach destroyed permanently! +$100 Scrap (${this.spawns.size} breach${this.spawns.size === 1 ? '' : 'es'} remaining).`);

        this.updateHUD();
        this.checkMissionEnd();
      }
    }

    findSpawnBreachInRange(x, y, range) {
      if (this.isTutorialMode && this.tutorialStep < 7) return null;
      let best = null;
      let bestD = range;
      for (const sp of this.spawns.values()) {
        if (sp.hp <= 0) continue;
        const d = Math.hypot(sp.x - x, sp.y - y);
        if (d <= bestD) {
          bestD = d;
          best = sp;
        }
      }
      return best;
    }

    // --- TOOLS, SELECTION & INSPECTOR ---
    hasActiveSelection() {
      return !!(this.selectedBuildType || this.selectedCivilian || this.selectedSoldier || this.selectedEngineer || this.selectedStructure);
    }

    setBuildType(type) {
      if (!this.inPlay) return;
      if (type === 'select' || !type) {
        if (this.selectedBuildType) {
          this.selectedBuildType = null;
          this.selectModeActive = true;
          this.showStatus('Select mode ON: click a Civilian, Soldier, Engineer, Safe Zone, or structure.');
        } else if (this.selectModeActive || this.hasActiveSelection()) {
          this.clearSelection();
          this.showStatus('Select mode OFF.');
        } else {
          this.selectModeActive = true;
          this.showStatus('Select mode ON: click a Civilian, Soldier, Engineer, Safe Zone, or structure.');
        }
        this.sound.playClick();
      } else if (STRUCTURE_SPECS[type]) {
        this.safeZoneDrag = null;
        this.wallDrag = null;
        if (this.selectedBuildType === type) {
          this.selectModeActive = false;
          this.selectedBuildType = null;
          this.showStatus('Build mode deactivated.');
        } else {
          this.selectModeActive = false;
          this.selectedBuildType = type;
          this.selectedCivilian = null;
          this.selectedSoldier = null;
          this.selectedEngineer = null;
          this.closeUpgradePanel();
          const spec = STRUCTURE_SPECS[type];
          const adjHint = type === 'wall'
            ? ' Click or line-drag on a Safe Zone OR within 3 tiles of a green Safe Zone.'
            : type === 'safezone'
            ? ' Click or Drag-to-Paint connected tiles ($10 each, non-upgradable).'
            : ' Must be placed directly on top of a green Safe Zone tile.';
          this.showStatus(`Armed: ${spec.name} ($${spec.baseCost}).${adjHint}`);
          this.sound.playClick();
        }
      }
      this.updateBuildPanelUI();
    }

    quickConscript() {
      if (this.hasActiveSelection()) {
        this.clearSelection();
        this.showStatus('Cleared all selections.');
        this.sound.playClick();
        return;
      }

      let bestEng = null;
      let bestED = 28;
      for (const eng of this.engineers) {
        const d = Math.hypot(eng.x - this.mousePos.x, eng.y - this.mousePos.y);
        if (d < bestED) {
          bestED = d;
          bestEng = eng;
        }
      }
      if (bestEng) {
        this.selectEngineer(bestEng);
        return;
      }

      let bestSoldier = null;
      let bestSD = 28;
      for (const s of this.soldiers) {
        const d = Math.hypot(s.x - this.mousePos.x, s.y - this.mousePos.y);
        if (d < bestSD) {
          bestSD = d;
          bestSoldier = s;
        }
      }
      if (bestSoldier) {
        this.selectSoldier(bestSoldier);
        return;
      }

      let bestCiv = null;
      let bestCD = 28;
      for (const civ of this.civilians) {
        const d = Math.hypot(civ.x - this.mousePos.x, civ.y - this.mousePos.y);
        if (d < bestCD) {
          bestCD = d;
          bestCiv = civ;
        }
      }
      if (bestCiv) this.selectCivilian(bestCiv);
      else this.setBuildType('select');
    }

    updateBuildPanelUI() {
      if (!this.buildPanel) return;
      this.buildPanel.querySelectorAll('[data-tool]').forEach((btn) => {
        const t = btn.dataset.tool;
        const active = t === 'select' ? (!this.selectedBuildType && this.selectModeActive) : this.selectedBuildType === t;
        btn.classList.toggle('active', active);
      });

      // Sync mobile 6-tab buttons and sub-drawer items
      if (this.mobileTabBar) {
        if (this.tabSafeZone) {
          this.tabSafeZone.classList.toggle('active', this.selectedBuildType === 'safezone');
        }
        const isWallActive = this.selectedBuildType === 'wall' || this.selectedBuildType === 'gate';
        if (this.tabWalls) {
          this.tabWalls.classList.toggle('active', this.activeMobileCategory === 'walls' || isWallActive);
        }
        const isBuildingActive = this.selectedBuildType === 'bunker' || this.selectedBuildType === 'barracks' || this.selectedBuildType === 'engineering' || this.selectedBuildType === 'habitat';
        if (this.tabBuildings) {
          this.tabBuildings.classList.toggle('active', this.activeMobileCategory === 'buildings' || isBuildingActive);
        }
        const isTowerActive = this.selectedBuildType === 'sentry' || this.selectedBuildType === 'cryo' || this.selectedBuildType === 'sniper';
        if (this.tabTowers) {
          this.tabTowers.classList.toggle('active', this.activeMobileCategory === 'towers' || isTowerActive);
        }
      }

      if (this.mobileSubDrawer) {
        this.mobileSubDrawer.querySelectorAll('[data-tool]').forEach((btn) => {
          btn.classList.toggle('active', this.selectedBuildType === btn.dataset.tool);
        });
      }
    }

    updateAffordability() {
      const maxHab = this.getMaxHabitats();
      const curHab = this.countStructures('habitat');
      const habCapped = curHab >= maxHab;
      const syncButtons = (container) => {
        if (!container) return;
        container.querySelectorAll('[data-tool]').forEach((btn) => {
          const t = btn.dataset.tool;
          const spec = STRUCTURE_SPECS[t];
          btn.classList.toggle('unaffordable', !!spec && this.scrap < spec.baseCost);
          if (t === 'habitat') {
            btn.disabled = habCapped;
            btn.classList.toggle('capped', habCapped);
            const costEl = btn.querySelector('.tool-cost');
            if (costEl) costEl.innerText = habCapped ? `${curHab}/${maxHab}` : `$${spec.baseCost}`;
          }
        });
      };
      syncButtons(this.buildPanel);
      syncButtons(this.mobileSubDrawer);
      if (this.tabSafeZone) {
        const szSpec = STRUCTURE_SPECS.safezone;
        this.tabSafeZone.classList.toggle('unaffordable', !!szSpec && this.scrap < szSpec.baseCost);
      }
    }

    clearSelection() {
      this.selectModeActive = false;
      this.selectedBuildType = null;
      this.safeZoneDrag = null;
      this.wallDrag = null;
      this.selectedCivilian = null;
      this.selectedSoldier = null;
      this.selectedEngineer = null;
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;
      this.closeUpgradePanel();
      this.updateBuildPanelUI();
    }

    setPaused(p) {
      this.isPaused = !!p;
      if (this.btnPause) this.btnPause.innerText = this.isPaused ? 'Resume' : 'Pause';
      if (this.tabPause) {
        this.tabPause.classList.toggle('paused', this.isPaused);
        if (this.tabPauseLabel) this.tabPauseLabel.innerText = this.isPaused ? 'Resume' : 'Pause';
        if (this.tabPauseIcon) this.tabPauseIcon.innerHTML = this.isPaused ? '&#9654;' : '&#10074;&#10074;';
      }
      this.updateTimerHud();
    }

    togglePause() {
      if (!this.inPlay) return;
      this.setPaused(!this.isPaused);
      this.showStatus(this.isPaused ? 'Defense paused.' : 'Defense resumed.');
    }

    handleCanvasClick(mx, my) {
      if (!this.inPlay || this.modalBlocking) return;
      const col = Math.floor(mx / TILE_SIZE);
      const row = Math.floor(my / TILE_SIZE);
      if (!inBounds(col, row)) return;

      if (this.selectedBuildType) {
        const bKey = `${col},${row}`;
        if (
          this.isMobileTouch &&
          this.selectedBuildType !== 'wall' &&
          this.selectedBuildType !== 'safezone' &&
          ((this.grid[row][col] === 0 && !this.safeZones.has(bKey) && !this.structures.has(bKey)) || this.grid[row][col] === 1)
        ) {
          this.selectedBuildType = null;
          this.updateBuildPanelUI();
          this.showStatus('Build mode exited. Tap any unit or structure to inspect.');
          this.sound.playClick();
          return;
        }
        this.attemptBuild(this.selectedBuildType, col, row);
        return;
      }

      const key = `${col},${row}`;
      const clickedStruct = this.structures.get(key) || this.safeZones.get(key) || null;

      // Soldier selected -> Combat Bunker (Soldiers & Commandos), Barracks (Lv1 Recruits & Commandos), Engineering (Lv1 Recruits Only)
      if (this.selectedSoldier && clickedStruct) {
        if (clickedStruct.type === 'bunker') {
          this.commandSoldierToBunker(this.selectedSoldier, clickedStruct);
          return;
        }
        if (clickedStruct.type === 'barracks') {
          if (this.selectedSoldier.level !== 1 && !this.selectedSoldier.isCommando) {
            this.showStatus('Barracks accept Lv1 Recruits (for training) or standby Commandos only!');
            this.addFloatingText('Recruits / Commandos Only!', clickedStruct.x, clickedStruct.y - 12, '#FF9A1F');
            this.sound.playHit();
            return;
          }
          this.commandSoldierToBarracks(this.selectedSoldier, clickedStruct);
          return;
        }
        if (clickedStruct.type === 'engineering') {
          if (this.selectedSoldier.level !== 1 || this.selectedSoldier.isCommando) {
            this.showStatus('Engineering accepts Lv1 Recruits only for Engineer training!');
            this.addFloatingText('Lv1 Recruits Only!', clickedStruct.x, clickedStruct.y - 12, '#FF9A1F');
            this.sound.playHit();
            return;
          }
          this.commandSoldierToEngineering(this.selectedSoldier, clickedStruct);
          return;
        }
      }

      // Engineer selected -> clicking Engineering puts Engineer on standby inside (+6 HP/s)
      if (this.selectedEngineer && clickedStruct && clickedStruct.type === 'engineering') {
        this.commandEngineerToEngineering(this.selectedEngineer, clickedStruct);
        return;
      }

      // Civilian selected -> Barracks & Engineering require Lv1 Recruits; Bunker requires Soldiers
      if (this.selectedCivilian && clickedStruct) {
        if (clickedStruct.type === 'barracks' || clickedStruct.type === 'engineering') {
          this.showStatus('Recruits Only! Escort civilian to a green Safe Zone first to convert into a Lv1 Recruit.');
          this.addFloatingText('Recruits Only! Escort to Safe Zone first.', clickedStruct.x, clickedStruct.y - 12, '#FF9A1F');
          this.sound.playHit();
          return;
        }
        if (clickedStruct.type === 'bunker') {
          this.showStatus('Combat Bunkers are for Rescued Soldiers & Commandos only!');
          this.addFloatingText('Soldiers Only!', clickedStruct.x, clickedStruct.y - 12, '#FF9A1F');
          this.sound.playHit();
          return;
        }
      }

      const unitPickRadius = this.isMobileTouch ? Math.max(18, 28 / this.camera.zoom) : 18;
      const civPickRadius = this.isMobileTouch ? Math.max(16, 26 / this.camera.zoom) : 16;

      // Check Engineer under cursor (click already-selected unit to unselect)
      let bestEng = null;
      let bestED = unitPickRadius;
      for (const eng of this.engineers) {
        const d = Math.hypot(eng.x - mx, eng.y - my);
        if (d <= bestED) {
          bestED = d;
          bestEng = eng;
        }
      }
      if (bestEng) {
        if (this.selectedEngineer === bestEng) {
          this.clearSelection();
          this.showStatus('Engineer unselected.');
          this.sound.playClick();
          return;
        }
        this.selectEngineer(bestEng);
        return;
      }

      // Check Rescued Soldier under cursor
      let bestSoldier = null;
      let bestSD = unitPickRadius;
      for (const s of this.soldiers) {
        const d = Math.hypot(s.x - mx, s.y - my);
        if (d <= bestSD) {
          bestSD = d;
          bestSoldier = s;
        }
      }
      if (bestSoldier) {
        if (this.selectedSoldier === bestSoldier) {
          this.clearSelection();
          this.showStatus('Unit unselected.');
          this.sound.playClick();
          return;
        }
        this.selectSoldier(bestSoldier);
        return;
      }

      // Check Civilian under cursor
      let bestCiv = null;
      let bestCD = civPickRadius;
      for (const civ of this.civilians) {
        const d = Math.hypot(civ.x - mx, civ.y - my);
        if (d <= bestCD) {
          bestCD = d;
          bestCiv = civ;
        }
      }
      if (bestCiv) {
        if (this.selectedCivilian === bestCiv) {
          this.clearSelection();
          this.showStatus('Civilian unselected.');
          this.sound.playClick();
          return;
        }
        this.selectCivilian(bestCiv);
        return;
      }

      // Issue move order if a Civilian is selected
      if (this.selectedCivilian) {
        this.selectedCivilian.targetBarracks = null;
        if (this.commandCivilianMove(this.selectedCivilian, col, row)) {
          if (this.selectedCivilian.path.length > 0) this.selectedCivilian.manualMoveOrder = true;
        }
        return;
      }

      // Issue move order if an Engineer is selected (Strict Safe Zone Territory Confinement)
      if (this.selectedEngineer) {
        if (clickedStruct && clickedStruct.type !== 'safezone' && !(clickedStruct.type === 'gate' && clickedStruct.hp >= clickedStruct.maxHp)) {
          this.commandEngineerToTarget(this.selectedEngineer, clickedStruct);
          return;
        }
        this.selectedEngineer.targetEngineering = null;
        this.selectedEngineer.manualOrder = true;
        if (this.commandUnitMove(this.selectedEngineer, col, row, 'Engineer', true)) {
          if (this.selectedEngineer.path.length > 0) this.selectedEngineer.manualMoveOrder = true;
        }
        return;
      }

      // Issue move order if a Soldier / Commando is selected
      if (this.selectedSoldier) {
        if (clickedStruct && clickedStruct.type !== 'safezone' && clickedStruct.type !== 'gate') {
          this.selectStructure(clickedStruct);
          return;
        }
        this.selectedSoldier.targetBunker = null;
        this.selectedSoldier.targetBarracks = null;
        this.selectedSoldier.targetEngineering = null;
        this.selectedSoldier.manualOrder = true;
        if (this.commandUnitMove(this.selectedSoldier, col, row, this.selectedSoldier.isCommando ? 'Commando' : 'Soldier', !!this.selectedSoldier.isCommando)) {
          if (this.selectedSoldier.path.length > 0) this.selectedSoldier.manualMoveOrder = true;
        }
        return;
      }

      // Check Structure or Safe Zone block on clicked tile (click already-selected to unselect)
      if (clickedStruct) {
        if (this.selectedStructure === clickedStruct) {
          this.clearSelection();
          this.showStatus('Structure unselected.');
          this.sound.playClick();
          return;
        }
        this.selectStructure(clickedStruct);
        return;
      }

      this.clearSelection();
    }

    // --- PERIMETER 8-WAY ADJACENCY CHECK & BUILDING ---
    hasAdjacentStructureOrBase(col, row) {
      for (let i = 0; i < DIRS_8.length; i++) {
        const nc = col + DIRS_8[i][0];
        const nr = row + DIRS_8[i][1];
        if (!inBounds(nc, nr)) continue;
        if (this.grid[nr][nc] === 2 || this.safeZones.has(`${nc},${nr}`)) return true;
        if (this.structures.has(`${nc},${nr}`)) return true;
      }
      return false;
    }

    hasAdjacentAnchor(col, row) {
      return this.hasAdjacentStructureOrBase(col, row);
    }

    hasAdjacentSafeZone(col, row) {
      for (let i = 0; i < DIRS_8.length; i++) {
        const nc = col + DIRS_8[i][0];
        const nr = row + DIRS_8[i][1];
        if (!inBounds(nc, nr)) continue;
        if (this.grid[nr][nc] === 2 || this.safeZones.has(`${nc},${nr}`)) return true;
      }
      return false;
    }

    canBuildSafeZoneAt(col, row) {
      if (!inBounds(col, row)) return false;
      const key = `${col},${row}`;
      if (this.safeZones.has(key)) return false;
      // Can build Safe Zone on empty ground 8-way adjacent OR directly atop an existing structure
      if (this.structures.has(key)) return true;
      return this.grid[row][col] === 0 && this.hasAdjacentAnchor(col, row);
    }

    getSafeZoneDragPlan(startCol, startRow, curCol, curRow) {
      const minC = Math.max(0, Math.min(startCol, curCol));
      const maxC = Math.min(COLS - 1, Math.max(startCol, curCol));
      const minR = Math.max(0, Math.min(startRow, curRow));
      const maxR = Math.min(ROWS - 1, Math.max(startRow, curRow));
      const eligible = new Set();
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${c},${r}`;
          if (this.safeZones.has(key)) continue;
          if (this.structures.has(key) || this.grid[r][c] === 0) {
            eligible.add(key);
          }
        }
      }
      const orderedTiles = [];
      const visited = new Set();
      const q = [];
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${c},${r}`;
          if (!eligible.has(key)) continue;
          if (this.canBuildSafeZoneAt(c, r)) {
            visited.add(key);
            q.push([c, r]);
          }
        }
      }
      let head = 0;
      while (head < q.length) {
        const [c, r] = q[head++];
        orderedTiles.push([c, r]);
        for (let i = 0; i < DIRS_8.length; i++) {
          const nc = c + DIRS_8[i][0];
          const nr = r + DIRS_8[i][1];
          const nKey = `${nc},${nr}`;
          if (!eligible.has(nKey) || visited.has(nKey)) continue;
          visited.add(nKey);
          q.push([nc, nr]);
        }
      }
      const unitCost = STRUCTURE_SPECS.safezone.baseCost;
      const affordCount = Math.min(orderedTiles.length, Math.floor(this.scrap / unitCost));
      return {
        minC,
        maxC,
        minR,
        maxR,
        orderedTiles,
        affordableTiles: orderedTiles.slice(0, affordCount),
        excessTiles: orderedTiles.slice(affordCount),
        totalCost: affordCount * unitCost
      };
    }

    executeSafeZoneDragPurchase(startCol, startRow, curCol, curRow) {
      const plan = this.getSafeZoneDragPlan(startCol, startRow, curCol, curRow);
      if (plan.orderedTiles.length === 0) {
        const p = tileCenter(curCol, curRow);
        this.showStatus('Safe Zones must connect to existing base/structures.');
        this.addFloatingText('No Connected Tiles!', p.x, p.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }
      const unitCost = STRUCTURE_SPECS.safezone.baseCost;
      if (plan.affordableTiles.length === 0) {
        const p = tileCenter(plan.orderedTiles[0][0], plan.orderedTiles[0][1]);
        this.showStatus(`Insufficient Scrap: need $${unitCost}.`);
        this.addFloatingText('Insufficient Scrap', p.x, p.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      const lv = STRUCTURE_SPECS.safezone.levels[0];
      this.scrap -= plan.totalCost;
      let lastX = 0;
      let lastY = 0;
      for (let i = 0; i < plan.affordableTiles.length; i++) {
        const [c, r] = plan.affordableTiles[i];
        const key = `${c},${r}`;
        const p = tileCenter(c, r);
        lastX = p.x;
        lastY = p.y;
        this.safeZones.set(key, {
          id: Math.random().toString(36).slice(2, 11),
          type: 'safezone',
          level: 1,
          hp: lv.hp,
          maxHp: lv.hp,
          col: c,
          row: r,
          x: p.x,
          y: p.y,
          invested: unitCost,
          preplaced: false,
          flash: 0
        });
        this.grid[r][c] = 2;
        this.addParticles(p.x, p.y, '#00E08A', 5, 36);
      }
      this.recalcBaseIntegrity();
      this.sound.playClick();
      this.addFloatingText(`-$${plan.totalCost}`, lastX, lastY - 12, '#00E08A');
      this.updateHUD();
      this.showStatus(`Painted ${plan.affordableTiles.length} Safe Zone tile${plan.affordableTiles.length > 1 ? 's' : ''} (-$${plan.totalCost}).`);
    }

    getWallLineDragPlan(startCol, startRow, curCol, curRow) {
      const sc = Math.max(0, Math.min(COLS - 1, startCol));
      const sr = Math.max(0, Math.min(ROWS - 1, startRow));
      const cc = Math.max(0, Math.min(COLS - 1, curCol));
      const cr = Math.max(0, Math.min(ROWS - 1, curRow));
      const coords = [];
      if (Math.abs(cc - sc) >= Math.abs(cr - sr)) {
        const step = cc >= sc ? 1 : -1;
        for (let c = sc; step > 0 ? c <= cc : c >= cc; c += step) {
          coords.push([c, sr]);
        }
      } else {
        const step = cr >= sr ? 1 : -1;
        for (let r = sr; step > 0 ? r <= cr : r >= cr; r += step) {
          coords.push([sc, r]);
        }
      }
      const unitCost = STRUCTURE_SPECS.wall.baseCost;
      let affordQuota = Math.floor(this.scrap / unitCost);
      const validAffordable = [];
      const validUnaffordable = [];
      const invalidTiles = [];
      for (let i = 0; i < coords.length; i++) {
        const [c, r] = coords[i];
        if (this.isValidBarricadeTile(c, r)) {
          if (validAffordable.length < affordQuota) {
            validAffordable.push([c, r]);
          } else {
            validUnaffordable.push([c, r]);
          }
        } else {
          invalidTiles.push([c, r]);
        }
      }
      return {
        coords,
        validAffordable,
        validUnaffordable,
        invalidTiles,
        totalCost: validAffordable.length * unitCost
      };
    }

    executeWallLineDragPurchase(startCol, startRow, curCol, curRow) {
      const plan = this.getWallLineDragPlan(startCol, startRow, curCol, curRow);
      if (plan.validAffordable.length === 0) {
        const p = tileCenter(curCol, curRow);
        if (plan.validUnaffordable.length > 0) {
          this.showStatus(`Insufficient Scrap: Barricade costs $${STRUCTURE_SPECS.wall.baseCost}.`);
          this.addFloatingText('Insufficient Scrap', p.x, p.y - 12, '#FF3333');
        } else {
          this.showStatus('Barricades must be placed on Safe Zones or empty tiles within 3 tiles of a Safe Zone!');
          this.addFloatingText('Max 3 Tiles From Safe Zone!', p.x, p.y - 12, '#FF3333');
        }
        this.sound.playHit();
        return;
      }

      const spec = STRUCTURE_SPECS.wall;
      const lv = spec.levels[0];
      this.scrap -= plan.totalCost;
      let lastX = 0;
      let lastY = 0;
      for (let i = 0; i < plan.validAffordable.length; i++) {
        const [c, r] = plan.validAffordable[i];
        const key = `${c},${r}`;
        const p = tileCenter(c, r);
        lastX = p.x;
        lastY = p.y;
        this.structures.set(key, {
          id: Math.random().toString(36).slice(2, 11),
          type: 'wall',
          level: 1,
          hp: lv.hp,
          maxHp: lv.hp,
          col: c,
          row: r,
          x: p.x,
          y: p.y,
          cooldown: 0,
          kills: 0,
          invested: spec.baseCost,
          preplaced: false,
          angle: -Math.PI / 2,
          flash: 0
        });
        if (!this.safeZones.has(key)) this.grid[r][c] = 4;
        this.addParticles(p.x, p.y, '#00FFFF', 6, 40);
      }
      this.sound.playClick();
      this.addFloatingText(`-$${plan.totalCost}`, lastX, lastY - 12, '#00FFFF');
      this.updateHUD();
      this.showStatus(`Built ${plan.validAffordable.length} Barricade${plan.validAffordable.length > 1 ? 's' : ''} (-$${plan.totalCost}).`);
    }

    attemptBuild(type, col, row) {
      const spec = STRUCTURE_SPECS[type];
      if (!spec || !inBounds(col, row)) return;
      const key = `${col},${row}`;
      const p = tileCenter(col, row);

      if (type === 'habitat' && this.countStructures('habitat') >= this.getMaxHabitats()) {
        const cap = this.getMaxHabitats();
        this.showStatus(`Max ${cap} Habitat${cap > 1 ? 's' : ''} allowed!`);
        this.addFloatingText(`Max ${cap} Habitat${cap > 1 ? 's' : ''}!`, p.x, p.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      if (type === 'safezone') {
        if (this.safeZones.has(key)) {
          this.showStatus('This tile is already a green Safe Zone block.');
          this.addFloatingText('Already Safe Zone!', p.x, p.y - 12, '#FF3333');
          this.sound.playHit();
          return;
        }
        if (!this.structures.has(key)) {
          if (this.grid[row][col] !== 0) {
            this.showStatus('Invalid tile: cannot place Safe Zone on rock or Spawn Breach.');
            this.addFloatingText('Invalid Tile', p.x, p.y - 12, '#FF3333');
            this.sound.playHit();
            return;
          }
          if (!this.hasAdjacentStructureOrBase(col, row)) {
            this.showStatus(`${spec.name} must be adjacent to base/structure or placed atop an existing structure.`);
            this.addFloatingText('Build beside structure/base!', p.x, p.y - 12, '#FF3333');
            this.sound.playHit();
            return;
          }
        }
      } else if (type === 'wall') {
        const onSafeZone = this.grid[row][col] === 2 && this.safeZones.has(key);
        const onEmptyGround = this.grid[row][col] === 0 && !this.safeZones.has(key);
        if (this.structures.has(key) || (!onSafeZone && !onEmptyGround)) {
          this.showStatus('Invalid tile: cannot build on rock, Spawn Breach, or occupied tile.');
          this.addFloatingText('Invalid Tile', p.x, p.y - 12, '#FF3333');
          this.sound.playHit();
          return;
        }
        if (!this.isValidBarricadeTile(col, row)) {
          this.showStatus('Must be within 3 tiles of a Safe Zone!');
          this.addFloatingText('Max 3 Tiles From Safe Zone!', p.x, p.y - 12, '#FF3333');
          this.sound.playHit();
          return;
        }
      } else {
        // Universal Safe-Zone-Only Rule for ALL other buildings & towers
        if (this.grid[row][col] !== 2 || !this.safeZones.has(key)) {
          this.showStatus(`${spec.name} must be built directly on a green Base Safe Zone tile.`);
          this.addFloatingText('Build on green Safe Zone!', p.x, p.y - 12, '#FF3333');
          this.sound.playHit();
          return;
        }
        if (this.structures.has(key)) {
          this.showStatus('This green Safe Zone tile already has a structure built on it.');
          this.addFloatingText('Tile Occupied!', p.x, p.y - 12, '#FF3333');
          this.sound.playHit();
          return;
        }
      }

      if (this.scrap < spec.baseCost) {
        this.showStatus(`Insufficient Scrap: need $${spec.baseCost}.`);
        this.addFloatingText('Insufficient Scrap', p.x, p.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      this.scrap -= spec.baseCost;
      const lv = spec.levels[0];

      if (type === 'safezone') {
        const hadStruct = this.structures.has(key);
        const szBlock = {
          id: Math.random().toString(36).slice(2, 11),
          type: 'safezone',
          level: 1,
          hp: lv.hp,
          maxHp: lv.hp,
          col,
          row,
          x: p.x,
          y: p.y,
          invested: spec.baseCost,
          preplaced: false,
          flash: 0
        };
        this.safeZones.set(key, szBlock);
        this.grid[row][col] = 2;
        this.recalcBaseIntegrity();
        this.sound.playClick();
        this.addFloatingText(`-$${spec.baseCost}`, p.x, p.y - 10, '#00E08A');
        this.addParticles(p.x, p.y, '#00E08A', 8, 45);
        this.updateHUD();
        this.showStatus(hadStruct ? 'Safe Zone expanded directly under existing structure! (+1% DMG)' : 'Constructed Safe Zone Block (Lv1, +1% DMG Aura).');
        return;
      } else {
        const struct = {
          id: Math.random().toString(36).slice(2, 11),
          type,
          level: 1,
          hp: lv.hp,
          maxHp: lv.hp,
          col,
          row,
          x: p.x,
          y: p.y,
          cooldown: 0,
          kills: 0,
          invested: spec.baseCost,
          preplaced: false,
          angle: -Math.PI / 2,
          flash: 0
        };
        if (type === 'bunker' || type === 'barracks' || type === 'engineering') {
          struct.capacity = lv.capacity || 4;
          struct.occupants = [];
        }
        if (type === 'barracks' || type === 'engineering' || type === 'habitat') {
          struct.trainTimer = 0;
          struct.trainDuration = lv.trainDuration || spec.trainDuration || 4.0;
          struct.trainQueue = [];
        }
        if (type === 'barracks' || type === 'engineering') {
          struct.activeTrainers = [];
        }
        if (type === 'habitat') {
          struct.spawnedCivs = 0;
        }
        this.structures.set(key, struct);
        if (type === 'wall' && !this.safeZones.has(key)) this.grid[row][col] = 4;
        if (this.isTutorialMode && (type === 'habitat' || type === 'engineering' || type === 'barracks')) {
          this.selectStructure(struct);
          this.updateTutorial();
        }
      }

      this.sound.playClick();
      this.addFloatingText(`-$${spec.baseCost}`, p.x, p.y - 10, '#00FFFF');
      this.addParticles(p.x, p.y, '#00FFFF', 8, 45);
      this.updateHUD();
      this.showStatus(`Constructed ${spec.name} (Lv1).`);
    }

    // --- CIVILIAN, BARRACKS (COMMANDO), ENGINEERING (ENGINEER), HABITAT (CIVILIAN) & TERRITORY AI ---
    unitBlocked(c, r) {
      if (!inBounds(c, r)) return true;
      const t = this.grid[r][c];
      if (t === 1 || t === 3) return true;
      const st = this.structures.get(`${c},${r}`);
      // Gates and Safe-Zone hubs (Barracks/Engineering/Habitat) are walkable for friendly units
      return !!st && st.type !== 'gate' && st.type !== 'barracks' && st.type !== 'engineering' && st.type !== 'habitat';
    }

    safeZoneOnlyBlocked(c, r) {
      if (!inBounds(c, r)) return true;
      if (this.grid[r][c] !== 2 || !this.safeZones.has(`${c},${r}`)) return true;
      const st = this.structures.get(`${c},${r}`);
      return !!st && st.type !== 'gate' && st.type !== 'barracks' && st.type !== 'engineering' && st.type !== 'habitat';
    }

    engineerBlocked(c, r) {
      if (!inBounds(c, r)) return true;
      const key = `${c},${r}`;
      if (this.grid[r][c] !== 2 || !this.safeZones.has(key)) return true;
      const st = this.structures.get(key);
      // Inside green Safe Zones, Engineers walk freely over ALL friendly structures EXCEPT Barricades ('wall')
      return !!st && st.type === 'wall';
    }

    commandoBlocked(c, r) {
      if (this.unitBlocked(c, r)) return true;
      if (this.safeZones.size > 0 && this.minChebyshevDistToSafeZone(c, r) > 3) return true;
      return false;
    }

    selectCivilian(civ) {
      this.selectedCivilian = civ;
      this.selectedSoldier = null;
      this.selectedEngineer = null;
      this.selectedBuildType = null;
      this.closeUpgradePanel();
      this.updateBuildPanelUI();
      this.sound.playClick();
      this.showStatus('Civilian selected: click a green Safe Zone to rescue (+50 Scrap & converts to Lv1 Recruit).');
    }

    commandCivilianMove(civ, targetCol, targetRow) {
      if (civ.isIncubating) {
        this.showStatus('This civilian is infected and cannot follow orders!');
        this.addFloatingText('Infected!', civ.x, civ.y - 12, '#FF8800');
        return;
      }
      this.commandUnitMove(civ, targetCol, targetRow, 'Civilian', false);
    }

    createCommando(x, y, baseSoldier = null, level = 1, homeHubId = null) {
      const idx = Math.max(0, Math.min(COMMANDO_SPECS.length - 1, (level || 1) - 1));
      const spec = COMMANDO_SPECS[idx];
      return {
        id: baseSoldier ? baseSoldier.id : Math.random().toString(36).slice(2, 11),
        level: spec.level,
        name: spec.name,
        homeHubId,
        isCommando: true,
        x,
        y,
        radius: 8,
        speed: spec.speed,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        range: spec.range,
        dmg: spec.dmg,
        rate: spec.rate,
        color: spec.color,
        cooldown: 0,
        kills: baseSoldier ? (baseSoldier.kills || 0) : 0,
        angle: -Math.PI / 2,
        path: [],
        dest: null,
        targetBunker: null,
        targetBarracks: null,
        targetEngineering: null,
        manualOrder: false,
        manualMoveOrder: false,
        reenterCooldown: 1.8,
        aiTimer: 0.2
      };
    }

    getHubRosterCount(hub) {
      if (!hub || !hub.id) return 0;
      const hubId = hub.id;
      let count = 0;
      for (const s of this.soldiers) {
        if (s.hp > 0 && s.homeHubId === hubId) count++;
      }
      for (const e of this.engineers) {
        if (e.hp > 0 && e.homeHubId === hubId) count++;
      }
      for (const st of this.structures.values()) {
        if (st.occupants) {
          for (const u of st.occupants) {
            if (u.hp > 0 && u.homeHubId === hubId) count++;
          }
        }
      }
      return count;
    }

    getTotalQueuedTrainOrders() {
      let total = 0;
      for (const st of this.structures.values()) {
        if ((st.type === 'barracks' || st.type === 'engineering') && st.trainQueue) {
          total += st.trainQueue.length;
        }
      }
      return total;
    }

    syncLinkedHubUnits(hub) {
      if (!hub || !hub.id) return;
      const lvl = Math.max(1, Math.min(3, hub.level || 1));
      let upgradedCount = 0;
      if (hub.type === 'barracks') {
        const spec = COMMANDO_SPECS[lvl - 1];
        const apply = (u) => {
          if (u && u.hp > 0 && u.isCommando && u.homeHubId === hub.id) {
            u.level = spec.level;
            u.name = spec.name;
            u.maxHp = spec.maxHp;
            u.hp = spec.maxHp;
            u.range = spec.range;
            u.dmg = spec.dmg;
            u.rate = spec.rate;
            u.speed = spec.speed;
            u.color = spec.color;
            upgradedCount++;
          }
        };
        for (const s of this.soldiers) apply(s);
        for (const st of this.structures.values()) {
          if (st.occupants) {
            for (const u of st.occupants) apply(u);
          }
        }
        if (upgradedCount > 0) {
          this.addFloatingText(`${upgradedCount} Commando(s) -> ${spec.name}!`, hub.x, hub.y - 26, '#00E5FF');
        }
      } else if (hub.type === 'engineering') {
        const spec = ENGINEER_SPECS[lvl - 1];
        const apply = (u) => {
          if (u && u.hp > 0 && u.unitType === 'engineer' && u.homeHubId === hub.id) {
            u.level = spec.level;
            u.name = spec.name;
            u.maxHp = spec.maxHp;
            u.hp = spec.maxHp;
            u.speed = spec.speed;
            u.repairRate = spec.repairRate;
            u.color = spec.color;
            upgradedCount++;
          }
        };
        for (const e of this.engineers) apply(e);
        for (const st of this.structures.values()) {
          if (st.occupants) {
            for (const u of st.occupants) apply(u);
          }
        }
        if (upgradedCount > 0) {
          this.addFloatingText(`${upgradedCount} Engineer(s) -> ${spec.name}!`, hub.x, hub.y - 26, '#FFD23F');
        }
      }
    }

    assignFreeRecruitToHubOrders(hub) {
      if (!hub || (hub.type !== 'barracks' && hub.type !== 'engineering')) return;
      if (!hub.trainQueue) hub.trainQueue = [];
      if (!hub.activeTrainers) hub.activeTrainers = [];
      if (!hub.occupants) hub.occupants = [];
      if (hub.trainQueue.length === 0) return;

      const cap = hub.capacity || 4;
      const dur = STRUCTURE_SPECS[hub.type].trainDuration || 4.0;

      // Clear stale recruit assignments if recruit died or was reassigned
      for (const order of hub.trainQueue) {
        if (order.assignedRecruitId) {
          const alive = this.soldiers.find(
            (s) => s.id === order.assignedRecruitId && s.hp > 0 && !s.isCommando && s.level === 1 && s.assignedHubId === hub.id
          );
          if (!alive) order.assignedRecruitId = null;
        }
      }

      // First promote already-garrisoned Lv1 Recruits directly into active 4.0s trainers
      while (hub.trainQueue.length > 0 && hub.activeTrainers.length < cap) {
        const rIdx = hub.occupants.findIndex((u) => !u.isCommando && u.unitType !== 'engineer');
        if (rIdx === -1) break;
        const recruit = hub.occupants.splice(rIdx, 1)[0];
        const order = hub.trainQueue.shift();
        if (order.assignedRecruitId) {
          const dispatched = this.soldiers.find((s) => s.id === order.assignedRecruitId);
          if (dispatched && dispatched.assignedHubId === hub.id) {
            dispatched.assignedHubId = null;
            dispatched.targetBarracks = null;
            dispatched.targetEngineering = null;
            dispatched.manualOrder = false;
            dispatched.path = [];
          }
        }
        hub.activeTrainers.push({ id: order.id, unit: recruit, timer: dur, duration: dur, cost: order.cost });
      }
      hub.trainTimer = hub.activeTrainers.length > 0 ? Math.min(...hub.activeTrainers.map((t) => t.timer)) : 0;

      // Dispatch closest free Lv1 Recruits for remaining queued orders
      for (const order of hub.trainQueue) {
        if (order.assignedRecruitId) continue;
        let bestRec = null;
        let bestPath = null;
        let bestDist = Infinity;
        for (const s of this.soldiers) {
          if (s.hp <= 0 || s.isCommando || s.level !== 1) continue;
          if (s.assignedHubId || s.targetBunker || s.targetBarracks || s.targetEngineering) continue;
          const sc = Math.floor(s.x / TILE_SIZE);
          const sr = Math.floor(s.y / TILE_SIZE);
          const d = Math.hypot(s.x - hub.x, s.y - hub.y);
          if (d >= bestDist) continue;
          const p = findPath(sc, sr, hub.col, hub.row, (c, r) =>
            (c === hub.col && r === hub.row) ? false : this.unitBlocked(c, r)
          );
          if (p) {
            bestDist = d;
            bestRec = s;
            bestPath = p;
          }
        }
        if (bestRec) {
          bestRec.assignedHubId = hub.id;
          bestRec.manualOrder = true;
          bestRec.manualMoveOrder = false;
          bestRec.reenterCooldown = 0;
          bestRec.targetBunker = null;
          if (hub.type === 'barracks') {
            bestRec.targetBarracks = hub;
            bestRec.targetEngineering = null;
          } else {
            bestRec.targetEngineering = hub;
            bestRec.targetBarracks = null;
          }
          bestRec.dest = { col: hub.col, row: hub.row };
          bestRec.path = bestPath.map(([c, r]) => tileCenter(c, r));
          order.assignedRecruitId = bestRec.id;
        }
      }
    }

    cancelLastQueuedTraining(struct) {
      if (!this.inPlay || !struct || !struct.trainQueue || struct.trainQueue.length === 0) return false;
      if (struct.type === 'habitat') {
        const last = struct.trainQueue[struct.trainQueue.length - 1];
        if (last.started) {
          this.showStatus('Active civilian recruitment cannot be cancelled; only unstarted queued orders refund.');
          this.sound.playHit();
          return false;
        }
        struct.trainQueue.pop();
        this.scrap += last.cost || 65;
        this.sound.playClick();
        this.addFloatingText(`+$${last.cost || 65} Refund`, struct.x, struct.y - 12, '#FFD23F');
        this.updateHUD();
        if (this.selectedStructure === struct) this.renderUpgradePanel(struct);
        return true;
      }
      if (struct.type === 'barracks' || struct.type === 'engineering') {
        const order = struct.trainQueue.pop();
        const refund = order.cost || (STRUCTURE_SPECS[struct.type].trainCost || 50);
        this.scrap += refund;
        if (order.assignedRecruitId) {
          const rec = this.soldiers.find((s) => s.id === order.assignedRecruitId);
          if (rec && rec.assignedHubId === struct.id) {
            rec.assignedHubId = null;
            rec.targetBarracks = null;
            rec.targetEngineering = null;
            rec.manualOrder = false;
            rec.path = [];
          }
        }
        this.sound.playClick();
        this.addFloatingText(`+$${refund} Refund`, struct.x, struct.y - 12, '#FFD23F');
        this.updateHUD();
        if (this.selectedStructure === struct) this.renderUpgradePanel(struct);
        return true;
      }
      return false;
    }

    commandSoldierToBarracks(soldier, barracks) {
      if (!barracks || barracks.type !== 'barracks' || !soldier) return;
      if (soldier.level !== 1 && !soldier.isCommando) {
        this.showStatus('Barracks accept Lv1 Recruits or Commandos only!');
        this.addFloatingText('Recruits / Commandos Only!', barracks.x, barracks.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      const cap = barracks.capacity || 4;
      const activeT = barracks.activeTrainers ? barracks.activeTrainers.length : 0;
      if (barracks.occupants.length + activeT >= cap) {
        this.showStatus('Barracks is at full capacity (4/4)!');
        this.addFloatingText('Barracks Full!', barracks.x, barracks.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }

      const sc = Math.floor(soldier.x / TILE_SIZE);
      const sr = Math.floor(soldier.y / TILE_SIZE);
      const path = findPath(sc, sr, barracks.col, barracks.row, (c, r) => {
        if (c === barracks.col && r === barracks.row) return false;
        return soldier.isCommando ? this.commandoBlocked(c, r) : this.unitBlocked(c, r);
      });

      if (path) {
        soldier.path = path.map(([c, r]) => tileCenter(c, r));
        soldier.dest = { col: barracks.col, row: barracks.row };
        soldier.targetBarracks = barracks;
        soldier.targetBunker = null;
        soldier.targetEngineering = null;
        soldier.manualOrder = true;
        this.sound.playClick();
        this.addFloatingText('Barracks Order', soldier.x, soldier.y - 14, '#FFD23F');
        this.showStatus(`${soldier.isCommando ? 'Commando' : 'Lv1 Recruit'} moving to Barracks (${barracks.col}, ${barracks.row}).`);
      } else {
        this.showStatus('Path to Barracks is blocked!');
        this.addFloatingText('Path Blocked', soldier.x, soldier.y - 14, '#FF3333');
        this.sound.playHit();
      }
    }

    tryEnterBarracksSoldier(soldier, soldierIndex) {
      if (soldier.level !== 1 && !soldier.isCommando) {
        soldier.targetBarracks = null;
        return false;
      }
      const col = Math.floor(soldier.x / TILE_SIZE);
      const row = Math.floor(soldier.y / TILE_SIZE);
      let barracks = null;

      const here = this.structures.get(`${col},${row}`);
      if (
        here && here.type === 'barracks' && (soldier.reenterCooldown || 0) <= 0 &&
        !soldier.targetBunker && !soldier.targetEngineering &&
        (!soldier.targetBarracks || soldier.targetBarracks === here) &&
        (!soldier.manualOrder || soldier.targetBarracks === here || soldier.path.length === 0)
      ) {
        barracks = here;
      } else if (
        soldier.targetBarracks &&
        this.structures.get(`${soldier.targetBarracks.col},${soldier.targetBarracks.row}`) === soldier.targetBarracks
      ) {
        const d = Math.hypot(soldier.x - soldier.targetBarracks.x, soldier.y - soldier.targetBarracks.y);
        if (d <= TILE_SIZE * 0.95 && (soldier.reenterCooldown || 0) <= 0) {
          barracks = soldier.targetBarracks;
        }
      }

      if (!barracks) return false;
      const cap = barracks.capacity || 4;
      if (!barracks.activeTrainers) barracks.activeTrainers = [];
      if (!barracks.trainQueue) barracks.trainQueue = [];

      // If Recruit arrives with a pending queued order, immediately consume queue order into parallel 4.0s activeTrainers
      if (!soldier.isCommando && soldier.level === 1 && barracks.trainQueue.length > 0 && barracks.activeTrainers.length < cap && (!soldier.assignedHubId || soldier.assignedHubId === barracks.id)) {
        const matchIdx = barracks.trainQueue.findIndex((o) => o.assignedRecruitId === soldier.id);
        const order = barracks.trainQueue.splice(matchIdx !== -1 ? matchIdx : 0, 1)[0];
        if (order.assignedRecruitId && order.assignedRecruitId !== soldier.id) {
          const prev = this.soldiers.find((s) => s.id === order.assignedRecruitId);
          if (prev && prev.assignedHubId === barracks.id) {
            prev.assignedHubId = null;
            prev.targetBarracks = null;
            prev.manualOrder = false;
            prev.path = [];
          }
        }
        this.soldiers.splice(soldierIndex, 1);
        soldier.assignedHubId = null;
        soldier.path = [];
        soldier.dest = null;
        soldier.targetBarracks = null;
        soldier.targetBunker = null;
        soldier.targetEngineering = null;
        soldier.manualOrder = false;
        soldier.manualMoveOrder = false;
        soldier.x = barracks.x;
        soldier.y = barracks.y;
        const dur = STRUCTURE_SPECS.barracks.trainDuration || 4.0;
        barracks.activeTrainers.push({ id: order.id, unit: soldier, timer: dur, duration: dur, cost: order.cost });
        barracks.trainTimer = Math.min(...barracks.activeTrainers.map((t) => t.timer));

        if (this.selectedSoldier === soldier) {
          this.selectedSoldier = null;
          this.selectStructure(barracks);
        } else if (this.selectedStructure === barracks) {
          this.renderUpgradePanel(barracks);
        }
        this.sound.playClick();
        this.addFloatingText('Training Commando (4.0s)...', barracks.x, barracks.y - 12, '#00E5FF');
        this.updateHUD();
        return true;
      }

      if (barracks.occupants.length + barracks.activeTrainers.length >= cap) {
        soldier.targetBarracks = null;
        return false;
      }

      this.soldiers.splice(soldierIndex, 1);
      soldier.assignedHubId = null;
      soldier.path = [];
      soldier.dest = null;
      soldier.targetBarracks = null;
      soldier.targetBunker = null;
      soldier.targetEngineering = null;
      soldier.manualOrder = false;
      soldier.manualMoveOrder = false;
      soldier.x = barracks.x;
      soldier.y = barracks.y;
      soldier.cooldown = soldier.cooldown || 0;
      barracks.occupants.push(soldier);

      if (this.selectedSoldier === soldier) {
        this.selectedSoldier = null;
        this.selectStructure(barracks);
      } else if (this.selectedStructure === barracks) {
        this.renderUpgradePanel(barracks);
      }

      this.sound.playClick();
      this.addFloatingText(`Stationed ${barracks.occupants.length}/${cap}`, barracks.x, barracks.y - 12, '#FFD23F');
      this.addParticles(barracks.x, barracks.y, '#FFD23F', 8, 36);
      this.updateHUD();
      return true;
    }

    commandSoldierToEngineering(soldier, engBuilding) {
      if (!engBuilding || engBuilding.type !== 'engineering' || !soldier) return;
      if (soldier.level !== 1 || soldier.isCommando) {
        this.showStatus('Engineering accepts Lv1 Recruits only for Engineer training!');
        this.addFloatingText('Lv1 Recruits Only!', engBuilding.x, engBuilding.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      const cap = engBuilding.capacity || 4;
      const activeT = engBuilding.activeTrainers ? engBuilding.activeTrainers.length : 0;
      if (engBuilding.occupants.length + activeT >= cap) {
        this.showStatus('Engineering is at full capacity (4/4)!');
        this.addFloatingText('Engineering Full!', engBuilding.x, engBuilding.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }

      const sc = Math.floor(soldier.x / TILE_SIZE);
      const sr = Math.floor(soldier.y / TILE_SIZE);
      const path = findPath(sc, sr, engBuilding.col, engBuilding.row, (c, r) => {
        if (c === engBuilding.col && r === engBuilding.row) return false;
        return this.unitBlocked(c, r);
      });

      if (path) {
        soldier.path = path.map(([c, r]) => tileCenter(c, r));
        soldier.dest = { col: engBuilding.col, row: engBuilding.row };
        soldier.targetEngineering = engBuilding;
        soldier.targetBarracks = null;
        soldier.targetBunker = null;
        this.sound.playClick();
        this.addFloatingText('Engineering Order', soldier.x, soldier.y - 14, '#00E5FF');
        this.showStatus(`Lv1 Recruit moving to Engineering (${engBuilding.col}, ${engBuilding.row}) for Engineer training.`);
      } else {
        this.showStatus('Path to Engineering is blocked!');
        this.addFloatingText('Path Blocked', soldier.x, soldier.y - 14, '#FF3333');
        this.sound.playHit();
      }
    }

    tryEnterEngineeringSoldier(soldier, soldierIndex) {
      if (soldier.level !== 1 || soldier.isCommando) {
        soldier.targetEngineering = null;
        return false;
      }
      const col = Math.floor(soldier.x / TILE_SIZE);
      const row = Math.floor(soldier.y / TILE_SIZE);
      let engBld = null;

      const here = this.structures.get(`${col},${row}`);
      if (
        here && here.type === 'engineering' &&
        !soldier.targetBarracks && !soldier.targetBunker &&
        (!soldier.targetEngineering || soldier.targetEngineering === here) &&
        (!soldier.manualOrder || soldier.targetEngineering === here || soldier.path.length === 0)
      ) {
        engBld = here;
      } else if (
        soldier.targetEngineering &&
        this.structures.get(`${soldier.targetEngineering.col},${soldier.targetEngineering.row}`) === soldier.targetEngineering
      ) {
        const d = Math.hypot(soldier.x - soldier.targetEngineering.x, soldier.y - soldier.targetEngineering.y);
        if (d <= TILE_SIZE * 0.95) engBld = soldier.targetEngineering;
      }

      if (!engBld) return false;
      const cap = engBld.capacity || 4;
      if (!engBld.activeTrainers) engBld.activeTrainers = [];
      if (!engBld.trainQueue) engBld.trainQueue = [];

      if (engBld.trainQueue.length > 0 && engBld.activeTrainers.length < cap && (!soldier.assignedHubId || soldier.assignedHubId === engBld.id)) {
        const matchIdx = engBld.trainQueue.findIndex((o) => o.assignedRecruitId === soldier.id);
        const order = engBld.trainQueue.splice(matchIdx !== -1 ? matchIdx : 0, 1)[0];
        if (order.assignedRecruitId && order.assignedRecruitId !== soldier.id) {
          const prev = this.soldiers.find((s) => s.id === order.assignedRecruitId);
          if (prev && prev.assignedHubId === engBld.id) {
            prev.assignedHubId = null;
            prev.targetEngineering = null;
            prev.manualOrder = false;
            prev.path = [];
          }
        }
        this.soldiers.splice(soldierIndex, 1);
        soldier.assignedHubId = null;
        soldier.path = [];
        soldier.dest = null;
        soldier.targetEngineering = null;
        soldier.targetBarracks = null;
        soldier.targetBunker = null;
        soldier.manualOrder = false;
        soldier.manualMoveOrder = false;
        soldier.x = engBld.x;
        soldier.y = engBld.y;
        const dur = STRUCTURE_SPECS.engineering.trainDuration || 4.0;
        engBld.activeTrainers.push({ id: order.id, unit: soldier, timer: dur, duration: dur, cost: order.cost });
        engBld.trainTimer = Math.min(...engBld.activeTrainers.map((t) => t.timer));

        if (this.selectedSoldier === soldier) {
          this.selectedSoldier = null;
          this.selectStructure(engBld);
        } else if (this.selectedStructure === engBld) {
          this.renderUpgradePanel(engBld);
        }
        this.sound.playClick();
        this.addFloatingText('Training Engineer (4.0s)...', engBld.x, engBld.y - 12, '#FFD23F');
        this.updateHUD();
        return true;
      }

      if (engBld.occupants.length + engBld.activeTrainers.length >= cap) {
        soldier.targetEngineering = null;
        return false;
      }

      this.soldiers.splice(soldierIndex, 1);
      soldier.assignedHubId = null;
      soldier.path = [];
      soldier.dest = null;
      soldier.targetEngineering = null;
      soldier.targetBarracks = null;
      soldier.targetBunker = null;
      soldier.manualOrder = false;
      soldier.manualMoveOrder = false;
      soldier.x = engBld.x;
      soldier.y = engBld.y;
      engBld.occupants.push(soldier);

      if (this.selectedSoldier === soldier) {
        this.selectedSoldier = null;
        this.selectStructure(engBld);
      } else if (this.selectedStructure === engBld) {
        this.renderUpgradePanel(engBld);
      }

      this.sound.playClick();
      this.addFloatingText(`Stationed ${engBld.occupants.length}/${cap}`, engBld.x, engBld.y - 12, '#00E5FF');
      this.addParticles(engBld.x, engBld.y, '#00E5FF', 8, 36);
      this.updateHUD();
      return true;
    }

    commandEngineerToEngineering(eng, engBuilding) {
      if (!engBuilding || engBuilding.type !== 'engineering' || !eng) return;
      const cap = engBuilding.capacity || 4;
      if (engBuilding.occupants.length >= cap) {
        this.showStatus('Engineering is at full capacity (4/4)!');
        this.sound.playHit();
        return;
      }
      const sc = Math.floor(eng.x / TILE_SIZE);
      const sr = Math.floor(eng.y / TILE_SIZE);
      const path = findPath(sc, sr, engBuilding.col, engBuilding.row, (c, r) => {
        if (c === engBuilding.col && r === engBuilding.row) return false;
        return this.engineerBlocked(c, r);
      });
      if (path) {
        eng.path = path.map(([c, r]) => tileCenter(c, r));
        eng.dest = { col: engBuilding.col, row: engBuilding.row };
        eng.targetEngineering = engBuilding;
        eng.repairTarget = null;
        this.sound.playClick();
      } else {
        this.showStatus('Engineering must be connected by Safe Zone territory!');
        this.sound.playHit();
      }
    }

    tryEnterEngineeringEngineer(eng, engIndex) {
      if ((eng.reenterCooldown || 0) > 0) return false;
      const col = Math.floor(eng.x / TILE_SIZE);
      const row = Math.floor(eng.y / TILE_SIZE);
      let engBld = null;

      const here = this.structures.get(`${col},${row}`);
      if (
        here && here.type === 'engineering' &&
        !eng.repairTarget &&
        (!eng.targetEngineering || eng.targetEngineering === here) &&
        (!eng.manualOrder || eng.targetEngineering === here || eng.path.length === 0)
      ) {
        engBld = here;
      } else if (
        eng.targetEngineering &&
        this.structures.get(`${eng.targetEngineering.col},${eng.targetEngineering.row}`) === eng.targetEngineering
      ) {
        const d = Math.hypot(eng.x - eng.targetEngineering.x, eng.y - eng.targetEngineering.y);
        if (d <= TILE_SIZE * 0.95) engBld = eng.targetEngineering;
      }

      if (!engBld) return false;
      const cap = engBld.capacity || 4;
      if (engBld.occupants.length >= cap) {
        eng.targetEngineering = null;
        return false;
      }

      this.engineers.splice(engIndex, 1);
      eng.path = [];
      eng.dest = null;
      eng.targetEngineering = null;
      eng.repairTarget = null;
      eng.manualOrder = false;
      eng.x = engBld.x;
      eng.y = engBld.y;
      engBld.occupants.push(eng);

      if (this.selectedEngineer === eng) {
        this.selectedEngineer = null;
        this.selectStructure(engBld);
      } else if (this.selectedStructure === engBld) {
        this.renderUpgradePanel(engBld);
      }
      this.updateHUD();
      return true;
    }

    findSafeExitPos(struct, preferEmptyGround = false, forEngineer = false, forCommando = false) {
      const dirs = DIRS_8;
      if (preferEmptyGround) {
        for (const [dc, dr] of dirs) {
          const nc = struct.col + dc;
          const nr = struct.row + dr;
          if (!inBounds(nc, nr)) continue;
          const st = this.structures.get(`${nc},${nr}`);
          if (this.grid[nr][nc] === 0 && (!st || st.type === 'gate')) return tileCenter(nc, nr);
        }
      }
      for (const [dc, dr] of dirs) {
        const nc = struct.col + dc;
        const nr = struct.row + dr;
        if (!inBounds(nc, nr)) continue;
        if (this.grid[nr][nc] === 2 && this.safeZones.has(`${nc},${nr}`) && !this.structures.has(`${nc},${nr}`)) {
          return tileCenter(nc, nr);
        }
      }
      for (const [dc, dr] of dirs) {
        const nc = struct.col + dc;
        const nr = struct.row + dr;
        if (!inBounds(nc, nr)) continue;
        const blocked = forEngineer
          ? this.engineerBlocked(nc, nr)
          : forCommando
          ? this.commandoBlocked(nc, nr)
          : this.unitBlocked(nc, nr);
        if (!blocked) return tileCenter(nc, nr);
      }
      for (const [dc, dr] of dirs) {
        const nc = struct.col + dc;
        const nr = struct.row + dr;
        if (!inBounds(nc, nr)) continue;
        const st = this.structures.get(`${nc},${nr}`);
        if ((this.grid[nr][nc] === 0 || this.grid[nr][nc] === 2) && (!st || st.type === 'gate')) {
          return tileCenter(nc, nr);
        }
      }
      return { x: struct.x, y: struct.y };
    }

    trainFromSelectedBuilding(struct) {
      if (!this.inPlay || !struct) return;
      if (struct.type === 'barracks') this.trainUnitFromBarracks(struct);
      else if (struct.type === 'engineering') this.trainUnitFromEngineering(struct);
      else if (struct.type === 'habitat') this.trainUnitFromHabitat(struct);
    }

    hasRecruitOccupant(struct) {
      return !!(struct && struct.occupants && struct.occupants.some((u) => !u.isCommando && u.unitType !== 'engineer'));
    }

    trainUnitFromBarracks(barracks) {
      if (!this.inPlay || !barracks || barracks.type !== 'barracks') return;
      if (!barracks.trainQueue) barracks.trainQueue = [];
      if (!barracks.activeTrainers) barracks.activeTrainers = [];
      const maxRoster = STRUCTURE_SPECS.barracks.maxRoster || 4;
      const committed = this.getHubRosterCount(barracks) + barracks.activeTrainers.length + barracks.trainQueue.length;
      if (committed >= maxRoster) {
        this.showStatus(`Barracks roster cap reached (${maxRoster}/${maxRoster} living/training)! Build another Barracks.`);
        this.addFloatingText('Roster Full (4/4)!', barracks.x, barracks.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      if (this.getTotalQueuedTrainOrders() >= 10) {
        this.showStatus('Global training queue is full (10 orders max)! Wait for dispatched Recruits to arrive.');
        this.addFloatingText('Queue Full (10 max)!', barracks.x, barracks.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      const trainCost = STRUCTURE_SPECS.barracks.trainCost || 75;
      if (this.scrap < trainCost) {
        this.showStatus(`Insufficient Scrap: training a Commando requires $${trainCost}.`);
        this.addFloatingText('Insufficient Scrap', barracks.x, barracks.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      this.scrap -= trainCost;
      barracks.trainQueue.push({
        id: Math.random().toString(36).slice(2, 11),
        cost: trainCost,
        assignedRecruitId: null
      });
      this.assignFreeRecruitToHubOrders(barracks);

      const runningNow = barracks.activeTrainers.length;
      const waitingNow = barracks.trainQueue.length;
      this.sound.playClick();
      this.addFloatingText(runningNow > 0 ? 'Training Commando (4.0s)...' : 'Queued Commando!', barracks.x, barracks.y - 14, '#00E5FF');
      this.addParticles(barracks.x, barracks.y, '#00E5FF', 10, 42);
      this.showStatus(
        runningNow > 0
          ? `Barracks training ${runningNow} Commando(s) (${waitingNow} queued / auto-dispatching Recruit).`
          : `Commando order queued (${waitingNow} pending) — auto-dispatching closest Lv1 Recruit.`
      );
      this.updateHUD();
      if (this.selectedStructure === barracks) this.renderUpgradePanel(barracks);
    }

    completeBarracksTraining(barracks, trainer = null) {
      if (!barracks || barracks.type !== 'barracks') return;
      let recruit = trainer ? trainer.unit : null;
      if (!recruit && barracks.occupants) {
        const rIdx = barracks.occupants.findIndex((u) => !u.isCommando && u.unitType !== 'engineer');
        if (rIdx !== -1) recruit = barracks.occupants.splice(rIdx, 1)[0];
      }
      if (!recruit) {
        barracks.trainTimer = barracks.activeTrainers && barracks.activeTrainers.length > 0
          ? Math.min(...barracks.activeTrainers.map((t) => t.timer))
          : 0;
        return;
      }

      this.score += 200;
      const exitPos = this.findSafeExitPos(barracks, false, false, true);
      const commando = this.createCommando(exitPos.x, exitPos.y, recruit, barracks.level || 1, barracks.id);
      this.soldiers.push(commando);
      barracks.trainTimer = barracks.activeTrainers && barracks.activeTrainers.length > 0
        ? Math.min(...barracks.activeTrainers.map((t) => t.timer))
        : 0;

      this.sound.playUpgrade();
      this.addFloatingText(`${commando.name} Deployed!`, commando.x, commando.y - 14, commando.color);
      this.addParticles(commando.x, commando.y, commando.color, 16, 60);
      this.showStatus(`Deployed ${commando.name} (${commando.maxHp} HP, ${commando.dmg} dmg, ${commando.range}px)! Kites zombies within <=3 tiles of Safe Zones.`);
      this.updateHUD();
      if (this.selectedStructure === barracks) this.renderUpgradePanel(barracks);
    }

    trainUnitFromEngineering(engBld) {
      if (!this.inPlay || !engBld || engBld.type !== 'engineering') return;
      if (!engBld.trainQueue) engBld.trainQueue = [];
      if (!engBld.activeTrainers) engBld.activeTrainers = [];
      const maxRoster = STRUCTURE_SPECS.engineering.maxRoster || 4;
      const committed = this.getHubRosterCount(engBld) + engBld.activeTrainers.length + engBld.trainQueue.length;
      if (committed >= maxRoster) {
        this.showStatus(`Engineering roster cap reached (${maxRoster}/${maxRoster} living/training)! Build another Engineering hub.`);
        this.addFloatingText('Roster Full (4/4)!', engBld.x, engBld.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      if (this.getTotalQueuedTrainOrders() >= 10) {
        this.showStatus('Global training queue is full (10 orders max)! Wait for dispatched Recruits to arrive.');
        this.addFloatingText('Queue Full (10 max)!', engBld.x, engBld.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      const trainCost = STRUCTURE_SPECS.engineering.trainCost || 50;
      if (this.scrap < trainCost) {
        this.showStatus(`Insufficient Scrap: training an Engineer requires $${trainCost}.`);
        this.addFloatingText('Insufficient Scrap', engBld.x, engBld.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      this.scrap -= trainCost;
      engBld.trainQueue.push({
        id: Math.random().toString(36).slice(2, 11),
        cost: trainCost,
        assignedRecruitId: null
      });
      this.assignFreeRecruitToHubOrders(engBld);

      const runningNow = engBld.activeTrainers.length;
      const waitingNow = engBld.trainQueue.length;
      this.sound.playClick();
      this.addFloatingText(runningNow > 0 ? 'Training Engineer (4.0s)...' : 'Queued Engineer!', engBld.x, engBld.y - 14, '#FFD23F');
      this.addParticles(engBld.x, engBld.y, '#FFD23F', 10, 42);
      this.showStatus(
        runningNow > 0
          ? `Engineering training ${runningNow} Engineer(s) (${waitingNow} queued).`
          : `Engineer order queued (${waitingNow} pending) — auto-dispatching closest Lv1 Recruit.`
      );
      this.updateHUD();
      if (this.selectedStructure === engBld) this.renderUpgradePanel(engBld);
    }

    completeEngineeringTraining(engBld, trainer = null) {
      if (!engBld || engBld.type !== 'engineering') return;
      let recruit = trainer ? trainer.unit : null;
      if (!recruit && engBld.occupants) {
        const rIdx = engBld.occupants.findIndex((u) => !u.isCommando && u.unitType !== 'engineer');
        if (rIdx !== -1) recruit = engBld.occupants.splice(rIdx, 1)[0];
      }
      if (!recruit) {
        engBld.trainTimer = engBld.activeTrainers && engBld.activeTrainers.length > 0
          ? Math.min(...engBld.activeTrainers.map((t) => t.timer))
          : 0;
        return;
      }

      this.score += 150;
      const spawnPos = this.findSafeExitPos(engBld, false, true);
      const lvl = Math.max(1, Math.min(3, engBld.level || 1));
      const lvSpec = ENGINEER_SPECS[lvl - 1];
      const eng = {
        id: Math.random().toString(36).slice(2, 11),
        unitType: 'engineer',
        level: lvSpec.level,
        name: lvSpec.name,
        homeHubId: engBld.id,
        x: spawnPos.x,
        y: spawnPos.y,
        radius: 7,
        speed: lvSpec.speed,
        hp: lvSpec.maxHp,
        maxHp: lvSpec.maxHp,
        repairRate: lvSpec.repairRate,
        color: lvSpec.color,
        repairedTotal: 0,
        angle: 0,
        path: [],
        dest: null,
        manualOrder: false,
        manualMoveOrder: false,
        repairTarget: null,
        targetEngineering: null,
        reenterCooldown: 1.8,
        scanTimer: 0.1
      };
      this.engineers.push(eng);
      engBld.trainTimer = engBld.activeTrainers && engBld.activeTrainers.length > 0
        ? Math.min(...engBld.activeTrainers.map((t) => t.timer))
        : 0;

      this.sound.playUpgrade();
      this.addFloatingText(`${eng.name} Deployed!`, eng.x, eng.y - 14, '#FFD23F');
      this.addParticles(eng.x, eng.y, '#FFD23F', 14, 55);
      this.showStatus(`Deployed ${eng.name} (+${eng.repairRate} HP/s $0 welding inside Safe Zones & connected Barricades)!`);
      this.updateHUD();
      if (this.selectedStructure === engBld) this.renderUpgradePanel(engBld);
    }

    trainUnitFromHabitat(habitat) {
      if (!this.inPlay || !habitat || habitat.type !== 'habitat') return;
      if (!habitat.trainQueue) habitat.trainQueue = [];
      const maxQ = STRUCTURE_SPECS.habitat.maxQueue || 20;
      if (habitat.trainQueue.length >= maxQ) {
        this.showStatus(`Habitat queue full (${maxQ}/${maxQ})!`);
        this.addFloatingText(`Queue Full (${maxQ}/20)!`, habitat.x, habitat.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }
      const trainCost = STRUCTURE_SPECS.habitat.trainCost || 65;
      if (this.scrap < trainCost) {
        this.showStatus(`Insufficient Scrap: Habitat civilian recruitment requires $${trainCost}.`);
        this.addFloatingText('Insufficient Scrap', habitat.x, habitat.y - 12, '#FF3333');
        this.sound.playHit();
        return;
      }

      this.scrap -= trainCost;
      const lv = STRUCTURE_SPECS.habitat.levels[habitat.level - 1];
      if (habitat.trainQueue.length === 0) {
        habitat.trainDuration = lv.trainDuration || 3.5;
        habitat.trainTimer = habitat.trainDuration;
        habitat.trainQueue.push({ cost: trainCost, started: true });
      } else {
        habitat.trainQueue.push({ cost: trainCost, started: false });
      }

      this.sound.playClick();
      this.addFloatingText(`Queued Civilian (${habitat.trainQueue.length}/${maxQ})`, habitat.x, habitat.y - 14, '#00E08A');
      this.addParticles(habitat.x, habitat.y, '#00E08A', 8, 38);
      this.showStatus(`Habitat queued civilian (${habitat.trainQueue.length}/${maxQ}, ${habitat.trainTimer.toFixed(1)}s).`);
      this.updateHUD();
      if (this.selectedStructure === habitat) this.renderUpgradePanel(habitat);
    }

    completeHabitatTraining(habitat) {
      if (!habitat || habitat.type !== 'habitat') return;
      if (habitat.trainQueue && habitat.trainQueue.length > 0) {
        habitat.trainQueue.shift();
      }
      if (habitat.trainQueue && habitat.trainQueue.length > 0) {
        const lv = STRUCTURE_SPECS.habitat.levels[habitat.level - 1];
        habitat.trainDuration = lv.trainDuration || 3.5;
        habitat.trainTimer = habitat.trainDuration;
        habitat.trainQueue[0].started = true;
      } else {
        habitat.trainTimer = 0;
      }

      const spawnPos = this.findSafeExitPos(habitat, true, false);
      const sc = Math.floor(spawnPos.x / TILE_SIZE);
      const sr = Math.floor(spawnPos.y / TILE_SIZE);
      const bfs = this.findPathToNearestSafeZone(sc, sr);
      let autoPath = [];
      let destTile = null;
      if (bfs && bfs.length > 0) {
        autoPath = bfs.map(([c, r]) => tileCenter(c, r));
        const last = bfs[bfs.length - 1];
        destTile = { col: last[0], row: last[1] };
      }

      const civ = {
        id: Math.random().toString(36).slice(2, 11),
        x: spawnPos.x,
        y: spawnPos.y,
        radius: 6,
        speed: 60,
        path: autoPath,
        dest: destTile,
        targetBarracks: null,
        wanderTimer: 2.0,
        isIncubating: false,
        incubationTimer: 0
      };
      this.civilians.push(civ);
      this.civTotal += 1;
      habitat.spawnedCivs = (habitat.spawnedCivs || 0) + 1;

      this.sound.playClick();
      this.addFloatingText('Civilian Ready!', civ.x, civ.y - 14, '#FFFFFF');
      this.addParticles(civ.x, civ.y, '#FFFFFF', 10, 40);
      this.showStatus('Habitat generated a new civilian heading to Safe Zone (+$50 Scrap & Lv1 Recruit).');
      this.updateHUD();
      if (this.selectedStructure === habitat) this.renderUpgradePanel(habitat);
    }

    commandSoldierToBunker(soldier, bunker) {
      if (!bunker || bunker.type !== 'bunker' || !soldier) return;
      const cap = bunker.capacity || 4;
      if (bunker.occupants.length >= cap) {
        this.showStatus('Combat Bunker is at full capacity (4/4 Units)!');
        this.addFloatingText('Bunker Full!', bunker.x, bunker.y - 12, '#FF9A1F');
        this.sound.playHit();
        return;
      }

      const sc = Math.floor(soldier.x / TILE_SIZE);
      const sr = Math.floor(soldier.y / TILE_SIZE);

      const path = findPath(sc, sr, bunker.col, bunker.row, (c, r) => {
        if (c === bunker.col && r === bunker.row) return false;
        return soldier.isCommando ? this.commandoBlocked(c, r) : this.unitBlocked(c, r);
      });

      if (path) {
        soldier.path = path.map(([c, r]) => tileCenter(c, r));
        soldier.dest = { col: bunker.col, row: bunker.row };
        soldier.targetBunker = bunker;
        soldier.targetBarracks = null;
        soldier.targetEngineering = null;
        soldier.manualOrder = true;
        this.sound.playClick();
        this.addFloatingText('Garrison Order', soldier.x, soldier.y - 14, '#38E8FF');
        this.showStatus(`${soldier.isCommando ? 'Commando' : 'Soldier'} moving to Combat Bunker (${bunker.col}, ${bunker.row}) for +50% ATK.`);
      } else {
        this.showStatus('Path to Combat Bunker is blocked!');
        this.addFloatingText('Path Blocked', soldier.x, soldier.y - 14, '#FF3333');
        this.sound.playHit();
      }
    }

    tryEnterBunkerSoldier(soldier, soldierIndex) {
      const col = Math.floor(soldier.x / TILE_SIZE);
      const row = Math.floor(soldier.y / TILE_SIZE);
      let bunker = null;

      const here = this.structures.get(`${col},${row}`);
      if (here && here.type === 'bunker' && (soldier.reenterCooldown || 0) <= 0) {
        bunker = here;
      } else if (
        soldier.targetBunker &&
        this.structures.get(`${soldier.targetBunker.col},${soldier.targetBunker.row}`) === soldier.targetBunker
      ) {
        const d = Math.hypot(soldier.x - soldier.targetBunker.x, soldier.y - soldier.targetBunker.y);
        if (d <= TILE_SIZE * 0.95) bunker = soldier.targetBunker;
      }

      if (!bunker) return false;
      const cap = bunker.capacity || 4;
      if (bunker.occupants.length >= cap) {
        soldier.targetBunker = null;
        return false;
      }

      this.soldiers.splice(soldierIndex, 1);
      soldier.path = [];
      soldier.dest = null;
      soldier.targetBunker = null;
      soldier.targetBarracks = null;
      soldier.targetEngineering = null;
      soldier.manualOrder = false;
      soldier.x = bunker.x;
      soldier.y = bunker.y;
      bunker.occupants.push(soldier);

      if (this.selectedSoldier === soldier) {
        this.selectedSoldier = null;
        this.selectStructure(bunker);
      } else if (this.selectedStructure === bunker) {
        this.renderUpgradePanel(bunker);
      }

      this.sound.playClick();
      this.addFloatingText(`Garrisoned ${bunker.occupants.length}/${cap} (+50% ATK)`, bunker.x, bunker.y - 12, '#38E8FF');
      this.addParticles(bunker.x, bunker.y, '#38E8FF', 10, 40);
      this.updateHUD();
      return true;
    }

    ejectHubTrainingRecruitsAndRefund(struct, refundAll = false) {
      if (!struct) return;
      const dirs = DIRS_8;
      if (struct.activeTrainers && struct.activeTrainers.length > 0) {
        const exits = [];
        for (const [dc, dr] of dirs) {
          const nc = struct.col + dc;
          const nr = struct.row + dr;
          if (inBounds(nc, nr) && !this.unitBlocked(nc, nr)) exits.push([nc, nr]);
        }
        if (exits.length === 0) exits.push([struct.col, struct.row]);
        for (let i = 0; i < struct.activeTrainers.length; i++) {
          const tr = struct.activeTrainers[i];
          if (refundAll) this.scrap += tr.cost || 0;
          if (tr.unit) {
            const spot = exits[i % exits.length];
            const p = tileCenter(spot[0], spot[1]);
            tr.unit.x = p.x;
            tr.unit.y = p.y;
            tr.unit.path = [];
            tr.unit.dest = null;
            tr.unit.targetBunker = null;
            tr.unit.targetBarracks = null;
            tr.unit.targetEngineering = null;
            tr.unit.assignedHubId = null;
            tr.unit.manualOrder = false;
            tr.unit.manualMoveOrder = false;
            tr.unit.reenterCooldown = 1.8;
            this.soldiers.push(tr.unit);
          }
        }
        struct.activeTrainers = [];
      }
      if (struct.trainQueue && struct.trainQueue.length > 0) {
        for (const order of struct.trainQueue) {
          if (refundAll) this.scrap += order.cost || 0;
          if (order.assignedRecruitId) {
            const rec = this.soldiers.find((s) => s.id === order.assignedRecruitId);
            if (rec && rec.assignedHubId === struct.id) {
              rec.assignedHubId = null;
              rec.targetBarracks = null;
              rec.targetEngineering = null;
              rec.manualOrder = false;
              rec.path = [];
            }
          }
        }
        struct.trainQueue = [];
      }
      struct.trainTimer = 0;
    }

    releaseGarrisonedUnits(struct, wasDestroyed = false) {
      if (!struct || (struct.type !== 'bunker' && struct.type !== 'barracks' && struct.type !== 'engineering') || !struct.occupants || struct.occupants.length === 0) {
        if (!wasDestroyed) this.showStatus('No units currently garrisoned inside.');
        return;
      }

      const commSafeExits = [];
      const engSafeExits = [];
      const anyExits = [];
      for (const [dc, dr] of DIRS_8) {
        const nc = struct.col + dc;
        const nr = struct.row + dr;
        if (!inBounds(nc, nr)) continue;
        if (!this.commandoBlocked(nc, nr)) commSafeExits.push([nc, nr]);
        if (!this.engineerBlocked(nc, nr)) engSafeExits.push([nc, nr]);
        if (!this.unitBlocked(nc, nr)) anyExits.push([nc, nr]);
      }
      if (commSafeExits.length === 0) commSafeExits.push([struct.col, struct.row]);
      if (engSafeExits.length === 0) engSafeExits.push([struct.col, struct.row]);
      if (anyExits.length === 0) anyExits.push([struct.col, struct.row]);

      const count = struct.occupants.length;
      const isBunker = struct.type === 'bunker';
      for (let i = 0; i < count; i++) {
        const unit = struct.occupants[i];
        const pool = unit.unitType === 'engineer' ? engSafeExits : unit.isCommando ? commSafeExits : anyExits;
        const spot = pool[i % pool.length];
        const p = tileCenter(spot[0], spot[1]);
        unit.x = p.x + (Math.random() - 0.5) * 8;
        unit.y = p.y + (Math.random() - 0.5) * 8;
        unit.path = [];
        unit.dest = null;
        unit.targetBunker = null;
        unit.targetBarracks = null;
        unit.targetEngineering = null;
        unit.manualOrder = false;
        unit.manualMoveOrder = false;
        unit.reenterCooldown = 2.0;
        if (unit.unitType === 'engineer') {
          this.engineers.push(unit);
        } else {
          this.soldiers.push(unit);
        }
      }
      struct.occupants = [];

      if (wasDestroyed) {
        const alertMsg = isBunker ? 'BUNKER BREACHED!' : struct.type === 'engineering' ? 'ENGINEERING BREACHED!' : 'BARRACKS BREACHED!';
        this.addFloatingText(alertMsg, struct.x, struct.y - 14, '#FF3333');
        this.showStatus(`${STRUCTURE_SPECS[struct.type].name} destroyed! ${count} garrisoned unit(s) ejected!`);
      } else {
        this.sound.playClick();
        const unitLabel = isBunker ? 'Unit' : struct.type === 'engineering' ? 'Unit' : 'Soldier';
        this.addFloatingText(`Released ${count} ${unitLabel}${count > 1 ? 's' : ''}!`, struct.x, struct.y - 14, '#38E8FF');
        this.showStatus(`Released ${count} ${unitLabel}(s) from ${STRUCTURE_SPECS[struct.type].name}.`);
        if (this.selectedStructure === struct) this.renderUpgradePanel(struct);
      }
      this.updateHUD();
    }

    // Backward-compatible alias
    releaseBunkerSoldiers(bunker, wasDestroyed = false) {
      this.releaseGarrisonedUnits(bunker, wasDestroyed);
    }

    selectSoldier(soldier) {
      if (this.activeMobileCategory) this.closeMobileSubDrawer();
      this.selectedSoldier = soldier;
      this.selectedCivilian = null;
      this.selectedEngineer = null;
      this.selectedStructure = null;
      this.selectedBuildType = null;
      this.updateBuildPanelUI();
      this.sound.playClick();
      this.renderSoldierInspector(soldier);
      if (soldier.isCommando) {
        this.showStatus(`${soldier.name || 'Commando'} (${soldier.dmg} dmg, ${soldier.range}px) selected: patrols green Safe Zones & kites zombies.`);
      } else {
        const spec = SOLDIER_SPECS[soldier.level - 1];
        this.showStatus(`Soldier (${spec.name} Lv${soldier.level}) selected: click a walkable tile, Combat Bunker (+50% ATK), Barracks, or Engineering.`);
      }
    }

    selectEngineer(engineer) {
      if (this.activeMobileCategory) this.closeMobileSubDrawer();
      this.selectedEngineer = engineer;
      this.selectedSoldier = null;
      this.selectedCivilian = null;
      this.selectedStructure = null;
      this.selectedBuildType = null;
      this.updateBuildPanelUI();
      this.sound.playClick();
      this.renderEngineerInspector(engineer);
      const spec = ENGINEER_SPECS[engineer.level - 1];
      this.showStatus(`${spec.name} (Lv${engineer.level}, +${spec.repairRate} HP/s) selected: patrols green Safe Zones & connected Barricades.`);
    }

    getEngineerEligibleAnchors(targetStruct) {
      if (!targetStruct || !inBounds(targetStruct.col, targetStruct.row)) return [];
      const col = targetStruct.col;
      const row = targetStruct.row;
      const key = `${col},${row}`;
      const anchors = [];
      const seenAnchors = new Set();
      const pushAnchor = (c, r) => {
        const k = `${c},${r}`;
        if (!seenAnchors.has(k) && !this.engineerBlocked(c, r)) {
          seenAnchors.add(k);
          anchors.push([c, r]);
        }
      };

      // Case 1: Safe Zone block itself
      if (targetStruct.type === 'safezone') {
        if (!this.engineerBlocked(col, row)) {
          pushAnchor(col, row);
        } else {
          for (const [dc, dr] of DIRS_8) {
            pushAnchor(col + dc, row + dr);
          }
        }
        return anchors;
      }

      // Case 2: Non-wall structure standing directly on a green Safe Zone tile (walkable directly)
      if (targetStruct.type !== 'wall') {
        if (this.grid[row][col] === 2 && this.safeZones.has(key) && !this.engineerBlocked(col, row)) {
          pushAnchor(col, row);
          for (const [dc, dr] of DIRS_8) {
            pushAnchor(col + dc, row + dr);
          }
        }
        return anchors;
      }

      // Case 3: Barricade ('wall') -> eligible if part of a contiguous 8-way/4-way chain touching a green Safe Zone tile
      const wallQueue = [[col, row]];
      const wallSeen = new Set([key]);
      for (let h = 0; h < wallQueue.length && h < TOTAL_CELLS; h++) {
        const [wc, wr] = wallQueue[h];
        for (const [dc, dr] of DIRS_8) {
          const nc = wc + dc;
          const nr = wr + dr;
          if (!inBounds(nc, nr)) continue;
          const nKey = `${nc},${nr}`;
          if (!this.engineerBlocked(nc, nr)) {
            pushAnchor(nc, nr);
          } else {
            const nSt = this.structures.get(nKey);
            if (nSt && nSt.type === 'wall' && !wallSeen.has(nKey)) {
              wallSeen.add(nKey);
              wallQueue.push([nc, nr]);
            }
          }
        }
      }
      return anchors;
    }

    isReachableByEngineerTerritory(col, row, targetStruct = null) {
      if (!inBounds(col, row)) return false;
      const target = targetStruct || this.structures.get(`${col},${row}`) || this.safeZones.get(`${col},${row}`);
      if (target) return this.getEngineerEligibleAnchors(target).length > 0;
      return !this.engineerBlocked(col, row);
    }

    isBarricadeConnectedToSafeZone(col, row) {
      const st = this.structures.get(`${col},${row}`);
      if (!st || st.type !== 'wall') return false;
      return this.getEngineerEligibleAnchors(st).length > 0;
    }

    commandEngineerToTarget(eng, targetStruct) {
      if (!eng || !targetStruct) return false;
      const spotCandidates = this.getEngineerEligibleAnchors(targetStruct);
      if (spotCandidates.length === 0) return false;

      const sc = Math.floor(eng.x / TILE_SIZE);
      const sr = Math.floor(eng.y / TILE_SIZE);
      let bestPath = null;
      for (const [tc, tr] of spotCandidates) {
        const p = findPath(sc, sr, tc, tr, (c, r) => this.engineerBlocked(c, r));
        if (p && (!bestPath || p.length < bestPath.length)) {
          bestPath = p;
        }
      }
      if (bestPath) {
        eng.repairTarget = targetStruct;
        eng.targetEngineering = null;
        eng.manualOrder = false;
        eng.manualMoveOrder = false;
        eng.path = bestPath.map(([c, r]) => tileCenter(c, r));
        this.sound.playClick();
        this.addFloatingText('Repair Order', eng.x, eng.y - 14, '#FFD23F');
        return true;
      }
      return false;
    }

    commandUnitMove(unit, targetCol, targetRow, label, safeZoneOnly = false) {
      const isEng = unit.unitType === 'engineer';
      const isComm = !!unit.isCommando;
      const blockedFn = safeZoneOnly
        ? (isEng ? (c, r) => this.engineerBlocked(c, r) : isComm ? (c, r) => this.commandoBlocked(c, r) : (c, r) => this.safeZoneOnlyBlocked(c, r))
        : (c, r) => this.unitBlocked(c, r);

      if (safeZoneOnly && blockedFn(targetCol, targetRow)) {
        if (isComm) {
          this.showStatus(`${label}s stay within <=3 tiles of green Safe Zones!`);
          this.addFloatingText('<=3 Tiles from Safe Zones!', unit.x, unit.y - 14, '#FF9A1F');
        } else {
          this.showStatus(`${label}s stay inside green Safe Zone territory!`);
          this.addFloatingText('Safe Zone Territory Only!', unit.x, unit.y - 14, '#FF9A1F');
        }
        this.sound.playHit();
        return false;
      }
      const sc = Math.floor(unit.x / TILE_SIZE);
      const sr = Math.floor(unit.y / TILE_SIZE);
      const path = findPath(sc, sr, targetCol, targetRow, blockedFn);
      if (path && path.length > 0) {
        unit.path = path.map(([c, r]) => tileCenter(c, r));
        unit.dest = { col: targetCol, row: targetRow };
        this.sound.playClick();
        this.addFloatingText('Move Order', unit.x, unit.y - 14, '#00FFFF');
        this.showStatus(`${label} moving to (${targetCol}, ${targetRow}).`);
        return true;
      } else if (path && path.length === 0) {
        this.showStatus(`${label} already at destination.`);
        return true;
      } else {
        this.showStatus('Path blocked or unreachable.');
        this.addFloatingText('Invalid Tile', unit.x, unit.y - 14, '#FF3333');
        this.sound.playHit();
        return false;
      }
    }

    // --- STRUCTURE, SAFE ZONE, SOLDIER & ENGINEER INSPECTOR ---
    selectStructure(struct) {
      if (this.activeMobileCategory) this.closeMobileSubDrawer();
      this.selectedStructure = struct;
      this.selectedBuildType = null;
      this.selectedCivilian = null;
      this.selectedSoldier = null;
      this.selectedEngineer = null;
      this.updateBuildPanelUI();
      this.sound.playClick();
      this.renderUpgradePanel(struct);
    }

    renderUpgradePanel(struct) {
      if (!this.upgradePanel || !struct) return;
      if (this.selectedStructure !== struct) {
        this.salvageConfirmId = null;
        this.salvageConfirmUntil = 0;
      }
      this.selectedStructure = struct;
      this.selectedSoldier = null;
      this.selectedEngineer = null;

      const spec = STRUCTURE_SPECS[struct.type];
      const maxLv = spec.levels.length;
      const cur = spec.levels[Math.min(struct.level - 1, maxLv - 1)];
      const next = struct.level < maxLv ? spec.levels[struct.level] : null;
      const refund = Math.floor(struct.invested * 0.6);

      showEl(this.upgradePanel, 'flex');
      if (this.inspectIcon) this.inspectIcon.innerHTML = STRUCT_ICONS[struct.type] || '&#9646;';
      if (this.inspectName) this.inspectName.innerText = cur.name || spec.name;
      if (this.inspectTier) this.inspectTier.innerText = `Lv${struct.level}/${maxLv} \u2022 Tile (${struct.col}, ${struct.row})`;
      if (this.inspectHpText) this.inspectHpText.innerText = `${Math.ceil(struct.hp)} / ${struct.maxHp}`;
      if (this.inspectHpBar) {
        this.inspectHpBar.style.width = `${Math.max(0, Math.min(100, (struct.hp / struct.maxHp) * 100))}%`;
      }

      const trainBtnLabel = this.btnTrainUnit ? this.btnTrainUnit.querySelector('span:first-child') : null;
      if (trainBtnLabel) trainBtnLabel.innerText = 'Train Engineer';
      if (this.btnCancelTrain) this.btnCancelTrain.classList.remove('slot-hidden');
      hideEl(this.btnCancelTrain);

      if (struct.type === 'bunker') {
        hideEl(this.unitTrainSelect);
        hideEl(this.btnTrainUnit);
        const occ = struct.occupants ? struct.occupants.length : 0;
        const cap = struct.capacity || 4;
        if (this.inspectStatRange) this.inspectStatRange.innerText = `Garrison: ${occ} / ${cap} Soldiers (+50% ATK)`;
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = 'Pillbox: 1.5x Soldier Damage';
        if (this.inspectStatKills) this.inspectStatKills.innerText = `Kills: ${struct.kills || 0} (E Release)`;
        if (this.btnRelease) {
          showEl(this.btnRelease, 'flex');
          this.btnRelease.disabled = occ === 0;
        }
        if (this.releaseCountLabel) this.releaseCountLabel.innerText = `${occ}/${cap}`;
      } else if (struct.type === 'barracks') {
        const occ = struct.occupants ? struct.occupants.length : 0;
        const cap = struct.capacity || 4;
        const maxRoster = spec.maxRoster || 4;
        const trainCost = spec.trainCost || 75;
        const activeTrainers = struct.activeTrainers || [];
        const trainQueue = struct.trainQueue || [];
        const rosterCount = this.getHubRosterCount(struct);
        const committed = rosterCount + activeTrainers.length + trainQueue.length;
        const minTimer = activeTrainers.length > 0 ? Math.min(...activeTrainers.map((t) => t.timer)) : 0;
        const cSpec = COMMANDO_SPECS[Math.max(0, Math.min(2, (struct.level || 1) - 1))];
        if (this.inspectStatRange) {
          this.inspectStatRange.innerText = `Roster: ${rosterCount}/${maxRoster} • Active: ${activeTrainers.length} • Q: ${trainQueue.length}`;
        }
        if (this.inspectStatDmg) {
          this.inspectStatDmg.innerText = `${cSpec.name}: ${cSpec.dmg}dmg (${cSpec.range}px)`;
        }
        if (this.inspectStatKills) {
          this.inspectStatKills.innerText = activeTrainers.length > 0
            ? `Training (${activeTrainers.length}): ${minTimer.toFixed(1)}s`
            : trainQueue.length > 0
            ? `Dispatching Recruit (${trainQueue.length} Q)`
            : `Kills: ${struct.kills || 0} (Auto-Dispatch)`;
        }
        if (this.unitTrainSelect) {
          this.unitTrainSelect.innerHTML = `<option value="commando" selected>${cSpec.name} (Lv${struct.level} Linked)</option>`;
          showEl(this.unitTrainSelect, 'inline-block');
        }
        if (this.btnTrainUnit) {
          showEl(this.btnTrainUnit, 'flex');
          this.btnTrainUnit.disabled = committed >= maxRoster || this.getTotalQueuedTrainOrders() >= 10 || this.scrap < trainCost;
          if (trainBtnLabel) trainBtnLabel.innerText = committed >= maxRoster ? 'Roster Full' : 'Train Commando';
        }
        if (this.trainCostLabel) {
          this.trainCostLabel.innerText = committed >= maxRoster ? `${rosterCount}/${maxRoster}` : `$${trainCost}`;
        }
        if (this.btnCancelTrain) {
          showEl(this.btnCancelTrain, 'flex');
          this.btnCancelTrain.classList.toggle('slot-hidden', trainQueue.length === 0);
          this.btnCancelTrain.disabled = trainQueue.length === 0;
          if (this.cancelTrainLabel) {
            this.cancelTrainLabel.innerText = trainQueue.length > 0
              ? `+$${trainQueue[trainQueue.length - 1].cost || trainCost}`
              : '+$0';
          }
        }
        if (this.btnRelease) {
          showEl(this.btnRelease, 'flex');
          this.btnRelease.disabled = occ === 0;
        }
        if (this.releaseCountLabel) this.releaseCountLabel.innerText = `${occ}/${cap}`;
      } else if (struct.type === 'engineering') {
        const occ = struct.occupants ? struct.occupants.length : 0;
        const cap = struct.capacity || 4;
        const maxRoster = spec.maxRoster || 4;
        const trainCost = spec.trainCost || 50;
        const activeTrainers = struct.activeTrainers || [];
        const trainQueue = struct.trainQueue || [];
        const rosterCount = this.getHubRosterCount(struct);
        const committed = rosterCount + activeTrainers.length + trainQueue.length;
        const minTimer = activeTrainers.length > 0 ? Math.min(...activeTrainers.map((t) => t.timer)) : 0;
        const eSpec = ENGINEER_SPECS[Math.max(0, Math.min(2, (struct.level || 1) - 1))];
        const nextESpec = struct.level < 3 ? ENGINEER_SPECS[struct.level] : null;
        if (this.inspectStatRange) {
          this.inspectStatRange.innerText = `Roster: ${rosterCount}/${maxRoster} • Active: ${activeTrainers.length} • Q: ${trainQueue.length}`;
        }
        if (this.inspectStatDmg) {
          this.inspectStatDmg.innerText = nextESpec
            ? `${eSpec.name}: +${eSpec.repairRate} HP/s (Lv${struct.level + 1}: +${nextESpec.repairRate})`
            : `${eSpec.name}: +${eSpec.repairRate} HP/s ($0 MAX)`;
        }
        if (this.inspectStatKills) {
          this.inspectStatKills.innerText = activeTrainers.length > 0
            ? `Training (${activeTrainers.length}): ${minTimer.toFixed(1)}s`
            : trainQueue.length > 0
            ? `Dispatching Recruit (${trainQueue.length} Q)`
            : `Standby: ${occ}/${cap} (+6 HP/s)`;
        }
        if (this.unitTrainSelect) {
          this.unitTrainSelect.innerHTML = `<option value="engineer" selected>${eSpec.name} (Lv${struct.level} Linked)</option>`;
          showEl(this.unitTrainSelect, 'inline-block');
        }
        if (this.btnTrainUnit) {
          showEl(this.btnTrainUnit, 'flex');
          this.btnTrainUnit.disabled = committed >= maxRoster || this.getTotalQueuedTrainOrders() >= 10 || this.scrap < trainCost;
          if (trainBtnLabel) trainBtnLabel.innerText = committed >= maxRoster ? 'Roster Full' : 'Train Engineer';
        }
        if (this.trainCostLabel) {
          this.trainCostLabel.innerText = committed >= maxRoster ? `${rosterCount}/${maxRoster}` : `$${trainCost}`;
        }
        if (this.btnCancelTrain) {
          showEl(this.btnCancelTrain, 'flex');
          this.btnCancelTrain.classList.toggle('slot-hidden', trainQueue.length === 0);
          this.btnCancelTrain.disabled = trainQueue.length === 0;
          if (this.cancelTrainLabel) {
            this.cancelTrainLabel.innerText = trainQueue.length > 0
              ? `+$${trainQueue[trainQueue.length - 1].cost || trainCost}`
              : '+$0';
          }
        }
        if (this.btnRelease) {
          showEl(this.btnRelease, 'flex');
          this.btnRelease.disabled = occ === 0;
        }
        if (this.releaseCountLabel) this.releaseCountLabel.innerText = `${occ}/${cap}`;
      } else if (struct.type === 'habitat') {
        const trainCost = spec.trainCost || 65;
        const maxQ = spec.maxQueue || 20;
        const trainQueue = struct.trainQueue || [];
        const qLen = trainQueue.length;
        const isTraining = (struct.trainTimer || 0) > 0;
        const hasUnstarted = trainQueue.some((o) => !o.started);
        if (this.inspectStatRange) this.inspectStatRange.innerText = `Queue: ${qLen} / ${maxQ}`;
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = `Speed: ${(cur.trainDuration || 3.5).toFixed(1)}s`;
        if (this.inspectStatKills) {
          this.inspectStatKills.innerText = isTraining
            ? `Recruiting: ${struct.trainTimer.toFixed(1)}s (${qLen}/${maxQ})`
            : `Civilians Created: ${struct.spawnedCivs || 0}`;
        }
        if (this.unitTrainSelect) {
          this.unitTrainSelect.innerHTML = '<option value="civilian" selected>Civilian (Queue up to 20)</option>';
          showEl(this.unitTrainSelect, 'inline-block');
        }
        if (this.btnTrainUnit) {
          showEl(this.btnTrainUnit, 'flex');
          this.btnTrainUnit.disabled = qLen >= maxQ || this.scrap < trainCost;
          if (trainBtnLabel) trainBtnLabel.innerText = qLen >= maxQ ? 'Queue Full' : 'Recruit Civilian';
        }
        if (this.trainCostLabel) {
          this.trainCostLabel.innerText = qLen >= maxQ ? `${qLen}/${maxQ}` : `$${trainCost}`;
        }
        if (this.btnCancelTrain) {
          showEl(this.btnCancelTrain, 'flex');
          this.btnCancelTrain.classList.toggle('slot-hidden', qLen === 0);
          this.btnCancelTrain.disabled = qLen === 0 || !hasUnstarted;
          if (this.cancelTrainLabel) this.cancelTrainLabel.innerText = qLen > 0 ? (hasUnstarted ? `+$${trainCost}` : 'RUN') : '+$0';
        }
        hideEl(this.btnRelease);
      } else if (struct.type === 'gate') {
        hideEl(this.unitTrainSelect);
        hideEl(this.btnTrainUnit);
        hideEl(this.btnRelease);
        if (this.inspectStatRange) this.inspectStatRange.innerText = 'Role: Friendly-Only Gate';
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = 'Friendly Pass / Zombie Blocked';
        if (this.inspectStatKills) this.inspectStatKills.innerText = 'Anchors Adjacent Builds';
      } else if (struct.type === 'safezone') {
        hideEl(this.unitTrainSelect);
        hideEl(this.btnTrainUnit);
        hideEl(this.btnRelease);
        const auraPct = Math.round((this.getSafeZoneDmgMult() - 1) * 100);
        if (this.inspectStatRange) this.inspectStatRange.innerText = `Safe Blocks: ${this.safeZones.size}`;
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = `Damage Aura: +${auraPct}% DMG`;
        if (this.inspectStatKills) this.inspectStatKills.innerText = 'Rescues +$50 / Heals +3 HP/s';
      } else {
        hideEl(this.unitTrainSelect);
        hideEl(this.btnTrainUnit);
        hideEl(this.btnRelease);
        if (this.inspectStatRange) {
          this.inspectStatRange.innerText = cur.range ? `Range: ${cur.range}px` : 'Role: Barricade';
        }
        if (this.inspectStatDmg) {
          const mult = this.getSafeZoneDmgMult();
          this.inspectStatDmg.innerText = cur.dmg
            ? `Damage: ${Math.round(cur.dmg * mult)} (${cur.dmg} base)`
            : struct.type === 'cryo'
            ? `Slow: ${Math.round(cur.slow * 100)}%`
            : 'Armor: Block';
        }
        if (this.inspectStatKills) this.inspectStatKills.innerText = `Kills: ${struct.kills || 0}`;
      }

      if (this.inspectRepairStatus) {
        const key = `${struct.col},${struct.row}`;
        const canAutoRepair = struct.type === 'safezone'
          || this.safeZones.has(key)
          || (struct.type === 'wall' && this.isBarricadeConnectedToSafeZone(struct.col, struct.row));
        this.inspectRepairStatus.innerText = canAutoRepair
          ? 'Engineer Auto-Repair Active'
          : 'Build Safe Zone Under to Repair';
        this.inspectRepairStatus.classList.toggle('unfloored', !canAutoRepair);
        showEl(this.inspectRepairStatus, 'inline-flex');
      }

      const upgradeBtnLabel = this.btnUpgrade ? this.btnUpgrade.querySelector('span:first-child') : null;
      if (struct.type === 'safezone') {
        if (upgradeBtnLabel) upgradeBtnLabel.innerText = 'N/A';
        if (this.upgradeCostLabel) this.upgradeCostLabel.innerText = '--';
        if (this.btnUpgrade) this.btnUpgrade.disabled = true;
      } else {
        if (upgradeBtnLabel) upgradeBtnLabel.innerText = 'Upgrade [W]';
        if (this.upgradeCostLabel) this.upgradeCostLabel.innerText = next ? `$${next.cost}` : 'MAX';
        if (this.btnUpgrade) this.btnUpgrade.disabled = !next || this.scrap < next.cost;
      }

      const cannotSalvageLastSafe = struct.type === 'safezone' && this.safeZones.size <= 1;
      const isConfirmingSalvage = this.salvageConfirmId === struct.id && performance.now() < this.salvageConfirmUntil;
      const salvageBtnLabel = this.btnSalvage ? this.btnSalvage.querySelector('span:first-child') : null;
      if (salvageBtnLabel) salvageBtnLabel.innerText = isConfirmingSalvage ? 'Confirm [S]' : 'Salvage [S]';
      if (this.salvageRefundLabel) this.salvageRefundLabel.innerText = cannotSalvageLastSafe ? 'CORE' : `+$${refund}`;
      if (this.btnSalvage) {
        this.btnSalvage.disabled = cannotSalvageLastSafe;
        this.btnSalvage.classList.toggle('confirming', isConfirmingSalvage);
      }
    }

    renderSoldierInspector(soldier) {
      if (!this.upgradePanel || !soldier) return;
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;
      this.selectedSoldier = soldier;
      this.selectedEngineer = null;
      this.selectedStructure = null;

      const cur = SOLDIER_SPECS[soldier.level - 1];
      const next = soldier.level < SOLDIER_SPECS.length ? SOLDIER_SPECS[soldier.level] : null;

      showEl(this.upgradePanel, 'flex');
      hideEl(this.unitTrainSelect);
      hideEl(this.btnTrainUnit);
      hideEl(this.btnCancelTrain);
      hideEl(this.btnRelease);
      hideEl(this.inspectRepairStatus);
      const upgradeBtnLabel = this.btnUpgrade ? this.btnUpgrade.querySelector('span:first-child') : null;
      if (upgradeBtnLabel) upgradeBtnLabel.innerText = 'Upgrade [W]';
      const salvageBtnLabel = this.btnSalvage ? this.btnSalvage.querySelector('span:first-child') : null;
      if (salvageBtnLabel) salvageBtnLabel.innerText = 'Salvage [S]';
      if (this.btnSalvage) this.btnSalvage.classList.remove('confirming');
      if (this.inspectIcon) this.inspectIcon.innerHTML = STRUCT_ICONS.soldier;
      if (soldier.isCommando) {
        if (this.inspectName) this.inspectName.innerText = `${soldier.name || 'Commando'} (Territory Guard)`;
        if (this.inspectTier) this.inspectTier.innerText = `Lv${soldier.level}/3 \u2022 Linked to Barracks`;
        if (this.inspectStatRange) this.inspectStatRange.innerText = `Range: ${soldier.range}px (Kite)`;
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = `Damage: ${soldier.dmg} (${Math.round(soldier.dmg * 1.5)} in Bunker)`;
        if (this.inspectStatKills) this.inspectStatKills.innerText = `Kills: ${soldier.kills || 0}`;
        if (this.upgradeCostLabel) this.upgradeCostLabel.innerText = 'HUB';
        if (this.btnUpgrade) this.btnUpgrade.disabled = true;
      } else {
        if (this.inspectName) this.inspectName.innerText = `Soldier - ${cur.name}`;
        if (this.inspectTier) this.inspectTier.innerText = `Lv${soldier.level}/3 \u2022 Rescued Squad`;
        if (this.inspectStatRange) this.inspectStatRange.innerText = `Range: ${cur.range}px`;
        if (this.inspectStatDmg) this.inspectStatDmg.innerText = `Damage: ${cur.dmg} (${Math.round(cur.dmg * 1.5)} in Bunker)`;
        if (this.inspectStatKills) this.inspectStatKills.innerText = `Kills: ${soldier.kills || 0}`;
        if (this.upgradeCostLabel) this.upgradeCostLabel.innerText = next ? `$${next.upgradeCost}` : 'MAX';
        if (this.btnUpgrade) this.btnUpgrade.disabled = !next || this.scrap < next.upgradeCost;
      }
      if (this.inspectHpText) this.inspectHpText.innerText = `${Math.ceil(soldier.hp)} / ${soldier.maxHp}`;
      if (this.inspectHpBar) {
        this.inspectHpBar.style.width = `${Math.max(0, Math.min(100, (soldier.hp / soldier.maxHp) * 100))}%`;
      }

      if (this.salvageRefundLabel) this.salvageRefundLabel.innerText = '--';
      if (this.btnSalvage) this.btnSalvage.disabled = true;
    }

    renderEngineerInspector(engineer) {
      if (!this.upgradePanel || !engineer) return;
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;
      this.selectedEngineer = engineer;
      this.selectedSoldier = null;
      this.selectedStructure = null;

      const cur = ENGINEER_SPECS[engineer.level - 1];
      const next = engineer.level < ENGINEER_SPECS.length ? ENGINEER_SPECS[engineer.level] : null;

      showEl(this.upgradePanel, 'flex');
      hideEl(this.unitTrainSelect);
      hideEl(this.btnTrainUnit);
      hideEl(this.btnCancelTrain);
      hideEl(this.btnRelease);
      hideEl(this.inspectRepairStatus);
      const upgradeBtnLabel = this.btnUpgrade ? this.btnUpgrade.querySelector('span:first-child') : null;
      if (upgradeBtnLabel) upgradeBtnLabel.innerText = 'Upgrade [W]';
      const salvageBtnLabel = this.btnSalvage ? this.btnSalvage.querySelector('span:first-child') : null;
      if (salvageBtnLabel) salvageBtnLabel.innerText = 'Salvage [S]';
      if (this.btnSalvage) this.btnSalvage.classList.remove('confirming');
      if (this.inspectIcon) this.inspectIcon.innerHTML = STRUCT_ICONS.engineer;
      if (this.inspectName) this.inspectName.innerText = cur.name;
      if (this.inspectTier) {
        this.inspectTier.innerText = engineer.homeHubId
          ? `Lv${engineer.level}/3 \u2022 Linked to Engineering`
          : `Lv${engineer.level}/3 \u2022 Auto-Repair Corps`;
      }
      if (this.inspectHpText) this.inspectHpText.innerText = `${Math.ceil(engineer.hp)} / ${engineer.maxHp}`;
      if (this.inspectHpBar) {
        this.inspectHpBar.style.width = `${Math.max(0, Math.min(100, (engineer.hp / engineer.maxHp) * 100))}%`;
      }
      if (this.inspectStatRange) this.inspectStatRange.innerText = `Weld Rate: +${cur.repairRate} HP/s`;
      if (this.inspectStatDmg) this.inspectStatDmg.innerText = 'Repair Cost: $0 Scrap';
      if (this.inspectStatKills) this.inspectStatKills.innerText = `HP Repaired: ${Math.floor(engineer.repairedTotal || 0)}`;

      if (this.upgradeCostLabel) this.upgradeCostLabel.innerText = engineer.homeHubId ? 'HUB' : (next ? `$${next.upgradeCost}` : 'MAX');
      if (this.btnUpgrade) this.btnUpgrade.disabled = !!engineer.homeHubId || !next || this.scrap < next.upgradeCost;

      if (this.salvageRefundLabel) this.salvageRefundLabel.innerText = '--';
      if (this.btnSalvage) this.btnSalvage.disabled = true;
    }

    upgradeSelectedEntity() {
      if (!this.inPlay) return;
      if (this.selectedSoldier) {
        this.upgradeSelectedSoldier();
        return;
      }
      if (this.selectedEngineer) {
        this.upgradeSelectedEngineer();
        return;
      }
      const s = this.selectedStructure;
      if (!s) return;
      const spec = STRUCTURE_SPECS[s.type];
      if (s.level >= spec.levels.length) {
        this.showStatus('Already at max level.');
        return;
      }
      const next = spec.levels[s.level];
      if (this.scrap < next.cost) {
        this.addFloatingText('Insufficient Scrap', s.x, s.y - 12, '#FF3333');
        this.showStatus(`Insufficient Scrap: upgrade costs $${next.cost}.`);
        this.sound.playHit();
        return;
      }
      this.scrap -= next.cost;
      s.level += 1;
      s.maxHp = next.hp;
      s.hp = next.hp;
      s.invested += next.cost;
      if (s.type === 'safezone') this.recalcBaseIntegrity();
      if (s.type === 'barracks' || s.type === 'engineering') {
        this.syncLinkedHubUnits(s);
      } else if (s.type === 'habitat' && s.trainTimer > 0 && next.trainDuration) {
        s.trainDuration = next.trainDuration;
        s.trainTimer = Math.min(s.trainTimer, next.trainDuration);
      }
      this.sound.playUpgrade();
      this.addFloatingText(`Upgraded Lv${s.level}!`, s.x, s.y - 12, '#00FF88');
      this.addParticles(s.x, s.y, '#00FF88', 12, 55);
      this.updateHUD();
      this.renderUpgradePanel(s);
      this.showStatus(`${spec.name} upgraded to Lv${s.level}.`);
    }

    upgradeSelectedSoldier() {
      const sol = this.selectedSoldier;
      if (!sol || sol.isCommando || sol.level >= SOLDIER_SPECS.length) return;
      const next = SOLDIER_SPECS[sol.level];
      if (this.scrap < next.upgradeCost) {
        this.addFloatingText('Insufficient Scrap', sol.x, sol.y - 14, '#FF3333');
        this.showStatus(`Insufficient Scrap: promotion costs $${next.upgradeCost}.`);
        this.sound.playHit();
        return;
      }
      this.scrap -= next.upgradeCost;
      sol.level += 1;
      sol.maxHp = next.maxHp;
      sol.hp = next.maxHp;
      sol.range = next.range;
      sol.dmg = next.dmg;
      sol.rate = next.rate;
      this.sound.playUpgrade();
      this.addFloatingText(`Promoted: ${next.name}!`, sol.x, sol.y - 14, '#FFD700');
      this.addParticles(sol.x, sol.y, '#FFD700', 14, 60);
      this.updateHUD();
      this.renderSoldierInspector(sol);
      this.showStatus(`Rescued Soldier promoted to ${next.name} (Lv${sol.level})!`);
    }

    upgradeSelectedEngineer() {
      const eng = this.selectedEngineer;
      if (!eng || eng.homeHubId || eng.level >= ENGINEER_SPECS.length) return;
      const next = ENGINEER_SPECS[eng.level];
      if (this.scrap < next.upgradeCost) {
        this.addFloatingText('Insufficient Scrap', eng.x, eng.y - 14, '#FF3333');
        this.showStatus(`Insufficient Scrap: promotion costs $${next.upgradeCost}.`);
        this.sound.playHit();
        return;
      }
      this.scrap -= next.upgradeCost;
      eng.level += 1;
      eng.maxHp = next.maxHp;
      eng.hp = next.maxHp;
      eng.speed = next.speed;
      eng.repairRate = next.repairRate;
      this.sound.playUpgrade();
      this.addFloatingText(`Promoted: ${next.name}!`, eng.x, eng.y - 14, '#FFD23F');
      this.addParticles(eng.x, eng.y, '#FFD23F', 14, 60);
      this.updateHUD();
      this.renderEngineerInspector(eng);
      this.showStatus(`Engineer promoted to ${next.name} (Lv${eng.level}, +${eng.repairRate} HP/s)!`);
    }

    salvageSelectedStructure(fromHotkey = false) {
      const s = this.selectedStructure;
      if (!s || !this.inPlay) return;
      if (s.type === 'safezone') {
        if (this.safeZones.size <= 1) {
          this.showStatus('Cannot salvage your last remaining Safe Zone block!');
          this.sound.playHit();
          return;
        }
        const key = `${s.col},${s.row}`;
        const refund = Math.floor(s.invested * 0.6);
        this.scrap += refund;
        this.safeZones.delete(key);
        const topStruct = this.structures.get(key);
        this.grid[s.row][s.col] = topStruct && topStruct.type === 'wall' ? 4 : 0;
        this.recalcBaseIntegrity();
        this.sound.playClick();
        this.addFloatingText(`+$${refund} Salvaged`, s.x, s.y - 12, '#FFD700');
        this.closeUpgradePanel();
        this.updateHUD();
        return;
      }

      if ((fromHotkey || this.isMobileTouch) && s.level >= 2) {
        const now = performance.now();
        if (this.salvageConfirmId !== s.id || now >= this.salvageConfirmUntil) {
          this.salvageConfirmId = s.id;
          this.salvageConfirmUntil = now + 2000;
          this.sound.playClick();
          this.renderUpgradePanel(s);
          this.showStatus(
            this.isMobileTouch
              ? `Tap Salvage again within 2.0s to confirm salvaging Lv${s.level} ${STRUCTURE_SPECS[s.type].name}!`
              : `Press [S] again within 2.0s to confirm salvaging Lv${s.level} ${STRUCTURE_SPECS[s.type].name}!`
          );
          return;
        }
      }
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;

      if ((s.type === 'bunker' || s.type === 'barracks' || s.type === 'engineering') && s.occupants && s.occupants.length > 0) {
        this.releaseGarrisonedUnits(s, false);
      }
      if (s.type === 'barracks' || s.type === 'engineering') {
        this.ejectHubTrainingRecruitsAndRefund(s, true);
      }
      if (s.type === 'habitat' && s.trainQueue && s.trainQueue.length > 0) {
        for (const o of s.trainQueue) this.scrap += o.cost || (STRUCTURE_SPECS.habitat.trainCost || 65);
        s.trainQueue = [];
        s.trainTimer = 0;
      }
      const key = `${s.col},${s.row}`;
      const refund = Math.floor(s.invested * 0.6);
      this.scrap += refund;
      this.structures.delete(key);
      if (this.grid[s.row][s.col] === 4) {
        this.grid[s.row][s.col] = this.safeZones.has(key) ? 2 : 0;
      }
      this.sound.playClick();
      this.addFloatingText(`+$${refund} Salvaged`, s.x, s.y - 12, '#FFD700');
      this.addParticles(s.x, s.y, '#FFD700', 10, 50);
      this.closeUpgradePanel();
      this.updateHUD();
      this.showStatus(`${STRUCTURE_SPECS[s.type].name} salvaged for $${refund} (60%).`);
    }

    closeUpgradePanel() {
      this.selectedStructure = null;
      this.selectedSoldier = null;
      this.selectedEngineer = null;
      this.salvageConfirmId = null;
      this.salvageConfirmUntil = 0;
      if (this.btnSalvage) this.btnSalvage.classList.remove('confirming');
      hideEl(this.upgradePanel);
    }

    // --- EFFECTS & HUD ---
    showStatus(msg) {
      if (this.statusMessage) this.statusMessage.innerText = msg;
    }

    addFloatingText(text, x, y, color = '#FFFFFF') {
      if (this.floatingTexts.length > 45) this.floatingTexts.shift();
      this.floatingTexts.push({ text, x, y, color, life: 1.4, alpha: 1.0 });
    }

    addParticles(x, y, color, count = 6, speed = 40) {
      if (this.particles.length > 450) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = (Math.random() * 0.7 + 0.3) * speed;
        const life = 0.35 + Math.random() * 0.3;
        this.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          color,
          life,
          maxLife: life,
          radius: Math.random() * 2 + 1.2
        });
      }
    }

    updateHUD() {
      if (this.hudScrap) this.hudScrap.innerText = Math.floor(this.scrap);
      if (this.hudSoldiers) {
        this.hudSoldiers.innerText = this.soldiers.length + this.garrisonedSoldierCount + this.engineers.length + this.garrisonedEngineerCount;
      }
      if (this.hudWave) {
        if (this.isEndlessMode) {
          this.hudWave.innerText = `Wave ${Math.max(1, this.wave)} (\u221E)`;
        } else {
          const dispWave = Math.max(1, this.wave || 1);
          this.hudWave.innerText = `Wave ${dispWave}/${Math.max(this.totalWaves, dispWave)}`;
        }
      }
      this.computeThreatMultipliers();
      if (this.hudThreatBadge) {
        showEl(this.hudThreatBadge, 'flex');
        if (this.hudThreat) this.hudThreat.innerText = `${this.threatMult.toFixed(2)}x`;
      }
      this.recalcBaseIntegrity();
      if (this.hudBase) {
        const b = Math.max(0, Math.round(this.baseIntegrity));
        this.hudBase.innerText = `${b}%`;
        this.hudBase.classList.toggle('danger', b <= 35);
      }
      if (this.hudSzDmg) {
        const bonusPct = Math.round((this.getSafeZoneDmgMult() - 1) * 100);
        this.hudSzDmg.innerText = `+${bonusPct}% DMG`;
      }
      this.updateAffordability();
    }

    updateTimerHud() {
      let t = '--';
      if (this.waveState === STATE.PREPARE) {
        t = `T-${Math.max(0, Math.ceil(this.nextWaveTimer))}s`;
      } else if (this.waveState === STATE.ACTIVE) {
        if (this.canLaunchNextWave()) {
          t = `T-${Math.max(0, Math.ceil(this.nextWaveTimer))}s`;
        } else {
          t = `${this.zombies.length + this.waveSpawnQueue.length} hostile`;
        }
      } else if (this.waveState === STATE.CLEARED) {
        t = `${this.spawns.size} breach`;
      }

      if (t !== this.timerText) {
        this.timerText = t;
        if (this.hudTimer) this.hudTimer.innerText = t;
      }

      const canEarly = this.canLaunchNextWave();
      const bonusLabel = canEarly ? `+$${this.computeEarlyWaveBonus()}` : 'SIEGE';
      if (this.btnStartWave) {
        this.btnStartWave.disabled = !canEarly;
      }
      if (this.waveBonusLabel) {
        this.waveBonusLabel.innerText = bonusLabel;
      }
      if (this.tabNextWave) {
        this.tabNextWave.disabled = !canEarly;
      }
      if (this.mobileWaveBonusLabel) {
        this.mobileWaveBonusLabel.innerText = bonusLabel;
      }
    }

    // --- MAIN SIMULATION LOOP ---
    loop(timestamp) {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const rawDt = Math.max(0, (timestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = timestamp;

      const simActive = this.inPlay && !this.isPaused && !this.modalBlocking;
      const dt = simActive ? Math.min(rawDt, 0.1) * this.gameSpeed : 0;

      try {
        if (dt > 0) this.update(dt);
      } catch (err) {
        if (window.console) console.error('Simulation error:', err);
      }

      this.uiTimer -= Math.min(rawDt, 0.1);
      if (this.uiTimer <= 0) {
        this.uiTimer = 0.2;
        try {
          if (this.selectedStructure) {
            const k = `${this.selectedStructure.col},${this.selectedStructure.row}`;
            const stillThere = this.structures.get(k) === this.selectedStructure || this.safeZones.get(k) === this.selectedStructure;
            if (stillThere) {
              this.renderUpgradePanel(this.selectedStructure);
            } else {
              this.closeUpgradePanel();
            }
          } else if (this.selectedSoldier) {
            if (this.soldiers.includes(this.selectedSoldier)) {
              this.renderSoldierInspector(this.selectedSoldier);
            } else {
              this.closeUpgradePanel();
            }
          } else if (this.selectedEngineer) {
            if (this.engineers.includes(this.selectedEngineer)) {
              this.renderEngineerInspector(this.selectedEngineer);
            } else {
              this.closeUpgradePanel();
            }
          }
          this.updateHUD();
          this.updateTimerHud();
          if (this.isTutorialMode) this.updateTutorial();
        } catch (err) {
          if (window.console) console.error('UI refresh error:', err);
        }
      }

      try {
        this.render(timestamp);
      } catch (err) {
        if (window.console) console.error('Render error:', err);
      }
      requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
      this.elapsedTime += dt;

      // Periodic stranded civilian breach spawns (every 15s-22s while active breaches exist)
      if ((this.waveState === STATE.PREPARE || this.waveState === STATE.ACTIVE) && this.spawns.size > 0) {
        this.breachCivTimer -= dt;
        if (this.breachCivTimer <= 0) {
          this.breachCivTimer = 15.0 + Math.random() * 7.0;
          this.spawnBreachCivilian();
        }
      }

      // Unified nextWaveTimer progression (frozen during Tutorial Steps 1-6 until Step 7 unlocks wave)
      if (
        (!this.isTutorialMode || this.tutorialStep >= 7) &&
        (this.waveState === STATE.PREPARE || this.waveState === STATE.ACTIVE) &&
        (this.isEndlessMode || this.wave < this.totalWaves || this.spawns.size > 0)
      ) {
        this.nextWaveTimer -= dt;
        if (this.nextWaveTimer <= 0) {
          this.launchNextWave(false, 0);
        }
      }

      // Spawn queued zombies (with Spawn Load Transfer when breaches are destroyed)
      if (this.waveSpawnQueue.length > 0) {
        if (this.spawns.size === 0) {
          this.waveSpawnQueue = [];
        } else {
          this.spawnTimer -= dt;
          let burst = 0;
          while (this.spawnTimer <= 0 && this.waveSpawnQueue.length > 0 && burst < 4) {
            const baseInterval = (this.isEndlessMode ? Math.max(0.28, 0.72 - this.wave * 0.025) : 0.7) + Math.random() * 0.35;
            const loadScale = this.spawns.size / Math.max(1, this.initialSpawnCount || 1);
            const effectiveInterval = Math.max(0.05, baseInterval * loadScale);
            this.spawnTimer += effectiveInterval;
            const nextType = this.waveSpawnQueue.shift();
            this.spawnZombie(nextType);
            burst++;
          }
          if (burst >= 4 && this.spawnTimer < 0) this.spawnTimer = 0;
        }
      } else if (this.waveState === STATE.ACTIVE && this.zombies.length === 0) {
        const clearBonus = 120 + 30 * this.wave;
        this.scrap += clearBonus;
        this.score += 250;
        let milestoneNote = '';
        if (this.wave > 0 && this.wave % 10 === 0) {
          const supplyDrop = 150 + 30 * Math.floor(this.wave / 10);
          this.scrap += supplyDrop;
          this.addFloatingText(`MILESTONE SUPPLY DROP +$${supplyDrop}!`, WIDTH / 2, HEIGHT / 2 - 36, '#FFD23F');
          milestoneNote = ` +$${supplyDrop} Milestone Supply Drop!`;
        }
        this.sound.playUpgrade();

        if (this.spawns.size === 0) {
          this.waveState = STATE.CLEARED;
          this.showStatus(`All Spawn Breaches destroyed! +$${clearBonus} bonus.${milestoneNote}`);
        } else {
          this.waveState = STATE.PREPARE;
          if (this.nextWaveTimer > 12.0) this.nextWaveTimer = 12.0;
          this.showStatus(`Wave ${this.wave} cleared! +$${clearBonus} bonus scrap.${milestoneNote} Destroy the remaining ${this.spawns.size} Spawn Breach(es)!`);
          this.addFloatingText(`+$${clearBonus} Wave Bonus`, WIDTH / 2, HEIGHT / 2, '#FFD700');
        }
        this.updateHUD();
        this.updateTimerHud();
      }

      this.updateCivilians(dt);
      this.updateSoldiers(dt);
      this.updateEngineers(dt);
      this.updateZombies(dt);
      this.updateStructures(dt);
      this.updateProjectiles(dt);
      this.updateVisuals(dt);
      if (this.isTutorialMode) this.updateTutorial();
      this.checkMissionEnd();
    }

    checkMissionEnd() {
      if (!this.inPlay) return;

      // Only Defeat Condition: all green Base Safe Zone blocks destroyed (losing civilians NEVER causes defeat)
      if (this.safeZones.size === 0) {
        this.onDefeat('All green Base Safe Zone blocks were destroyed by the horde.');
        return;
      }

      // Victory across all modes: All Spawn Breaches permanently destroyed (this.spawns.size === 0)
      if (this.spawns.size === 0) {
        this.onVictory();
      }
    }

    // --- CIVILIANS & RESCUE-TO-SOLDIER CONVERSION ---
    updateCivilians(dt) {
      for (let i = this.civilians.length - 1; i >= 0; i--) {
        const civ = this.civilians[i];

        if (civ.isIncubating) {
          civ.incubationTimer += dt;
          civ.path = [];
          civ.targetBarracks = null;
          if (civ.incubationTimer >= this.infectionWindow) {
            this.civilians.splice(i, 1);
            this.infectedCount++;
            this.sound.playInfection();
            this.addFloatingText('Civilian Infected!', civ.x, civ.y - 14, '#FF2222');
            this.addParticles(civ.x, civ.y, '#FF0000', 12, 70);
            const z = this.makeZombie('runner', civ.x, civ.y);
            z.repathTimer = 0.2;
            this.zombies.push(z);
            if (this.selectedCivilian === civ) this.selectedCivilian = null;
            this.updateHUD();
          }
          continue;
        }

        if (civ.path.length > 0) {
          const node = civ.path[0];
          const dist = Math.hypot(node.x - civ.x, node.y - civ.y);
          const step = civ.speed * dt;
          if (dist <= step) {
            civ.x = node.x;
            civ.y = node.y;
            civ.path.shift();
            if (civ.path.length === 0) {
              civ.dest = null;
              if (civ.manualMoveOrder) {
                civ.manualMoveOrder = false;
                if (this.selectedCivilian === civ) {
                  this.selectedCivilian = null;
                  this.closeUpgradePanel();
                }
              }
            }
          } else {
            civ.x += ((node.x - civ.x) / dist) * step;
            civ.y += ((node.y - civ.y) / dist) * step;
          }
        } else {
          civ.wanderTimer -= dt;
          if (civ.wanderTimer <= 0 && this.selectedCivilian !== civ) {
            civ.wanderTimer = Math.random() * 3 + 2;
            const cc = Math.floor(civ.x / TILE_SIZE);
            const cr = Math.floor(civ.y / TILE_SIZE);
            const tc = cc + Math.floor(Math.random() * 5) - 2;
            const tr = cr + Math.floor(Math.random() * 5) - 2;
            if (inBounds(tc, tr) && this.grid[tr][tc] === 0 && !this.structures.has(`${tc},${tr}`)) {
              const p = findPath(cc, cr, tc, tr, (c, r) => this.unitBlocked(c, r));
              if (p && p.length > 0 && p.length <= 4) {
                civ.path = p.map(([c, r]) => tileCenter(c, r));
              }
            }
          }
        }

        // Rescue -> Lv1 Recruit Soldier conversion on any open green Safe Zone block (tile === 2)
        const col = Math.floor(civ.x / TILE_SIZE);
        const row = Math.floor(civ.y / TILE_SIZE);
        if (inBounds(col, row) && this.grid[row][col] === 2 && this.safeZones.has(`${col},${row}`)) {
          this.civilians.splice(i, 1);
          this.savedCount++;
          this.scrap += 50;
          this.score += 200;
          this.sound.playRescue();
          this.addFloatingText('+50 Scrap Saved!', civ.x, civ.y - 12, '#00FF88');
          this.addParticles(civ.x, civ.y, '#00FF88', 14, 60);
          if (this.selectedCivilian === civ) this.selectedCivilian = null;

          const lv1 = SOLDIER_SPECS[0];
          this.soldiers.push({
            id: Math.random().toString(36).slice(2, 11),
            level: 1,
            isCommando: false,
            x: civ.x,
            y: civ.y,
            radius: 7,
            speed: 70,
            hp: lv1.maxHp,
            maxHp: lv1.maxHp,
            range: lv1.range,
            dmg: lv1.dmg,
            rate: lv1.rate,
            cooldown: 0,
            kills: 0,
            angle: -Math.PI / 2,
            path: [],
            dest: null,
            targetBunker: null,
            targetBarracks: null,
            targetEngineering: null,
            assignedHubId: null,
            manualMoveOrder: false,
            reenterCooldown: 0
          });

          for (const st of this.structures.values()) {
            if ((st.type === 'barracks' || st.type === 'engineering') && st.trainQueue && st.trainQueue.length > 0) {
              this.assignFreeRecruitToHubOrders(st);
            }
          }
          this.updateHUD();
        }
      }
    }

    // --- RESCUED SOLDIERS & TERRITORY COMMANDOS ---
    updateSoldiers(dt) {
      for (let i = this.soldiers.length - 1; i >= 0; i--) {
        const sol = this.soldiers[i];

        if (sol.hp <= 0) {
          this.soldiers.splice(i, 1);
          this.addFloatingText(sol.isCommando ? 'Commando Lost' : 'Soldier Lost', sol.x, sol.y - 14, '#FF3333');
          this.addParticles(sol.x, sol.y, sol.isCommando ? '#00E5FF' : '#2B8CFF', 14, 65);
          this.sound.playBarricadeBreak();
          if (this.selectedSoldier === sol) {
            this.selectedSoldier = null;
            this.closeUpgradePanel();
          }
          this.updateHUD();
          continue;
        }

        if (sol.reenterCooldown > 0) sol.reenterCooldown -= dt;

        if (sol.path.length > 0) {
          const node = sol.path[0];
          const dist = Math.hypot(node.x - sol.x, node.y - sol.y);
          const step = sol.speed * dt;
          if (dist <= step) {
            sol.x = node.x;
            sol.y = node.y;
            sol.path.shift();
            if (sol.path.length === 0) {
              sol.dest = null;
              sol.manualOrder = false;
              sol.isIntercepting = false;
              if (sol.manualMoveOrder) {
                sol.manualMoveOrder = false;
                if (this.selectedSoldier === sol) {
                  this.selectedSoldier = null;
                  this.closeUpgradePanel();
                }
              }
            }
          } else {
            const dx = (node.x - sol.x) / dist;
            const dy = (node.y - sol.y) / dist;
            sol.x += dx * step;
            sol.y += dy * step;
            sol.angle = Math.atan2(dy, dx);
          }
        }

        if (this.tryEnterBunkerSoldier(sol, i)) continue;
        if (this.tryEnterBarracksSoldier(sol, i)) continue;
        if (this.tryEnterEngineeringSoldier(sol, i)) continue;

        // Active 3-Tile Safe-Zone Perimeter Commando AI (v2.6.0):
        // 1) Immediately interrupt & kite backward when any zombie is < 120px
        // 2) Hold & shoot when any zombie is within 120..sol.range
        // 3) Actively intercept any zombie <= 120px of ANY Safe Zone tile or assault any Spawn Breach <= 120px of ANY Safe Zone tile across !commandoBlocked
        // 4) Recall to Barracks only when zero zombies & zero breaches threaten the 3-tile Safe Zone perimeter
        if (sol.isCommando && !sol.manualOrder && !sol.manualMoveOrder && !sol.targetBunker && !sol.targetBarracks) {
          let nearestZ = null;
          let nearestD = Infinity;
          for (const z of this.zombies) {
            if (z.hp <= 0) continue;
            const d = Math.hypot(z.x - sol.x, z.y - sol.y);
            if (d < nearestD) {
              nearestD = d;
              nearestZ = z;
            }
          }

          if (nearestZ && nearestD < 120 && sol.isIntercepting && sol.path.length > 0) {
            sol.path = [];
            sol.isIntercepting = false;
            sol.aiTimer = 0;
          } else if (nearestZ && nearestD >= 120 && nearestD <= sol.range && sol.isIntercepting && sol.path.length > 0) {
            sol.path = [];
            sol.isIntercepting = false;
          }

          if (sol.path.length === 0) {
            sol.aiTimer = (sol.aiTimer || 0) - dt;
            const scNow = Math.floor(sol.x / TILE_SIZE);
            const srNow = Math.floor(sol.y / TILE_SIZE);
            let nearestSz = null;
            let nearestSzD = Infinity;
            for (const sz of this.safeZones.values()) {
              const sd = Math.hypot(sz.x - sol.x, sz.y - sol.y);
              if (sd < nearestSzD) {
                nearestSzD = sd;
                nearestSz = sz;
              }
            }

            if (nearestZ && nearestD < 120) {
              if (sol.aiTimer <= 0) {
                sol.aiTimer = 0.20;
                const strandedOut = this.commandoBlocked(scNow, srNow);
                const curSzDist = this.minChebyshevDistToSafeZone(scNow, srNow);
                let bestScore = -Infinity;
                let pick = null;
                for (let k = 0; k < DIRS_8.length; k++) {
                  const nc = scNow + DIRS_8[k][0];
                  const nr = srNow + DIRS_8[k][1];
                  if (strandedOut) {
                    if (this.unitBlocked(nc, nr)) continue;
                    if (this.safeZones.size > 0 && this.minChebyshevDistToSafeZone(nc, nr) > curSzDist) continue;
                  } else if (this.commandoBlocked(nc, nr)) {
                    continue;
                  }
                  const cPos = tileCenter(nc, nr);
                  const dz = Math.hypot(cPos.x - nearestZ.x, cPos.y - nearestZ.y);
                  if (dz <= nearestD) continue;
                  const inFireBonus = dz <= sol.range ? 400 : 0;
                  const onSafeBonus = this.grid[nr][nc] === 2 ? 120 : 0;
                  const szBonus = nearestSz ? -Math.hypot(cPos.x - nearestSz.x, cPos.y - nearestSz.y) * 0.65 : 0;
                  const score = inFireBonus + onSafeBonus + dz + szBonus;
                  if (score > bestScore) {
                    bestScore = score;
                    pick = [nc, nr];
                  }
                }
                if (pick) {
                  sol.path = [tileCenter(pick[0], pick[1])];
                  sol.isIntercepting = false;
                }
              }
            } else if (nearestZ && nearestD <= sol.range) {
              // Zombie already within firing range (>= 120px) -> hold ground & shoot cleanly
            } else if (sol.aiTimer <= 0) {
              sol.aiTimer = 0.35;
              const perimZ = this.findNearestZombieNearSafeZone(sol.x, sol.y, 120);
              const breachTarget = this.findAssaultableSpawnBreach(sol.x, sol.y, 120);

              if (perimZ) {
                const distPerim = Math.hypot(perimZ.x - sol.x, perimZ.y - sol.y);
                if (distPerim > sol.range) {
                  const inRangeCands = [];
                  const approachCands = [];
                  for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                      if (this.commandoBlocked(c, r)) continue;
                      if (c === scNow && r === srNow) continue;
                      const cPos = tileCenter(c, r);
                      const dToZ = Math.hypot(cPos.x - perimZ.x, cPos.y - perimZ.y);
                      const dToSol = Math.hypot(cPos.x - sol.x, cPos.y - sol.y);
                      if (dToZ <= sol.range) {
                        const standoff = Math.min(dToZ, 115);
                        const safeBonus = this.grid[r][c] === 2 ? 80 : 0;
                        const score = standoff + safeBonus - dToSol * 0.6;
                        inRangeCands.push({ c, r, score });
                      } else if (dToZ >= 100) {
                        const score = -dToZ - dToSol * 0.25 + (this.grid[r][c] === 2 ? 20 : 0);
                        approachCands.push({ c, r, score });
                      }
                    }
                  }
                  const pool = inRangeCands.length > 0 ? inRangeCands : approachCands;
                  pool.sort((a, b) => b.score - a.score);
                  for (let idx = 0; idx < Math.min(3, pool.length); idx++) {
                    const cand = pool[idx];
                    const p = findPath(scNow, srNow, cand.c, cand.r, (c, r) => this.commandoBlocked(c, r));
                    if (p && p.length > 0) {
                      sol.path = p.map(([c, r]) => tileCenter(c, r));
                      sol.isIntercepting = true;
                      break;
                    }
                  }
                }
              } else if (breachTarget) {
                const distB = Math.hypot(breachTarget.x - sol.x, breachTarget.y - sol.y);
                if (distB > sol.range) {
                  const cands = [];
                  for (let r = 0; r < ROWS; r++) {
                    for (let c = 0; c < COLS; c++) {
                      if (this.commandoBlocked(c, r)) continue;
                      if (c === scNow && r === srNow) continue;
                      const cPos = tileCenter(c, r);
                      const dToB = Math.hypot(cPos.x - breachTarget.x, cPos.y - breachTarget.y);
                      if (dToB <= sol.range) {
                        const dToSol = Math.hypot(cPos.x - sol.x, cPos.y - sol.y);
                        const safeBonus = this.grid[r][c] === 2 ? 120 : 0;
                        const score = safeBonus - dToSol + Math.min(dToB, 115) * 0.25;
                        cands.push({ c, r, score });
                      }
                    }
                  }
                  cands.sort((a, b) => b.score - a.score);
                  for (let idx = 0; idx < Math.min(3, cands.length); idx++) {
                    const cand = cands[idx];
                    const p = findPath(scNow, srNow, cand.c, cand.r, (c, r) => this.commandoBlocked(c, r));
                    if (p && p.length > 0) {
                      sol.path = p.map(([c, r]) => tileCenter(c, r));
                      sol.isIntercepting = true;
                      break;
                    }
                  }
                }
              } else if (!this.hasZombieNearSafeZone(120) && (sol.reenterCooldown || 0) <= 0) {
                let bestBar = null;
                let bestBarD = Infinity;
                for (const st of this.structures.values()) {
                  const activeT = st.activeTrainers ? st.activeTrainers.length : 0;
                  if (st.type === 'barracks' && st.occupants && st.occupants.length + activeT < (st.capacity || 4)) {
                    const d = Math.hypot(st.x - sol.x, st.y - sol.y);
                    if (d < bestBarD) {
                      bestBarD = d;
                      bestBar = st;
                    }
                  }
                }
                if (bestBar) {
                  const p = findPath(scNow, srNow, bestBar.col, bestBar.row, (c, r) =>
                    (c === bestBar.col && r === bestBar.row) ? false : this.commandoBlocked(c, r)
                  );
                  if (p) {
                    sol.path = p.map(([c, r]) => tileCenter(c, r));
                    sol.targetBarracks = bestBar;
                    sol.isIntercepting = false;
                  }
                }
              }
            }
          }
        }

        // Safe zone regeneration (+3 HP/s) & Commando entrenchment (+15% fire rate while standing on green Safe Zone)
        const sc = Math.floor(sol.x / TILE_SIZE);
        const sr = Math.floor(sol.y / TILE_SIZE);
        const onSafeZone = inBounds(sc, sr) && this.grid[sr][sc] === 2;
        if (onSafeZone && sol.hp < sol.maxHp) {
          sol.hp = Math.min(sol.maxHp, sol.hp + 3 * dt);
        }

        // Auto-fire at zombies within range (Commandos prioritize Runners first); ONLY Commandos assault Spawn Breaches (1.25x dmg)
        const effectiveRate = (sol.isCommando && onSafeZone) ? sol.rate * 0.85 : sol.rate;
        sol.cooldown = Math.max(0, sol.cooldown - dt);
        if (sol.cooldown <= 0) {
          let bestRunner = null;
          let bestRunnerD = sol.range;
          let bestZ = null;
          let bestD = sol.range;
          for (const z of this.zombies) {
            if (z.hp <= 0) continue;
            const d = Math.hypot(z.x - sol.x, z.y - sol.y);
            if (sol.isCommando && z.type === 'runner' && d <= bestRunnerD) {
              bestRunnerD = d;
              bestRunner = z;
            }
            if (d <= bestD) {
              bestD = d;
              bestZ = z;
            }
          }
          const fireTarget = (sol.isCommando && bestRunner) ? bestRunner : bestZ;
          const hitDmg = Math.round(sol.dmg * this.getSafeZoneDmgMult());
          if (fireTarget) {
            sol.cooldown = effectiveRate;
            sol.angle = Math.atan2(fireTarget.y - sol.y, fireTarget.x - sol.x);
            this.sound.playLaser(720, 340, 0.05);
            this.projectiles.push({
              type: 'bullet',
              x1: sol.x,
              y1: sol.y,
              x2: fireTarget.x,
              y2: fireTarget.y,
              color: '#38E8FF',
              life: 0.1,
              maxLife: 0.1
            });
            fireTarget.hp -= hitDmg;
            if (fireTarget.hp <= 0) sol.kills = (sol.kills || 0) + 1;
            this.addParticles(fireTarget.x, fireTarget.y, '#38E8FF', 3, 28);
          } else if (sol.isCommando) {
            const breach = this.findSpawnBreachInRange(sol.x, sol.y, sol.range);
            if (breach) {
              sol.cooldown = effectiveRate;
              sol.angle = Math.atan2(breach.y - sol.y, breach.x - sol.x);
              this.sound.playLaser(720, 340, 0.05);
              this.projectiles.push({
                type: 'bullet',
                x1: sol.x,
                y1: sol.y,
                x2: breach.x,
                y2: breach.y,
                color: '#00E5FF',
                life: 0.1,
                maxLife: 0.1
              });
              const breachDmg = Math.round(sol.dmg * 1.25 * this.getSafeZoneDmgMult());
              this.damageSpawnBreach(breach, breachDmg, sol);
            }
          }
        }
      }
    }

    hasZombieNearSafeZone(radius = 120) {
      for (const z of this.zombies) {
        if (z.hp <= 0) continue;
        for (const sz of this.safeZones.values()) {
          if (Math.hypot(z.x - sz.x, z.y - sz.y) <= radius) return true;
        }
      }
      return false;
    }

    findNearestZombieNearSafeZone(x, y, radius = 120) {
      let bestRunner = null;
      let bestRunnerD = Infinity;
      let bestZ = null;
      let bestD = Infinity;
      for (const z of this.zombies) {
        if (z.hp <= 0) continue;
        let nearSz = false;
        for (const sz of this.safeZones.values()) {
          if (Math.hypot(z.x - sz.x, z.y - sz.y) <= radius) {
            nearSz = true;
            break;
          }
        }
        if (!nearSz) continue;
        const d = Math.hypot(z.x - x, z.y - y);
        if (z.type === 'runner' && d <= 160 && d < bestRunnerD) {
          bestRunnerD = d;
          bestRunner = z;
        }
        if (d < bestD) {
          bestD = d;
          bestZ = z;
        }
      }
      return bestRunner || bestZ;
    }

    findAssaultableSpawnBreach(x, y, radius = 120) {
      if (this.isTutorialMode && this.tutorialStep < 7) return null;
      const tutReady = this.isTutorialMode && this.tutorialStep >= 7;
      let best = null;
      let bestD = Infinity;
      for (const sp of this.spawns.values()) {
        if (sp.hp <= 0) continue;
        let inPerim = tutReady;
        if (!inPerim) {
          for (const sz of this.safeZones.values()) {
            const dPx = Math.hypot(sp.x - sz.x, sp.y - sz.y);
            const dCheb = Math.max(Math.abs(sp.col - sz.col), Math.abs(sp.row - sz.row));
            if (dPx <= radius || dCheb <= 3) {
              inPerim = true;
              break;
            }
          }
        }
        if (!inPerim) continue;
        const d = Math.hypot(sp.x - x, sp.y - y);
        if (d < bestD) {
          bestD = d;
          best = sp;
        }
      }
      return best;
    }

    hasSpawnBreachNearSafeZone(radius = 120) {
      return !!this.findAssaultableSpawnBreach(WIDTH * 0.5, HEIGHT * 0.5, radius);
    }

    hasZombieThreatNearBase(radius) {
      for (const z of this.zombies) {
        if (z.hp <= 0) continue;
        for (const st of this.structures.values()) {
          if (Math.hypot(z.x - st.x, z.y - st.y) <= radius) return true;
        }
        for (const sz of this.safeZones.values()) {
          if (Math.hypot(z.x - sz.x, z.y - sz.y) <= radius) return true;
        }
      }
      return false;
    }

    // --- AUTO-REPAIR ENGINEERS (Strict Safe-Zone Territory Confinement & Adjacent/On-Tile 0-Scrap Repair) ---
    findNearestDamagedStructureOrSafeZone(x, y) {
      let best = null;
      let bestD = Infinity;
      for (const st of this.structures.values()) {
        if (st.hp < st.maxHp && this.isReachableByEngineerTerritory(st.col, st.row, st)) {
          const d = Math.hypot(st.x - x, st.y - y);
          if (d < bestD) {
            bestD = d;
            best = st;
          }
        }
      }
      for (const sz of this.safeZones.values()) {
        if (sz.hp < sz.maxHp && this.isReachableByEngineerTerritory(sz.col, sz.row, sz)) {
          const d = Math.hypot(sz.x - x, sz.y - y);
          if (d < bestD) {
            bestD = d;
            best = sz;
          }
        }
      }
      return best;
    }

    isEngineerAtRepairAnchor(eng, target) {
      if (!eng || !target) return false;
      const ec = Math.floor(eng.x / TILE_SIZE);
      const er = Math.floor(eng.y / TILE_SIZE);
      if (this.engineerBlocked(ec, er)) return false;
      const anchors = this.getEngineerEligibleAnchors(target);
      if (anchors.length === 0) return false;
      if (target.type !== 'wall' && Math.hypot(target.x - eng.x, target.y - eng.y) <= TILE_SIZE * 1.45) {
        return true;
      }
      return anchors.some(([ac, ar]) => Math.hypot(tileCenter(ac, ar).x - eng.x, tileCenter(ac, ar).y - eng.y) <= 24);
    }

    updateEngineers(dt) {
      for (let i = this.engineers.length - 1; i >= 0; i--) {
        const eng = this.engineers[i];

        if (eng.hp <= 0) {
          this.engineers.splice(i, 1);
          this.addFloatingText('Engineer Lost', eng.x, eng.y - 14, '#FF3333');
          this.addParticles(eng.x, eng.y, '#FFD23F', 14, 65);
          this.sound.playBarricadeBreak();
          if (this.selectedEngineer === eng) {
            this.selectedEngineer = null;
            this.closeUpgradePanel();
          }
          this.updateHUD();
          continue;
        }

        if (eng.reenterCooldown > 0) eng.reenterCooldown -= dt;

        // Safe zone regeneration (+3 HP/s while standing on a Safe Zone block)
        const ec = Math.floor(eng.x / TILE_SIZE);
        const er = Math.floor(eng.y / TILE_SIZE);
        if (inBounds(ec, er) && this.grid[er][ec] === 2 && eng.hp < eng.maxHp) {
          eng.hp = Math.min(eng.maxHp, eng.hp + 3 * dt);
        }

        // Follow active path
        if (eng.path.length > 0) {
          const node = eng.path[0];
          const dist = Math.hypot(node.x - eng.x, node.y - eng.y);
          const step = eng.speed * dt;
          if (dist <= step) {
            eng.x = node.x;
            eng.y = node.y;
            eng.path.shift();
            if (eng.path.length === 0) {
              eng.dest = null;
              eng.manualOrder = false;
              if (eng.manualMoveOrder) {
                eng.manualMoveOrder = false;
                if (this.selectedEngineer === eng) {
                  this.selectedEngineer = null;
                  this.closeUpgradePanel();
                }
              }
            }
          } else {
            const dx = (node.x - eng.x) / dist;
            const dy = (node.y - eng.y) / dist;
            eng.x += dx * step;
            eng.y += dy * step;
            eng.angle = Math.atan2(dy, dx);
          }
        }

        if (this.tryEnterEngineeringEngineer(eng, i)) continue;

        // Validate current repairTarget (checks eligibility too)
        if (eng.repairTarget) {
          const k = `${eng.repairTarget.col},${eng.repairTarget.row}`;
          const exists = this.structures.get(k) === eng.repairTarget || this.safeZones.get(k) === eng.repairTarget;
          const ok = exists && eng.repairTarget.hp < eng.repairTarget.maxHp && this.getEngineerEligibleAnchors(eng.repairTarget).length > 0;
          if (!ok) {
            eng.repairTarget = null;
          }
        }

        // If standing on a valid anchor for target (Safe Zone structure OR Safe Zone tile touching connected Barricade chain), weld at $0 Scrap!
        let target = eng.repairTarget || this.findNearestDamagedStructureOrSafeZone(eng.x, eng.y);
        if (target && this.isEngineerAtRepairAnchor(eng, target)) {
          eng.repairTarget = target;
          eng.path = [];
          eng.angle = Math.atan2(target.y - eng.y, target.x - eng.x);
          const heal = eng.repairRate * dt;
          const before = target.hp;
          target.hp = Math.min(target.maxHp, target.hp + heal);
          eng.repairedTotal = (eng.repairedTotal || 0) + (target.hp - before);
          if (target.type === 'safezone') this.recalcBaseIntegrity();
          if (Math.random() < 0.25) {
            this.addParticles(target.x + (Math.random() - 0.5) * 14, target.y + (Math.random() - 0.5) * 14, '#00E5FF', 1, 22);
          }
          continue;
        }

        // When idle, scan for damaged territory targets; if none, return to closest Engineering bay for standby +6 HP/s regen
        if (!eng.manualOrder && !eng.manualMoveOrder && eng.path.length === 0 && !eng.targetEngineering) {
          eng.scanTimer = (eng.scanTimer || 0) - dt;
          if (eng.scanTimer <= 0) {
            eng.scanTimer = 0.65;
            if (target) {
              this.commandEngineerToTarget(eng, target);
            } else if ((eng.reenterCooldown || 0) <= 0) {
              let bestBay = null;
              let bestBayD = Infinity;
              for (const st of this.structures.values()) {
                const activeT = st.activeTrainers ? st.activeTrainers.length : 0;
                if (st.type === 'engineering' && st.occupants && st.occupants.length + activeT < (st.capacity || 4)) {
                  const d = Math.hypot(st.x - eng.x, st.y - eng.y);
                  if (d < bestBayD) {
                    bestBayD = d;
                    bestBay = st;
                  }
                }
              }
              if (bestBay) {
                const p = findPath(ec, er, bestBay.col, bestBay.row, (c, r) =>
                  (c === bestBay.col && r === bestBay.row) ? false : this.engineerBlocked(c, r)
                );
                if (p) {
                  eng.path = p.map(([c, r]) => tileCenter(c, r));
                  eng.targetEngineering = bestBay;
                }
              }
            }
          }
        }
      }
    }

    // --- ZOMBIES (Per-Block Safe Zone Attacks, Fixed Brute-Breach Damage, Demolisher & Anti-Tower Wrecker) ---
    getZombieStructDmg(z) {
      if (z && z.bruteBreach) {
        return z.type === 'demolisher' ? 16 : 12;
      }
      return z ? z.dmg : 10;
    }

    zombieRockOnly(c, r) {
      return !inBounds(c, r) || this.grid[r][c] === 1;
    }

    zombieAvoidStructures(c, r) {
      return !inBounds(c, r) || this.grid[r][c] === 1 || this.structures.has(`${c},${r}`);
    }

    destroyStructure(st) {
      if (!st) return;
      if ((st.type === 'bunker' || st.type === 'barracks' || st.type === 'engineering') && st.occupants && st.occupants.length > 0) {
        this.releaseGarrisonedUnits(st, true);
      } else {
        this.addFloatingText('BREACHED!', st.x, st.y - 10, '#FF3333');
      }
      if (st.type === 'barracks' || st.type === 'engineering') {
        this.ejectHubTrainingRecruitsAndRefund(st, false);
      }
      if (st.trainQueue) st.trainQueue = [];
      st.trainTimer = 0;
      const key = `${st.col},${st.row}`;
      this.structures.delete(key);
      if (this.grid[st.row][st.col] === 4) {
        this.grid[st.row][st.col] = this.safeZones.has(key) ? 2 : 0;
      }
      this.sound.playBarricadeBreak();
      this.addParticles(st.x, st.y, '#888888', 18, 90);
      if (this.selectedStructure === st) this.closeUpgradePanel();
    }

    destroySafeZoneBlock(sz) {
      if (!sz) return;
      const key = `${sz.col},${sz.row}`;
      this.safeZones.delete(key);
      if (this.grid[sz.row][sz.col] === 2) {
        const topStruct = this.structures.get(key);
        this.grid[sz.row][sz.col] = topStruct && topStruct.type === 'wall' ? 4 : 0;
      }
      this.recalcBaseIntegrity();
      this.sound.playBarricadeBreak();
      this.addFloatingText('SAFE ZONE LOST!', sz.x, sz.y - 12, '#FF3333');
      this.addParticles(sz.x, sz.y, '#00E08A', 18, 85);
      if (this.selectedStructure === sz) this.closeUpgradePanel();
      this.showStatus(`A Safe Zone block at (${sz.col}, ${sz.row}) was destroyed! (${this.safeZones.size} remaining)`);
      this.updateHUD();
    }

    findWreckerTargetStructure(z) {
      let bestPrimary = null;
      let bestPrimaryD = Infinity;
      let bestWall = null;
      let bestWallD = Infinity;

      for (const st of this.structures.values()) {
        const d = Math.hypot(st.x - z.x, st.y - z.y);
        if (st.type !== 'wall') {
          if (d < bestPrimaryD) {
            bestPrimaryD = d;
            bestPrimary = st;
          }
        } else if (d < bestWallD) {
          bestWallD = d;
          bestWall = st;
        }
      }
      return bestPrimary || bestWall;
    }

    findWeakestNearbyBarricade(z, maxDist = 60) {
      let best = null;
      let bestLv = Infinity;
      let bestHp = Infinity;
      let bestD = Infinity;
      for (const st of this.structures.values()) {
        if (st.type !== 'wall' || st.hp <= 0) continue;
        const d = Math.hypot(st.x - z.x, st.y - z.y);
        if (d > maxDist) continue;
        if (
          st.level < bestLv ||
          (st.level === bestLv && (st.hp < bestHp || (st.hp === bestHp && d < bestD)))
        ) {
          bestLv = st.level;
          bestHp = st.hp;
          bestD = d;
          best = st;
        }
      }
      return best;
    }

    resolveZombieWallTarget(z, st) {
      if (!st || st.type !== 'wall') return st;
      const weak = this.findWeakestNearbyBarricade(z, 60);
      if (weak && (weak.level < st.level || (weak.level === st.level && weak.hp < st.hp))) {
        return weak;
      }
      return st;
    }

    updateZombies(dt) {
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];

        if (z.hp <= 0) {
          this.zombies.splice(i, 1);
          const lastStand = this.safeZones.size <= 5;
          const bounty = lastStand ? Math.ceil(z.reward * 1.25) : z.reward;
          this.scrap += bounty;
          this.score += bounty * 10;
          this.sound.playHit();
          this.addFloatingText(`+$${bounty}`, z.x, z.y - 10, lastStand ? '#00E5FF' : '#FFD700');
          this.addParticles(z.x, z.y, z.color, 14, 70);
          this.updateHUD();
          continue;
        }

        let activeSlowFactor = 0;
        if (z.slowTimer > 0) {
          z.slowTimer -= dt;
          activeSlowFactor = z.slowFactor || 0;
          z.speed = z.baseSpeed * (1 - z.slowFactor);
          if (z.slowTimer <= 0) {
            z.speed = z.baseSpeed;
            z.slowFactor = 0;
            activeSlowFactor = 0;
          }
        } else {
          z.speed = z.baseSpeed;
        }
        const attackInterval = activeSlowFactor > 0 ? (0.5 / Math.max(0.2, 1 - activeSlowFactor)) : 0.5;

        let tx = -1;
        let ty = -1;
        let closest = Infinity;

        // 0. If Wrecker, prioritize hunting Turrets, Combat Bunkers & Barracks first, then Barricades
        if (z.type === 'wrecker') {
          const targetSt = this.findWreckerTargetStructure(z);
          if (targetSt) {
            tx = targetSt.x;
            ty = targetSt.y;
            closest = Math.hypot(tx - z.x, ty - z.y);
          }
        }

        // 1. Check civilians for contact infection (Demolishers, Wreckers & random Brute-Breachers ignore chasing civilians outside bite range)
        for (const civ of this.civilians) {
          const d = Math.hypot(civ.x - z.x, civ.y - z.y);
          if (d <= 18 && !civ.isIncubating) {
            civ.isIncubating = true;
            civ.incubationTimer = 0;
            this.sound.playInfection();
            this.addFloatingText('Civilian Infected!', civ.x, civ.y - 14, '#FF8800');
            this.showStatus('A civilian was bitten! Incubation has started!');
          }
          if (z.type !== 'demolisher' && z.type !== 'wrecker' && !z.bruteBreach && !civ.isIncubating && d < closest) {
            closest = d;
            tx = civ.x;
            ty = civ.y;
          }
        }

        // 2. Check Soldiers & Engineers for melee combat
        let targetUnit = null;
        let closestUnitD = 300;
        for (const sol of this.soldiers) {
          const d = Math.hypot(sol.x - z.x, sol.y - z.y);
          if (d <= 18) {
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              sol.hp -= z.dmg;
              this.sound.playHit();
              this.addParticles(sol.x, sol.y, '#FF3333', 5, 35);
            }
          }
          if (d <= closestUnitD) {
            closestUnitD = d;
            targetUnit = sol;
          }
        }
        for (const eng of this.engineers) {
          const d = Math.hypot(eng.x - z.x, eng.y - z.y);
          if (d <= 18) {
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              eng.hp -= z.dmg;
              this.sound.playHit();
              this.addParticles(eng.x, eng.y, '#FF3333', 5, 35);
            }
          }
          if (d <= closestUnitD) {
            closestUnitD = d;
            targetUnit = eng;
          }
        }

        if (z.type !== 'demolisher' && !z.bruteBreach && closest === Infinity && targetUnit) {
          closest = closestUnitD;
          tx = targetUnit.x;
          ty = targetUnit.y;
        }

        // 3. Target nearest active green Safe Zone block
        if (closest === Infinity) {
          for (const sz of this.safeZones.values()) {
            const d = Math.hypot(sz.x - z.x, sz.y - z.y);
            if (d < closest) {
              closest = d;
              tx = sz.x;
              ty = sz.y;
            }
          }
        }

        const zc = Math.floor(z.x / TILE_SIZE);
        const zr = Math.floor(z.y / TILE_SIZE);
        const structDmg = this.getZombieStructDmg(z);

        // Structures built atop a Safe Zone absorb zombie hits BEFORE the underlying Safe Zone block
        const rawStHere = this.structures.get(`${zc},${zr}`);
        const stHere = this.resolveZombieWallTarget(z, rawStHere);
        if (stHere) {
          z.angle = Math.atan2(stHere.y - z.y, stHere.x - z.x);
          z.attackTimer -= dt;
          if (z.attackTimer <= 0) {
            z.attackTimer = attackInterval;
            stHere.hp -= structDmg;
            stHere.flash = 0.14;
            this.sound.playHit();
            const sparkCol = z.bruteBreach || z.type === 'demolisher' ? '#FF9A1F' : z.type === 'wrecker' ? '#B833FF' : '#D2B48C';
            this.addParticles(stHere.x, stHere.y, sparkCol, 6, 45);
            if (stHere.hp <= 0) {
              this.destroyStructure(stHere);
              z.path = [];
              z.repathTimer = 0;
            }
          }
          continue;
        }

        // Per-Block Safe Zone Attack: zombies reaching an exposed Safe Zone stay and attack it until its HP hits 0!
        const szHere = this.safeZones.get(`${zc},${zr}`);
        if (szHere) {
          z.angle = Math.atan2(szHere.y - z.y, szHere.x - z.x);
          z.attackTimer -= dt;
          if (z.attackTimer <= 0) {
            z.attackTimer = attackInterval;
            szHere.hp -= structDmg;
            szHere.flash = 0.14;
            this.recalcBaseIntegrity();
            this.sound.playHit();
            this.addParticles(szHere.x, szHere.y, '#00E08A', 5, 38);
            if (szHere.hp <= 0) {
              this.destroySafeZoneBlock(szHere);
              z.path = [];
              z.repathTimer = 0;
            } else {
              this.updateHUD();
            }
          }
          continue;
        }

        // Repath: non-linear randomized shortest path + persistent lateral lane jitter away from rock tiles
        z.repathTimer -= dt;
        if (tx !== -1 && z.repathTimer <= 0) {
          z.repathTimer = 0.6 + Math.random() * 0.4;
          const gc = Math.floor(tx / TILE_SIZE);
          const gr = Math.floor(ty / TILE_SIZE);
          let path = null;
          if (z.type === 'demolisher' || z.type === 'wrecker' || z.bruteBreach) {
            path = findZombiePath(zc, zr, gc, gr, (c, r) => this.zombieRockOnly(c, r));
          } else {
            path = findZombiePath(zc, zr, gc, gr, (c, r) => this.zombieAvoidStructures(c, r));
            if (!path) {
              path = findZombiePath(zc, zr, gc, gr, (c, r) => this.zombieRockOnly(c, r));
            }
          }
          if (path) {
            const rawOx = z.laneOffsetX || 0;
            const rawOy = z.laneOffsetY || 0;
            z.path = path.map(([c, r], idx) => {
              const base = tileCenter(c, r);
              if (idx >= path.length - 1) return base;
              const dc = rawOx > 0 ? 1 : rawOx < 0 ? -1 : 0;
              const dr = rawOy > 0 ? 1 : rawOy < 0 ? -1 : 0;
              const ox = (dc !== 0 && (!inBounds(c + dc, r) || this.grid[r][c + dc] === 1)) ? 0 : rawOx;
              const oy = (dr !== 0 && (!inBounds(c, r + dr) || this.grid[r + dr][c] === 1)) ? 0 : rawOy;
              return { x: base.x + ox, y: base.y + oy };
            });
          }
        }

        // Follow path or attack blocking structure / Safe Zone block
        if (z.path.length > 0) {
          const node = z.path[0];
          const nc = Math.floor(node.x / TILE_SIZE);
          const nr = Math.floor(node.y / TILE_SIZE);
          const st = this.resolveZombieWallTarget(z, this.structures.get(`${nc},${nr}`) || this.structures.get(`${zc},${zr}`));
          const szNext = this.safeZones.get(`${nc},${nr}`);

          if (st) {
            z.angle = Math.atan2(st.y - z.y, st.x - z.x);
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              st.hp -= structDmg;
              st.flash = 0.14;
              this.sound.playHit();
              const sparkCol = z.type === 'wrecker' ? '#B833FF' : z.type === 'demolisher' ? '#FF9A1F' : '#D2B48C';
              this.addParticles(st.x, st.y, sparkCol, 6, 45);
              if (st.hp <= 0) {
                this.destroyStructure(st);
                z.path = [];
                z.repathTimer = 0;
              }
            }
          } else if (szNext && Math.hypot(szNext.x - z.x, szNext.y - z.y) <= TILE_SIZE * 0.85) {
            z.angle = Math.atan2(szNext.y - z.y, szNext.x - z.x);
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              szNext.hp -= structDmg;
              szNext.flash = 0.14;
              this.recalcBaseIntegrity();
              this.sound.playHit();
              this.addParticles(szNext.x, szNext.y, '#00E08A', 5, 38);
              if (szNext.hp <= 0) {
                this.destroySafeZoneBlock(szNext);
                z.path = [];
                z.repathTimer = 0;
              } else {
                this.updateHUD();
              }
            }
          } else {
            z.angle = Math.atan2(node.y - z.y, node.x - z.x);
            this.stepToward(z, node.x, node.y, z.speed * dt, true);
          }
        } else if (tx !== -1 && closest < TILE_SIZE * 1.5 && closest !== Infinity) {
          const tc = Math.floor(tx / TILE_SIZE);
          const tr = Math.floor(ty / TILE_SIZE);
          const st = this.resolveZombieWallTarget(z, this.structures.get(`${tc},${tr}`) || this.structures.get(`${zc},${zr}`));
          const szTarget = this.safeZones.get(`${tc},${tr}`);
          if (st) {
            z.angle = Math.atan2(st.y - z.y, st.x - z.x);
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              st.hp -= structDmg;
              st.flash = 0.14;
              this.sound.playHit();
              this.addParticles(st.x, st.y, '#B833FF', 6, 45);
              if (st.hp <= 0) {
                this.destroyStructure(st);
                z.path = [];
                z.repathTimer = 0;
              }
            }
          } else if (szTarget) {
            z.angle = Math.atan2(szTarget.y - z.y, szTarget.x - z.x);
            z.attackTimer -= dt;
            if (z.attackTimer <= 0) {
              z.attackTimer = attackInterval;
              szTarget.hp -= structDmg;
              szTarget.flash = 0.14;
              this.recalcBaseIntegrity();
              this.sound.playHit();
              this.addParticles(szTarget.x, szTarget.y, '#00E08A', 5, 38);
              if (szTarget.hp <= 0) {
                this.destroySafeZoneBlock(szTarget);
                z.path = [];
                z.repathTimer = 0;
              } else {
                this.updateHUD();
              }
            }
          } else {
            z.angle = Math.atan2(ty - z.y, tx - z.x);
            this.stepToward(z, tx, ty, z.speed * dt, false);
          }
        }
      }
    }

    stepToward(e, x, y, step, shiftPath) {
      const dist = Math.hypot(x - e.x, y - e.y);
      if (dist <= step || dist === 0) {
        e.x = x;
        e.y = y;
        if (shiftPath) e.path.shift();
      } else {
        e.x += ((x - e.x) / dist) * step;
        e.y += ((y - e.y) / dist) * step;
      }
    }

    // --- SMART TOWER & BUNKER TARGETING (Sniper prioritizes Demolisher/Wrecker; Sentry/Bunker target closest front; fallback to Spawn Breaches) ---
    updateStructures(dt) {
      for (const sz of this.safeZones.values()) {
        if (sz.flash > 0) sz.flash -= dt;
      }
      for (const sp of this.spawns.values()) {
        if (sp.flash > 0) sp.flash -= dt;
        sp.turretLocked = false;
        sp.timeSinceHit = (sp.timeSinceHit || 0) + dt;
        if (sp.hp > 0 && sp.hp < sp.maxHp && sp.timeSinceHit >= 4.0) {
          sp.hp = Math.min(sp.maxHp, sp.hp + 15 * dt);
          sp.isRegenerating = true;
        } else {
          sp.isRegenerating = false;
        }
      }

      for (const struct of this.structures.values()) {
        if (struct.flash > 0) struct.flash -= dt;
        if (struct.type === 'wall' || struct.type === 'gate') continue;

        // Safe-Zone Barracks: heals occupants (+6 HP/s), fires out (aura-scaled), processes 4 parallel activeTrainers & auto-dispatches queued orders
        if (struct.type === 'barracks') {
          const healRate = STRUCTURE_SPECS.barracks.healRate || 6;
          const auraMult = this.getSafeZoneDmgMult();
          let zombieInFireRange = false;

          if (struct.occupants && struct.occupants.length > 0) {
            for (const sol of struct.occupants) {
              if (sol.hp > 0 && sol.hp < sol.maxHp) {
                sol.hp = Math.min(sol.maxHp, sol.hp + healRate * dt);
              }
              const cSpec = COMMANDO_SPECS[Math.max(0, Math.min(2, (struct.level || 1) - 1))];
              const sRange = sol.isCommando ? (sol.range || cSpec.range) : 110;
              const sRate = sol.isCommando ? (sol.rate || cSpec.rate) : 0.70;
              const baseDmg = sol.isCommando ? (sol.dmg || cSpec.dmg) : 8;
              const sDmg = Math.round(baseDmg * auraMult);

              sol.cooldown = Math.max(0, (sol.cooldown || 0) - dt);
              if (sol.cooldown > 0) continue;

              let bestRunner = null;
              let bestRunnerD = sRange;
              let bestZ = null;
              let bestD = sRange;
              for (const z of this.zombies) {
                if (z.hp <= 0) continue;
                const d = Math.hypot(z.x - struct.x, z.y - struct.y);
                if (sol.isCommando && z.type === 'runner' && d <= bestRunnerD) {
                  bestRunnerD = d;
                  bestRunner = z;
                }
                if (d <= bestD) {
                  bestD = d;
                  bestZ = z;
                }
              }
              const fireTarget = (sol.isCommando && bestRunner) ? bestRunner : bestZ;

              if (fireTarget) {
                zombieInFireRange = true;
                sol.cooldown = sRate;
                struct.angle = Math.atan2(fireTarget.y - struct.y, fireTarget.x - struct.x);
                this.sound.playLaser(720, 340, 0.05);
                this.projectiles.push({
                  type: 'bullet',
                  x1: struct.x,
                  y1: struct.y,
                  x2: fireTarget.x,
                  y2: fireTarget.y,
                  color: sol.isCommando ? '#00E5FF' : '#38E8FF',
                  life: 0.1,
                  maxLife: 0.1
                });
                fireTarget.hp -= sDmg;
                if (fireTarget.hp <= 0) {
                  sol.kills = (sol.kills || 0) + 1;
                  struct.kills = (struct.kills || 0) + 1;
                }
                this.addParticles(fireTarget.x, fireTarget.y, sol.isCommando ? '#00E5FF' : '#38E8FF', 3, 28);
              }
            }

            // Standby Commando auto-deploy whenever any zombie OR Red Spawn Breach is within 3 tiles (<= 120 px) of ANY green Safe Zone tile
            struct._deployCd = Math.max(0, (struct._deployCd || 0) - dt);
            if (struct._deployCd <= 0) {
              struct._deployCd = 0.5;
              const cIdx = struct.occupants.findIndex((u) => u.isCommando);
              if (cIdx !== -1 && (this.hasZombieNearSafeZone(120) || this.hasSpawnBreachNearSafeZone(120))) {
                while (true) {
                  const idx = struct.occupants.findIndex((u) => u.isCommando);
                  if (idx === -1) break;
                  const comm = struct.occupants.splice(idx, 1)[0];
                  const exitPos = this.findSafeExitPos(struct, false, false, true);
                  comm.x = exitPos.x;
                  comm.y = exitPos.y;
                  comm.path = [];
                  comm.dest = null;
                  comm.targetBarracks = null;
                  comm.manualOrder = false;
                  comm.manualMoveOrder = false;
                  comm.reenterCooldown = 2.0;
                  comm.aiTimer = 0;
                  this.soldiers.push(comm);
                }
              }
            }
          }

          if (struct.trainQueue && struct.trainQueue.length > 0) {
            struct._dispatchCd = (struct._dispatchCd || 0) - dt;
            if (struct._dispatchCd <= 0) {
              struct._dispatchCd = 0.4;
              this.assignFreeRecruitToHubOrders(struct);
            }
          }
          if (struct.activeTrainers && struct.activeTrainers.length > 0) {
            for (let tIdx = struct.activeTrainers.length - 1; tIdx >= 0; tIdx--) {
              const tr = struct.activeTrainers[tIdx];
              tr.timer -= dt;
              if (tr.timer <= 0) {
                struct.activeTrainers.splice(tIdx, 1);
                this.completeBarracksTraining(struct, tr);
              }
            }
            struct.trainTimer = struct.activeTrainers.length > 0 ? Math.min(...struct.activeTrainers.map((t) => t.timer)) : 0;
          } else {
            struct.trainTimer = 0;
          }
          continue;
        }

        // Safe-Zone Engineering: heals occupants (+6 HP/s), processes 4 parallel activeTrainers, auto-dispatches queued orders & auto-deploys Engineers
        if (struct.type === 'engineering') {
          const healRate = STRUCTURE_SPECS.engineering.healRate || 6;
          if (struct.occupants && struct.occupants.length > 0) {
            for (const u of struct.occupants) {
              if (u.hp < u.maxHp) {
                u.hp = Math.min(u.maxHp, u.hp + healRate * dt);
              }
            }
            struct._deployCd = Math.max(0, (struct._deployCd || 0) - dt);
            if (struct._deployCd <= 0) {
              struct._deployCd = 0.5;
              const eIdx = struct.occupants.findIndex((u) => u.unitType === 'engineer');
              if (eIdx !== -1) {
                const damagedTarget = this.findNearestDamagedStructureOrSafeZone(struct.x, struct.y);
                if (damagedTarget) {
                  const eng = struct.occupants.splice(eIdx, 1)[0];
                  const exitPos = this.findSafeExitPos(struct, false, true);
                  eng.x = exitPos.x;
                  eng.y = exitPos.y;
                  eng.path = [];
                  eng.dest = null;
                  eng.targetEngineering = null;
                  eng.manualOrder = false;
                  eng.manualMoveOrder = false;
                  eng.reenterCooldown = 2.0;
                  this.engineers.push(eng);
                  this.commandEngineerToTarget(eng, damagedTarget);
                }
              }
            }
          }
          if (struct.trainQueue && struct.trainQueue.length > 0) {
            struct._dispatchCd = (struct._dispatchCd || 0) - dt;
            if (struct._dispatchCd <= 0) {
              struct._dispatchCd = 0.4;
              this.assignFreeRecruitToHubOrders(struct);
            }
          }
          if (struct.activeTrainers && struct.activeTrainers.length > 0) {
            for (let tIdx = struct.activeTrainers.length - 1; tIdx >= 0; tIdx--) {
              const tr = struct.activeTrainers[tIdx];
              tr.timer -= dt;
              if (tr.timer <= 0) {
                struct.activeTrainers.splice(tIdx, 1);
                this.completeEngineeringTraining(struct, tr);
              }
            }
            struct.trainTimer = struct.activeTrainers.length > 0 ? Math.min(...struct.activeTrainers.map((t) => t.timer)) : 0;
          } else {
            struct.trainTimer = 0;
          }
          continue;
        }

        // Safe-Zone Habitat: processes queued Civilian recruitment (maxQueue = 20)
        if (struct.type === 'habitat') {
          if (struct.trainQueue && struct.trainQueue.length > 0 && struct.trainTimer <= 0) {
            const hLv = STRUCTURE_SPECS.habitat.levels[(struct.level || 1) - 1];
            struct.trainDuration = hLv.trainDuration || 3.5;
            struct.trainTimer = struct.trainDuration;
            struct.trainQueue[0].started = true;
          }
          if (struct.trainTimer > 0) {
            struct.trainTimer -= dt;
            if (struct.trainTimer <= 0) {
              this.completeHabitatTraining(struct);
            }
          }
          continue;
        }

        // Combat Bunker: each garrisoned soldier targets closest front zombie in range (+50% ATK & Safe Zone aura)
        if (struct.type === 'bunker') {
          if (!struct.occupants || struct.occupants.length === 0) continue;
          const buffMult = STRUCTURE_SPECS.bunker.atkBuffMult || 1.5;
          const auraMult = this.getSafeZoneDmgMult();

          for (const sol of struct.occupants) {
            sol.cooldown = Math.max(0, (sol.cooldown || 0) - dt);
            if (sol.cooldown > 0) continue;

            let bestZ = null;
            let bestD = sol.range;
            for (const z of this.zombies) {
              if (z.hp <= 0) continue;
              const d = Math.hypot(z.x - struct.x, z.y - struct.y);
              if (d <= bestD) {
                bestD = d;
                bestZ = z;
              }
            }

            const buffedDmg = Math.round(sol.dmg * buffMult * auraMult);
            if (bestZ) {
              sol.cooldown = sol.rate;
              struct.angle = Math.atan2(bestZ.y - struct.y, bestZ.x - struct.x);
              this.sound.playLaser(780, 380, 0.05);
              this.projectiles.push({
                type: 'bullet',
                x1: struct.x,
                y1: struct.y,
                x2: bestZ.x,
                y2: bestZ.y,
                color: '#00E08A',
                life: 0.11,
                maxLife: 0.11
              });
              bestZ.hp -= buffedDmg;
              if (bestZ.hp <= 0) {
                sol.kills = (sol.kills || 0) + 1;
                struct.kills = (struct.kills || 0) + 1;
              }
              this.addParticles(bestZ.x, bestZ.y, '#00E08A', 4, 32);
            }
          }
          continue;
        }

        const lv = STRUCTURE_SPECS[struct.type].levels[struct.level - 1];
        struct.cooldown = (struct.cooldown || 0) - dt;
        if (struct.cooldown > 0) continue;

        if (struct.type === 'sentry') {
          let best = null;
          let bestD = lv.range;
          for (const z of this.zombies) {
            if (z.hp <= 0) continue;
            const d = Math.hypot(z.x - struct.x, z.y - struct.y);
            if (d <= bestD) {
              bestD = d;
              best = z;
            }
          }
          if (best) {
            struct.cooldown = lv.rate;
            this.fireSentry(struct, best, lv);
          }
        } else if (struct.type === 'cryo') {
          let any = false;
          for (const z of this.zombies) {
            if (z.hp > 0 && Math.hypot(z.x - struct.x, z.y - struct.y) <= lv.range) {
              any = true;
              break;
            }
          }
          if (any) {
            struct.cooldown = 1.6;
            this.fireCryo(struct, lv);
          }
        } else if (struct.type === 'sniper') {
          // Priority: Demolisher/Wrecker -> Brute-Breach -> Highest-HP zombie (never targets Spawn Breaches)
          let bestSiege = null;
          let maxSiegeHp = -1;
          let bestBrute = null;
          let maxBruteHp = -1;
          let bestRegular = null;
          let maxRegHp = -1;

          for (const z of this.zombies) {
            if (z.hp <= 0) continue;
            const d = Math.hypot(z.x - struct.x, z.y - struct.y);
            if (d > lv.range) continue;
            if (z.type === 'demolisher' || z.type === 'wrecker') {
              if (z.hp > maxSiegeHp) {
                maxSiegeHp = z.hp;
                bestSiege = z;
              }
            } else if (z.bruteBreach) {
              if (z.hp > maxBruteHp) {
                maxBruteHp = z.hp;
                bestBrute = z;
              }
            } else if (z.hp > maxRegHp) {
              maxRegHp = z.hp;
              bestRegular = z;
            }
          }

          const target = bestSiege || bestBrute || bestRegular;
          if (target) {
            struct.cooldown = lv.rate;
            this.fireSniper(struct, target, lv);
          }
        }
      }
    }

    fireSentry(t, target, lv) {
      this.sound.playLaser(560, 220, 0.07);
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      this.projectiles.push({
        type: 'bullet',
        x1: t.x,
        y1: t.y,
        x2: target.x,
        y2: target.y,
        color: '#FFD23F',
        life: 0.11,
        maxLife: 0.11
      });
      const hitDmg = Math.round(lv.dmg * this.getSafeZoneDmgMult());
      target.hp -= hitDmg;
      if (target.hp <= 0) t.kills = (t.kills || 0) + 1;
      this.addParticles(target.x, target.y, '#FFD23F', 4, 35);
    }

    fireCryo(t, lv) {
      this.sound.playCryoPulse();
      this.projectiles.push({
        type: 'cryoWave',
        x: t.x,
        y: t.y,
        maxRadius: lv.range,
        radius: 10,
        color: '#00FFFF',
        life: 0.35,
        maxLife: 0.35
      });
      const mult = this.getSafeZoneDmgMult();
      const chipZ = Math.round(8 * mult);
      for (const z of this.zombies) {
        if (z.hp <= 0 || Math.hypot(z.x - t.x, z.y - t.y) > lv.range) continue;
        z.slowTimer = lv.slowDur;
        z.slowFactor = Math.max(z.slowFactor, lv.slow);
        z.hp -= chipZ;
        if (z.hp <= 0) t.kills = (t.kills || 0) + 1;
        this.addParticles(z.x, z.y, '#00FFFF', 4, 30);
      }
    }

    fireSniper(t, target, lv) {
      this.sound.playSniperRail();
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      this.projectiles.push({
        type: 'railBeam',
        x1: t.x,
        y1: t.y,
        x2: target.x,
        y2: target.y,
        color: '#FF00FF',
        life: 0.2,
        maxLife: 0.2
      });
      if (Math.random() < 0.40) {
        target.hp = 0;
        t.kills = (t.kills || 0) + 1;
        this.addFloatingText('HEADSHOT!', target.x, target.y - 16, '#FF00FF');
        this.addParticles(target.x, target.y, '#FF00FF', 18, 85);
      } else {
        const hitDmg = Math.round(lv.dmg * this.getSafeZoneDmgMult());
        target.hp -= hitDmg;
        if (target.hp <= 0) t.kills = (t.kills || 0) + 1;
        this.addParticles(target.x, target.y, '#FF00FF', 10, 70);
      }
    }

    updateProjectiles(dt) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.life -= dt;
        if (p.type === 'cryoWave') {
          const prog = 1 - Math.max(0, p.life / p.maxLife);
          p.radius = 10 + (p.maxRadius - 10) * prog;
        }
        if (p.life <= 0) this.projectiles.splice(i, 1);
      }
    }

    updateVisuals(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.pulseRings.length - 1; i >= 0; i--) {
        const pr = this.pulseRings[i];
        pr.life -= dt;
        const prog = 1 - Math.max(0, pr.life / pr.maxLife);
        pr.radius = 8 + (pr.maxRadius - 8) * prog;
        if (pr.life <= 0) this.pulseRings.splice(i, 1);
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 24 * dt;
        ft.life -= dt;
        ft.alpha = Math.max(0, Math.min(1, ft.life));
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    // --- VICTORY / DEFEAT OVERLAYS ---
    fillEndModal(title, sub, iconHtml, color, showNext) {
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
      };
      set('gameOverTitle', title);
      set('gameOverSubtitle', sub);
      const icon = document.getElementById('gameOverIcon');
      if (icon) {
        icon.innerHTML = iconHtml;
        icon.style.color = color;
      }
      set('modalStatSaved', `${this.savedCount}/${this.civTotal}`);
      set('modalStatInfected', this.infectedCount);
      set('modalStatWaves', this.isEndlessMode ? `${this.wave} (\u221E)` : `${Math.max(1, this.wave)}`);
      set('modalStatScrap', Math.floor(this.scrap));
      if (this.btnNextLevel) {
        if (showNext) {
          this.btnNextLevel.innerHTML = this.isTutorialMode
            ? 'Start Sector 1 &rarr;'
            : this.isPostDefenseMode
            ? 'New Post Defense Map &rarr;'
            : (this.isRandomMode || this.currentLevel >= LEVEL_MAPS.length - 1)
            ? 'Next Random Sector &rarr;'
            : 'Next Sector &rarr;';
          showEl(this.btnNextLevel, 'inline-flex');
        } else {
          hideEl(this.btnNextLevel);
        }
      }
      showEl(this.gameOverOverlay, 'flex');
      this.updateTimerHud();
    }

    onVictory() {
      this.waveState = STATE.VICTORY;
      this.clearSelection();
      this.sound.playRescue();

      if (this.isTutorialMode) {
        this.clearTutorial(true);
        this.updateHUD();
        this.showStatus('BASIC TRAINING COMPLETE! All core defense, economy, and combat systems verified.');
        this.fillEndModal(
          'BASIC TRAINING COMPLETE!',
          `Tutorial Spawn Breach destroyed! Score ${this.score}. You are ready for live combat in Sector 1.`,
          '&#9733;',
          'var(--color-green)',
          true
        );
        return;
      }

      const target = this.civTotal > 0 ? Math.ceil(this.civTotal * 0.5) : 0;
      const bonusEarned = this.civTotal > 0 && this.savedCount >= target;
      let bonusText = '';
      if (bonusEarned) {
        this.scrap += 150;
        this.score += 500;
        this.addFloatingText('RESCUE BONUS +$150!', WIDTH / 2, HEIGHT / 2 - 40, '#FFD23F');
        bonusText = ' Rescue Efficiency Bonus (50%+ saved): +$150 Scrap & +500 Score!';
      }
      this.updateHUD();

      this.showStatus(`MISSION SUCCESSFUL: all Spawn Breaches destroyed!${bonusText}`);
      this.fillEndModal(
        'SECTOR SECURED',
        `All Spawn Breaches destroyed! ${this.savedCount}/${this.civTotal} civilians saved. Score ${this.score}.${bonusText}`,
        '&#9733;',
        'var(--color-green)',
        true
      );
    }

    onDefeat(reason) {
      this.waveState = STATE.GAMEOVER;
      this.clearSelection();
      this.sound.playBarricadeBreak();
      this.showStatus(`MISSION FAILED: ${reason}`);
      this.fillEndModal('SECTOR OVERRUN', reason, '&#9760;', 'var(--color-red)', this.isEndlessMode);
    }

    // --- RENDERING (1280x960 logical world with 2D mobile pan/zoom camera transform) ---
    render(now) {
      const ctx = this.ctx;
      const t = (now || performance.now()) / 1000;
      const s = this.getCameraScale();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas ? this.canvas.width : WIDTH, this.canvas ? this.canvas.height : HEIGHT);
      ctx.setTransform(s, 0, 0, s, this.camera.panX, this.camera.panY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      this.renderTiles(ctx, t);
      this.renderSafeZones(ctx, t);
      this.renderSpawnBreaches(ctx, t);
      this.renderHoverRanges(ctx);
      for (const s of this.structures.values()) this.renderStructure(ctx, s, t);
      this.renderPulseRings(ctx);
      this.renderCivilians(ctx, t);
      this.renderSoldiers(ctx, t);
      this.renderEngineers(ctx, t);
      this.renderZombies(ctx, t);
      this.renderProjectiles(ctx);
      this.renderParticles(ctx);
      this.renderTutorialHighlights(ctx, t);
      this.renderBuildPreview(ctx);
      this.renderFloatingTexts(ctx);
    }

    renderTiles(ctx) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;
          const tile = this.grid[r][c];

          if (tile === 1) {
            ctx.fillStyle = '#18202c';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#263346';
            ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          } else {
            ctx.fillStyle = (c + r) % 2 === 0 ? '#0c1118' : '#0e141d';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        }
      }
    }

    renderSafeZones(ctx) {
      for (const sz of this.safeZones.values()) {
        const x = sz.col * TILE_SIZE;
        const y = sz.row * TILE_SIZE;
        const flash = sz.flash > 0;
        const isHovered = this.mouseTile.col === sz.col && this.mouseTile.row === sz.row;
        const isSelected = this.selectedStructure === sz;

        // 30% opacity territory pad with merged outer perimeter borders (no internal grid lines)
        ctx.fillStyle = flash ? 'rgba(255, 255, 255, 0.55)' : 'rgba(0, 224, 138, 0.30)';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = 'rgba(0, 224, 138, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (!this.safeZones.has(`${sz.col},${sz.row - 1}`)) {
          ctx.moveTo(x, y + 0.75);
          ctx.lineTo(x + TILE_SIZE, y + 0.75);
        }
        if (!this.safeZones.has(`${sz.col},${sz.row + 1}`)) {
          ctx.moveTo(x, y + TILE_SIZE - 0.75);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE - 0.75);
        }
        if (!this.safeZones.has(`${sz.col - 1},${sz.row}`)) {
          ctx.moveTo(x + 0.75, y);
          ctx.lineTo(x + 0.75, y + TILE_SIZE);
        }
        if (!this.safeZones.has(`${sz.col + 1},${sz.row}`)) {
          ctx.moveTo(x + TILE_SIZE - 0.75, y);
          ctx.lineTo(x + TILE_SIZE - 0.75, y + TILE_SIZE);
        }
        ctx.stroke();
        ctx.lineWidth = 1;

        // Muted safe extraction cross
        ctx.fillStyle = 'rgba(0, 224, 138, 0.28)';
        ctx.fillRect(x + 18, y + 12, 4, 16);
        ctx.fillRect(x + 12, y + 18, 16, 4);

        if (isSelected) {
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.lineWidth = 1;
        }

        // Hide HP bar by default when full HP; show only when damaged, hovered, or selected
        const ratio = Math.max(0, sz.hp / sz.maxHp);
        if (sz.hp < sz.maxHp || isHovered || isSelected) {
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.fillRect(x + 4, y + 3, TILE_SIZE - 8, 4);
          ctx.fillStyle = ratio > 0.4 ? '#00E08A' : '#FF3B3B';
          ctx.fillRect(x + 4, y + 3, (TILE_SIZE - 8) * ratio, 4);
        }
      }
    }

    renderSpawnBreaches(ctx, t) {
      for (const sp of this.spawns.values()) {
        const x = sp.col * TILE_SIZE;
        const y = sp.row * TILE_SIZE;
        const flash = sp.flash > 0;

        ctx.fillStyle = flash ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 59, 59, 0.20)';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(255, 59, 59, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.lineWidth = 1;

        // Pulsing breach vortex core
        const rPulse = 5 + Math.sin(t * 5 + sp.col) * 1.8;
        ctx.fillStyle = '#FF3B3B';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, rPulse, 0, Math.PI * 2);
        ctx.fill();

        if (sp.turretLocked) {
          const lockR = 14.5 + Math.sin(t * 7 + sp.col) * 2.0;
          ctx.strokeStyle = 'rgba(255, 210, 63, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, lockR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }

        // Visible Red HP bar above each destructible Spawn Breach (+ subtle crimson-gold regen pulse after 2.0s unhit)
        const ratio = Math.max(0, sp.hp / sp.maxHp);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(x + 3, y + 2, TILE_SIZE - 6, 5);
        ctx.fillStyle = sp.isRegenerating ? '#FF6B4A' : '#FF3B3B';
        ctx.fillRect(x + 3, y + 2, (TILE_SIZE - 6) * ratio, 5);
        if (sp.isRegenerating) {
          ctx.strokeStyle = Math.sin(t * 10) > 0 ? '#FFD23F' : '#FF6B4A';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(x + 2.5, y + 1.5, TILE_SIZE - 5, 6);
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'rgba(255, 210, 63, 0.5)';
          ctx.strokeRect(x + 3, y + 2, TILE_SIZE - 6, 5);
        }
      }
    }

    structureAt(col, row) {
      return this.structures.get(`${col},${row}`) || this.safeZones.get(`${col},${row}`) || null;
    }

    renderHoverRanges(ctx) {
      const hs = this.structureAt(this.mouseTile.col, this.mouseTile.row);
      const targets = [];
      if (this.selectedStructure) targets.push(this.selectedStructure);
      if (hs && hs !== this.selectedStructure) targets.push(hs);

      for (const s of targets) {
        if (s.type === 'wall' || s.type === 'gate' || s.type === 'safezone' || s.type === 'engineering' || s.type === 'habitat') continue;
        let range = 0;
        if (s.type === 'barracks') {
          range = STRUCTURE_SPECS.barracks.fireRange || 175;
        } else if (s.type === 'bunker') {
          if (s.occupants && s.occupants.length > 0) {
            for (const sol of s.occupants) {
              if (sol.range > range) range = sol.range;
            }
          } else {
            range = SOLDIER_SPECS[0].range;
          }
        } else {
          const lv = STRUCTURE_SPECS[s.type].levels[s.level - 1];
          range = lv.range;
        }
        if (!range) continue;

        ctx.fillStyle = s === this.selectedStructure ? 'rgba(0,255,255,0.07)' : 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = s === this.selectedStructure ? 'rgba(0,255,255,0.55)' : 'rgba(255,255,255,0.3)';
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    renderStructure(ctx, s, t) {
      const spec = STRUCTURE_SPECS[s.type];
      const lv = spec.levels[s.level - 1];
      const x = s.col * TILE_SIZE;
      const y = s.row * TILE_SIZE;
      const flash = s.flash > 0;

      if (s.type === 'wall') {
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        if (s.level === 1) {
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          for (let k = 1; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(x + 3, y + 3 + k * 8.5);
            ctx.lineTo(x + TILE_SIZE - 3, y + 3 + k * 8.5);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          for (const [dx, dy] of [[7, 7], [33, 7], [7, 33], [33, 33]]) {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (s.type === 'gate') {
        // Security Gate: heavy side pylons + glowing cyan barrier bars that retract open for nearby friendly units
        let isOpen = false;
        for (const u of this.civilians) {
          if (Math.hypot(u.x - s.x, u.y - s.y) <= 48) { isOpen = true; break; }
        }
        if (!isOpen) {
          for (const u of this.soldiers) {
            if (Math.hypot(u.x - s.x, u.y - s.y) <= 48) { isOpen = true; break; }
          }
        }
        if (!isOpen) {
          for (const u of this.engineers) {
            if (Math.hypot(u.x - s.x, u.y - s.y) <= 48) { isOpen = true; break; }
          }
        }

        ctx.fillStyle = isOpen ? 'rgba(0, 229, 255, 0.14)' : 'rgba(16, 25, 36, 0.9)';
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        // Heavy steel side gateposts
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, 7, TILE_SIZE - 6);
        ctx.fillRect(x + TILE_SIZE - 10, y + 3, 7, TILE_SIZE - 6);

        // Glowing cyan laser/steel bars
        ctx.fillStyle = isOpen ? 'rgba(0, 229, 255, 0.45)' : '#00E5FF';
        for (const by of [12, 19, 26]) {
          if (isOpen) {
            ctx.fillRect(x + 10, y + by, 4, 2.5);
            ctx.fillRect(x + TILE_SIZE - 14, y + by, 4, 2.5);
          } else {
            ctx.fillRect(x + 10, y + by, TILE_SIZE - 20, 2.5);
          }
        }
      } else if (s.type === 'bunker') {
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        ctx.fillStyle = '#0a1c17';
        ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

        const occ = s.occupants ? s.occupants.length : 0;
        const pipCoords = [
          [x + 15, y + 15],
          [x + 25, y + 15],
          [x + 15, y + 23],
          [x + 25, y + 23]
        ];
        for (let idx = 0; idx < 4; idx++) {
          const [px, py] = pipCoords[idx];
          ctx.fillStyle = idx < occ ? '#38E8FF' : 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.arc(px, py, 3.2, 0, Math.PI * 2);
          ctx.fill();
          if (idx < occ) {
            ctx.strokeStyle = '#FFD23F';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.lineWidth = 1;
          }
        }

        if (occ > 0) {
          ctx.font = 'bold 8px Consolas, monospace';
          ctx.fillStyle = '#00E08A';
          ctx.textAlign = 'center';
          ctx.fillText('+50%', x + TILE_SIZE / 2, y + 10);
          ctx.textAlign = 'left';
        }
      } else if (s.type === 'barracks') {
        // Safe-Zone Barracks: amber-bronze Commando garrison hall (Recruits blue, Commandos cyan + training progress bar)
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        ctx.fillStyle = '#1c150a';
        ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

        const occ = s.occupants ? s.occupants.length : 0;
        const activeT = s.activeTrainers ? s.activeTrainers.length : 0;
        const qLen = s.trainQueue ? s.trainQueue.length : 0;
        const pipCoords = [
          [x + 15, y + 15],
          [x + 25, y + 15],
          [x + 15, y + 23],
          [x + 25, y + 23]
        ];
        for (let idx = 0; idx < 4; idx++) {
          const [px, py] = pipCoords[idx];
          const unit = idx < occ ? s.occupants[idx] : (idx - occ < activeT ? { training: true } : null);
          ctx.fillStyle = unit ? (unit.training ? '#FFD23F' : unit.isCommando ? (unit.color || '#00E5FF') : '#2B8CFF') : 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.arc(px, py, 3.0, 0, Math.PI * 2);
          ctx.fill();
          if (unit) {
            ctx.strokeStyle = unit.training ? '#00E5FF' : '#FFD23F';
            ctx.stroke();
          }
        }

        if (s.trainTimer > 0) {
          const prog = Math.max(0, Math.min(1, 1 - s.trainTimer / (s.trainDuration || 4.0)));
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, TILE_SIZE - 12, 3);
          ctx.fillStyle = '#00E5FF';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, (TILE_SIZE - 12) * prog, 3);
        }

        if (occ > 0 || activeT > 0 || qLen > 0) {
          ctx.font = 'bold 8px Consolas, monospace';
          ctx.fillStyle = '#FFD23F';
          ctx.textAlign = 'center';
          ctx.fillText(activeT > 0 ? `T:${activeT}` : qLen > 0 ? `Q:${qLen}` : 'CMD', x + TILE_SIZE / 2, y + 10);
          ctx.textAlign = 'left';
        }
      } else if (s.type === 'engineering') {
        // Safe-Zone Engineering Bay: steel-cyan workshop for Engineer training & standby healing
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        ctx.fillStyle = '#0d1926';
        ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

        const occ = s.occupants ? s.occupants.length : 0;
        const activeT = s.activeTrainers ? s.activeTrainers.length : 0;
        const qLen = s.trainQueue ? s.trainQueue.length : 0;
        const pipCoords = [
          [x + 15, y + 15],
          [x + 25, y + 15],
          [x + 15, y + 23],
          [x + 25, y + 23]
        ];
        for (let idx = 0; idx < 4; idx++) {
          const [px, py] = pipCoords[idx];
          const u = idx < occ ? s.occupants[idx] : (idx - occ < activeT ? { training: true } : null);
          ctx.fillStyle = u ? (u.training ? '#00FF88' : u.unitType === 'engineer' ? '#FFD23F' : '#2B8CFF') : 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.arc(px, py, 3.0, 0, Math.PI * 2);
          ctx.fill();
          if (u) {
            ctx.strokeStyle = '#00E5FF';
            ctx.stroke();
          }
        }

        if (s.trainTimer > 0) {
          const prog = Math.max(0, Math.min(1, 1 - s.trainTimer / (s.trainDuration || 4.0)));
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, TILE_SIZE - 12, 3);
          ctx.fillStyle = '#FFD23F';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, (TILE_SIZE - 12) * prog, 3);
        }

        ctx.font = 'bold 8px Consolas, monospace';
        ctx.fillStyle = '#00E5FF';
        ctx.textAlign = 'center';
        ctx.fillText(activeT > 0 ? `T:${activeT}` : qLen > 0 ? `Q:${qLen}` : 'ENG', x + TILE_SIZE / 2, y + 10);
        ctx.textAlign = 'left';
      } else if (s.type === 'habitat') {
        // Safe-Zone Habitat: emerald housing pod producing civilians (queued up to 20)
        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = lv.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.lineWidth = 1;

        ctx.fillStyle = '#0c241c';
        ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);

        // Residential dome roof & illuminated windows
        ctx.fillStyle = '#00E08A';
        ctx.beginPath();
        ctx.arc(s.x, s.y - 1, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 12, y + 22, 4, 4);
        ctx.fillRect(x + 18, y + 22, 4, 4);
        ctx.fillRect(x + 24, y + 22, 4, 4);

        const qLen = s.trainQueue ? s.trainQueue.length : 0;
        if (s.trainTimer > 0) {
          const prog = Math.max(0, Math.min(1, 1 - s.trainTimer / (s.trainDuration || 3.5)));
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, TILE_SIZE - 12, 3);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 6, y + TILE_SIZE - 11, (TILE_SIZE - 12) * prog, 3);
        }

        ctx.font = 'bold 8px Consolas, monospace';
        ctx.fillStyle = '#00E08A';
        ctx.textAlign = 'center';
        ctx.fillText(qLen > 0 ? `Q:${qLen}` : 'HAB', x + TILE_SIZE / 2, y + 10);
        ctx.textAlign = 'left';
      } else {
        // Turret base pad
        ctx.fillStyle = '#141c28';
        ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
        ctx.strokeStyle = lv.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 5, y + 5, TILE_SIZE - 10, TILE_SIZE - 10);
        ctx.lineWidth = 1;

        ctx.save();
        ctx.translate(s.x, s.y);
        if (s.type === 'cryo') {
          ctx.rotate(t * (1 + s.level * 0.4));
          ctx.strokeStyle = flash ? '#FFFFFF' : lv.color;
          ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(-11, 0);
            ctx.lineTo(11, 0);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        } else {
          ctx.rotate(s.angle || 0);
          ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
          const barrels = lv.barrels || 1;
          if (barrels === 1) {
            ctx.fillRect(0, -3, 15, 6);
          } else if (barrels === 2) {
            ctx.fillRect(0, -6, 15, 4);
            ctx.fillRect(0, 2, 15, 4);
          } else {
            ctx.fillRect(0, -7, 16, 3);
            ctx.fillRect(0, -3, 16, 2);
            ctx.fillRect(0, 1, 16, 2);
            ctx.fillRect(0, 4, 16, 3);
          }
        }
        ctx.restore();

        ctx.fillStyle = flash ? '#FFFFFF' : lv.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Level pips (1-3)
      ctx.fillStyle = '#FFD23F';
      for (let p = 0; p < s.level; p++) {
        ctx.fillRect(x + 7 + p * 6, y + TILE_SIZE - 7, 4, 3);
      }

      if (this.selectedStructure === s) {
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.lineWidth = 1;
      }

      if (s.hp < s.maxHp) {
        const ratio = Math.max(0, s.hp / s.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x + 4, y + 2, TILE_SIZE - 8, 4);
        ctx.fillStyle = ratio > 0.4 ? '#00E08A' : '#FF3B3B';
        ctx.fillRect(x + 4, y + 2, (TILE_SIZE - 8) * ratio, 4);
      }
    }

    renderPulseRings(ctx) {
      for (const pr of this.pulseRings) {
        const a = Math.max(0, pr.life / pr.maxLife);
        ctx.globalAlpha = a;
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
      }
    }

    renderCivilians(ctx, t) {
      for (const civ of this.civilians) {
        const selected = this.selectedCivilian === civ;

        if (selected && civ.path.length > 0) {
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(civ.x, civ.y);
          for (const pt of civ.path) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          const end = civ.path[civ.path.length - 1];
          ctx.strokeStyle = '#00E5FF';
          ctx.beginPath();
          ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (selected) {
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(civ.x, civ.y, civ.radius + 4 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        ctx.fillStyle = civ.isIncubating ? '#FFD23F' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(civ.x, civ.y, civ.radius, 0, Math.PI * 2);
        ctx.fill();

        if (civ.isIncubating) {
          const frac = Math.min(1, civ.incubationTimer / Math.max(0.1, this.infectionWindow));
          ctx.strokeStyle = frac > 0.65 ? '#FF3B3B' : '#FF9A1F';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(civ.x, civ.y, civ.radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
    }

    renderSoldiers(ctx, t) {
      for (const sol of this.soldiers) {
        const selected = this.selectedSoldier === sol;
        const spec = SOLDIER_SPECS[sol.level - 1];

        if (selected) {
          ctx.fillStyle = 'rgba(56, 232, 255, 0.05)';
          ctx.strokeStyle = 'rgba(56, 232, 255, 0.4)';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(sol.x, sol.y, sol.range, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          if (sol.path.length > 0) {
            ctx.strokeStyle = 'rgba(56, 232, 255, 0.65)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(sol.x, sol.y);
            for (const pt of sol.path) ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
            ctx.setLineDash([]);

            const end = sol.path[sol.path.length - 1];
            ctx.strokeStyle = '#38E8FF';
            ctx.beginPath();
            ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sol.x, sol.y, sol.radius + 5 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        ctx.save();
        ctx.translate(sol.x, sol.y);
        ctx.rotate(sol.angle || 0);
        ctx.fillStyle = '#D6E2F3';
        ctx.fillRect(2, -1.5, 9, 3);
        ctx.restore();

        ctx.fillStyle = sol.isCommando
          ? (sol.color || COMMANDO_SPECS[Math.max(0, Math.min(2, (sol.level || 1) - 1))].color)
          : spec.color;
        ctx.beginPath();
        ctx.arc(sol.x, sol.y, sol.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = sol.isCommando ? '#FFFFFF' : '#FFD23F';
        ctx.lineWidth = sol.isCommando ? 2.0 : 1.5;
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.fillStyle = '#FFD23F';
        const totalW = sol.level * 4 - 1;
        for (let p = 0; p < sol.level; p++) {
          ctx.fillRect(sol.x - totalW / 2 + p * 4, sol.y - sol.radius - 6, 3, 3);
        }

        if (sol.hp < sol.maxHp) {
          const ratio = Math.max(0, sol.hp / sol.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(sol.x - 9, sol.y + sol.radius + 3, 18, 3);
          ctx.fillStyle = '#00E08A';
          ctx.fillRect(sol.x - 9, sol.y + sol.radius + 3, 18 * ratio, 3);
        }
      }
    }

    renderEngineers(ctx, t) {
      for (const eng of this.engineers) {
        const selected = this.selectedEngineer === eng;
        const spec = ENGINEER_SPECS[eng.level - 1];

        if (selected) {
          if (eng.path.length > 0) {
            ctx.strokeStyle = 'rgba(255, 210, 63, 0.7)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(eng.x, eng.y);
            for (const pt of eng.path) ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.strokeStyle = '#FFD23F';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(eng.x, eng.y, eng.radius + 5 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        // Welding torch beam when actively repairing an adjacent target
        if (eng.repairTarget && Math.hypot(eng.repairTarget.x - eng.x, eng.repairTarget.y - eng.y) <= TILE_SIZE * 1.45) {
          ctx.strokeStyle = Math.sin(t * 25) > 0 ? '#00E5FF' : '#FFD23F';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(eng.x, eng.y);
          ctx.lineTo(eng.repairTarget.x, eng.repairTarget.y);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        // Wrench / Torch arm
        ctx.save();
        ctx.translate(eng.x, eng.y);
        ctx.rotate(eng.angle || 0);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(2, -2, 9, 4);
        ctx.restore();

        // Amber-gold hard-hat body with cyan trim
        ctx.fillStyle = spec.color;
        ctx.beginPath();
        ctx.arc(eng.x, eng.y, eng.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.lineWidth = 1;

        // Inner cross-wrench emblem
        ctx.fillStyle = '#18202c';
        ctx.fillRect(eng.x - 3, eng.y - 1, 6, 2);
        ctx.fillRect(eng.x - 1, eng.y - 3, 2, 6);

        // Rank pips (1..3)
        ctx.fillStyle = '#00E5FF';
        const totalW = eng.level * 4 - 1;
        for (let p = 0; p < eng.level; p++) {
          ctx.fillRect(eng.x - totalW / 2 + p * 4, eng.y - eng.radius - 6, 3, 3);
        }

        if (eng.hp < eng.maxHp) {
          const ratio = Math.max(0, eng.hp / eng.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(eng.x - 9, eng.y + eng.radius + 3, 18, 3);
          ctx.fillStyle = '#FFD23F';
          ctx.fillRect(eng.x - 9, eng.y + eng.radius + 3, 18 * ratio, 3);
        }
      }
    }

    renderZombies(ctx, t) {
      for (const z of this.zombies) {
        drawZombieSprite(ctx, z, t);

        // Visual Tell for 25% Random Brute-Breach zombies (Walker/Runner/Tank/Wrecker that breach walls straight to Safe Zones)
        if (z.bruteBreach && z.type !== 'demolisher') {
          ctx.strokeStyle = '#FF9A1F';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.radius + 3 + Math.sin(t * 9) * 1.1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        if (z.slowTimer > 0) {
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.radius + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        if (z.hp < z.maxHp) {
          const ratio = Math.max(0, z.hp / z.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(z.x - 10, z.y - z.radius - 6, 20, 3);
          ctx.fillStyle = z.type === 'wrecker' ? '#B833FF' : z.type === 'demolisher' ? '#FF9A1F' : '#FF4444';
          ctx.fillRect(z.x - 10, z.y - z.radius - 6, 20 * ratio, 3);
        }
      }
    }

    renderProjectiles(ctx) {
      for (const p of this.projectiles) {
        const a = Math.max(0, p.life / p.maxLife);
        if (p.type === 'bullet' || p.type === 'railBeam') {
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.type === 'railBeam' ? 3 : 1.8;
          ctx.beginPath();
          ctx.moveTo(p.x1, p.y1);
          ctx.lineTo(p.x2, p.y2);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
        } else if (p.type === 'cryoWave') {
          ctx.globalAlpha = a * 0.7;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.globalAlpha = 1;
        }
      }
    }

    renderParticles(ctx) {
      for (const pt of this.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    renderBuildPreview(ctx) {
      if (!this.selectedBuildType || !this.inPlay || this.modalBlocking) return;
      if (this.selectedBuildType === 'safezone' && this.safeZoneDrag) {
        const plan = this.getSafeZoneDragPlan(
          this.safeZoneDrag.startCol,
          this.safeZoneDrag.startRow,
          this.safeZoneDrag.curCol,
          this.safeZoneDrag.curRow
        );
        const rx = plan.minC * TILE_SIZE;
        const ry = plan.minR * TILE_SIZE;
        const rw = (plan.maxC - plan.minC + 1) * TILE_SIZE;
        const rh = (plan.maxR - plan.minR + 1) * TILE_SIZE;
        ctx.strokeStyle = 'rgba(0, 224, 138, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
        ctx.setLineDash([]);
        ctx.lineWidth = 1;

        for (let i = 0; i < plan.affordableTiles.length; i++) {
          const [c, r] = plan.affordableTiles[i];
          ctx.fillStyle = 'rgba(0, 224, 138, 0.35)';
          ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(0, 224, 138, 0.9)';
          ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
        for (let i = 0; i < plan.excessTiles.length; i++) {
          const [c, r] = plan.excessTiles[i];
          ctx.fillStyle = 'rgba(255, 59, 59, 0.25)';
          ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(255, 154, 31, 0.85)';
          ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        const label = `+${plan.affordableTiles.length} Safe Zone${plan.affordableTiles.length === 1 ? '' : 's'} ($${plan.totalCost})`;
        const labelOffsetY = this.isMobileTouch ? Math.round(42 / this.camera.zoom) : 16;
        const lx = Math.max(80, Math.min(WIDTH - 80, this.mousePos.x));
        const ly = Math.max(20, this.mousePos.y - labelOffsetY);
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(label, lx + 1, ly + 1);
        ctx.fillStyle = plan.affordableTiles.length > 0 ? '#00E08A' : '#FF9A1F';
        ctx.fillText(label, lx, ly);
        ctx.textAlign = 'left';
        return;
      }

      if (this.selectedBuildType === 'wall' && this.wallDrag) {
        const plan = this.getWallLineDragPlan(
          this.wallDrag.startCol,
          this.wallDrag.startRow,
          this.wallDrag.curCol,
          this.wallDrag.curRow
        );
        for (let i = 0; i < plan.validAffordable.length; i++) {
          const [c, r] = plan.validAffordable[i];
          ctx.fillStyle = 'rgba(0, 224, 138, 0.35)';
          ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(0, 224, 138, 0.9)';
          ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
        for (let i = 0; i < plan.validUnaffordable.length; i++) {
          const [c, r] = plan.validUnaffordable[i];
          ctx.fillStyle = 'rgba(255, 59, 59, 0.25)';
          ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(255, 59, 59, 0.85)';
          ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
        for (let i = 0; i < plan.invalidTiles.length; i++) {
          const [c, r] = plan.invalidTiles[i];
          ctx.fillStyle = 'rgba(255, 59, 59, 0.25)';
          ctx.fillRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = 'rgba(255, 59, 59, 0.85)';
          ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        const label = `+${plan.validAffordable.length} Barricade${plan.validAffordable.length === 1 ? '' : 's'} ($${plan.totalCost})`;
        const labelOffsetY = this.isMobileTouch ? Math.round(42 / this.camera.zoom) : 16;
        const lx = Math.max(90, Math.min(WIDTH - 90, this.mousePos.x));
        const ly = Math.max(20, this.mousePos.y - labelOffsetY);
        ctx.font = 'bold 12px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(label, lx + 1, ly + 1);
        ctx.fillStyle = plan.validAffordable.length > 0 ? '#00E08A' : '#FF3B3B';
        ctx.fillText(label, lx, ly);
        ctx.textAlign = 'left';
        return;
      }

      const mc = this.mouseTile.col;
      const mr = this.mouseTile.row;
      if (!inBounds(mc, mr)) return;

      const spec = STRUCTURE_SPECS[this.selectedBuildType];
      const key = `${mc},${mr}`;
      let ok = false;
      if (this.selectedBuildType === 'safezone') {
        ok = this.canBuildSafeZoneAt(mc, mr);
      } else if (this.selectedBuildType === 'wall') {
        ok = this.isValidBarricadeTile(mc, mr);
      } else {
        // All buildings & towers except Barricades require an unoccupied green Safe Zone tile
        ok = this.grid[mr][mc] === 2 && this.safeZones.has(key) && !this.structures.has(key)
          && (this.selectedBuildType !== 'habitat' || this.countStructures('habitat') < this.getMaxHabitats());
      }
      const afford = this.scrap >= spec.baseCost;
      ok = ok && afford;
      const x = mc * TILE_SIZE;
      const y = mr * TILE_SIZE;
      const col = ok ? '0,255,136' : '255,51,51';

      ctx.fillStyle = `rgba(${col}, 0.22)`;
      ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.strokeStyle = `rgba(${col}, 0.85)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.lineWidth = 1;

      const lv = spec.levels[0];
      if (lv.range) {
        const center = tileCenter(mc, mr);
        ctx.strokeStyle = `rgba(${col}, 0.45)`;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(center.x, center.y, lv.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    renderFloatingTexts(ctx) {
      ctx.font = 'bold 13px Consolas, monospace';
      ctx.textAlign = 'center';
      for (const ft of this.floatingTexts) {
        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = '#000000';
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.zombieGame = new ZombieGame();
  });
})();

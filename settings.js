// Window settings
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 800;
const FPS = 60;

// Colors
const BLACK = "rgb(0, 0, 0)";
const NEON_BLUE = "rgb(0, 195, 255)";
const WALL_COLOR = "rgb(255, 255, 255)";
const GOAL_COLOR = "rgb(255, 0, 0)";
const DEBUG_LIGHT = 0;

// Status bar settings
const STATUS_BAR_HEIGHT = 50;
const STATUS_BAR_COLOR = "rgb(0, 0, 20)";  // Very dark blue
const STATUS_BAR_BORDER = 2;
const STATUS_TEXT_COLOR = NEON_BLUE;
const STATUS_PADDING = 10;  // Padding from edges

// Grid settings
const GRID_SIZE = 20;
const GRID_WIDTH = Math.floor(WINDOW_WIDTH / GRID_SIZE);
const GRID_HEIGHT = Math.floor((WINDOW_HEIGHT - STATUS_BAR_HEIGHT) / GRID_SIZE);

// Game settings
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const LIGHT_RADIUS = 50;
const GOAL_SIZE = 6;
const WALL_CORNER_RADIUS = 2;

// Light settings
const LIGHT_GRADIENT_STEPS = 30;
const BASE_TRAIL_LENGTH = 100;  // Increased from 15 to 100
const TRAIL_LENGTH_INCREASE = 2;  // How much to increase trail per level
const TRAIL_FADE_FACTOR = 0.6;
const TRAIL_FADE_SPEED = 3;
const LIGHT_INTENSITY = 100;
const LIGHT_FALLOFF = 2;

// Enemy settings
const ENEMY_SIZE = 10;
const ENEMY_SPEED = 1;
const ENEMY_COLOR = "rgb(255, 16, 240)";  // Neon pink
const MAX_ENEMIES = 10;  // Maximum number of enemies

// Trail growth settings
const TRAIL_GROWTH_RATE = 0.5;  // How many units to add to trail length per second
const INITIAL_TRAIL_LENGTH = 150;  // Increased from 100 to 150
const MAX_TRAIL_LENGTH = 200;  // Increased from 150 to 200 to allow for growth

// Sound settings
const SOUNDS = {
    'wall_hit': 'sounds/game_ball_tap.wav',
    'level_complete': 'sounds/game_level_complete.wav',
    'game_over': 'sounds/game_over.wav',
    'background': 'sounds/game_level_music.wav',
    'background2': 'sounds/bg2.wav',
    'background3': 'sounds/bg3.wav',
    'background4': 'sounds/bg4.wav',
    'coin': 'sounds/game_win_coin.wav',
    'damage': 'sounds/game_damage.wav'
};

// Additional constants from Python code
const STARTING_LIVES = 3;
const INVINCIBILITY_TIME = 2000; // 2 seconds in milliseconds
const LIGHT_ORB_DURATION = 5000; // 5 seconds in milliseconds
const LIGHT_ORB_SPAWN_CHANCE = 0.7;
const MAX_LIVES = 5;
const BACKGROUND_VOLUME = 0.1;

// Add at the top with other size constants
const HEART_SIZE = PLAYER_SIZE;  // Make hearts same size as player
const HEART_RADIUS = PLAYER_SIZE / 2;

// Add new glow settings
const PLAYER_GLOW_COLOR = "rgb(0, 195, 255)";  // Matches NEON_BLUE
const PLAYER_GLOW_INTENSITY = 0.8;  // Controls the brightness of player glow
const PLAYER_GLOW_SIZE = 1.5;  // How much larger the glow is than the player
const PLAYER_INNER_GLOW = 0.4;  // Intensity of the inner bright core

// Trail settings
const TRAIL_GLOW_SIZE = 1.2;  // How much the trail segments glow
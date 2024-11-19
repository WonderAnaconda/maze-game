class Game {
    constructor(initialMazeData) {
        // Setup canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = WINDOW_WIDTH;
        this.canvas.height = WINDOW_HEIGHT;
        
        // Create separate canvases for different layers
        this.game_surface = document.createElement('canvas');
        this.game_surface.width = WINDOW_WIDTH;
        this.game_surface.height = WINDOW_HEIGHT - STATUS_BAR_HEIGHT;
        this.game_ctx = this.game_surface.getContext('2d');
        
        this.light_surface = document.createElement('canvas');
        this.light_surface.width = WINDOW_WIDTH;
        this.light_surface.height = WINDOW_HEIGHT - STATUS_BAR_HEIGHT;
        this.light_ctx = this.light_surface.getContext('2d');
        
        this.wall_surface = document.createElement('canvas');
        this.wall_surface.width = WINDOW_WIDTH;
        this.wall_surface.height = WINDOW_HEIGHT - STATUS_BAR_HEIGHT;
        this.wall_ctx = this.wall_surface.getContext('2d');
        
        // Initialize sound after canvas setup
        this.sound_manager = new SoundManager();
        
        // Level tracking
        this.current_level = 1;
        
        // Font setup
        this.loadFonts();
        
        // High score system
        this.high_score_manager = new HighScoreManager();
        this.game_state = "START_SCREEN";
        this.player_name = "";
        this.show_scores = false;
        
        this.lives = STARTING_LIVES;
        this.invincible_until = 0;
        this.hearts = [];
        this.light_orbs = [];
        this.light_power_until = 0;
        this.debug_light_on = false;
        
        // Initialize empty arrays
        this.enemies = [];
        this.hearts = [];
        this.light_orbs = [];
        this.current_direction = [0, 0];
        
        // Initialize game objects
        this.reset_level(initialMazeData);
        this.level_start_time = performance.now();
        
        // Initialize timing variables
        this.game_start_time = Date.now();
        this.game_time = 0;
        this.is_game_active = true;
        this.paused_time = 0;
        
        // Bot mode
        this.bot_mode = false;
        this.bot_move_timer = 0;
        this.bot_move_delay = 10;
        
        // Fixed time step variables
        this.last_time = performance.now();
        this.accumulated_time = 0;
        this.time_step = 1000 / FPS;  // Convert FPS to milliseconds
        this.max_accumulated_time = this.time_step * 5;  // Prevent spiral of death
        
        // Initialize direction tracking
        this.attempted_direction = null;
        
        // Modify event listener
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        // Initialize game loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }
    
    loadFonts() {
        // Web font loading
        const font = new FontFace('PressStart2P', 'url(PressStart2P-Regular.ttf)');
        font.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            this.font = '16px PressStart2P';
            this.big_font = '24px PressStart2P';
        }).catch(error => {
            console.log("Pixel font not found, using default font");
            this.font = '24px monospace';
            this.big_font = '36px monospace';
        });
    }
    
    animate(current_time) {
        // Calculate delta time with a maximum value to prevent huge jumps
        const elapsed = Math.min(current_time - this.last_time, 100);  // Cap at 100ms
        this.last_time = current_time;
        
        // Prevent spiral of death by capping accumulated time
        this.accumulated_time = Math.min(
            this.accumulated_time + elapsed,
            this.max_accumulated_time
        );
        
        // Update game at fixed time steps
        let num_updates = 0;
        while (this.accumulated_time >= this.time_step && num_updates < 5) {
            this.handleInput();
            this.update(this.time_step / 1000);  // Convert to seconds
            this.accumulated_time -= this.time_step;
            num_updates++;
        }
        
        // If we're still behind, just discard the accumulated time
        if (this.accumulated_time > this.time_step) {
            this.accumulated_time = 0;
        }
        
        this.draw();
        requestAnimationFrame(this.animate);
    }
    
    handleKeyDown(event) {
        if (this.game_state === "START_SCREEN") {
            this.game_state = "PLAYING";
            this.sound_manager.change_background_music();
            return;
        }
        
        if (this.game_state === "PLAYING" && !this.bot_mode) {
            switch(event.key) {
                case 'ArrowUp':
                    this.current_direction = [0, -1];
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    this.current_direction = [0, 1];
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.current_direction = [-1, 0];
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    this.current_direction = [1, 0];
                    event.preventDefault();
                    break;
            }
        }
        else if (this.game_state === "NAME_INPUT") {
            if (event.key === 'Escape') {
                // Skip high score entry and start new game
                this.current_level = 1;
                this.lives = STARTING_LIVES;
                this.is_game_active = true;
                this.game_state = "PLAYING";
                this.game_start_time = Date.now();
                this.paused_time = 0;
                this.game_time = 0;
                this.show_scores = false;
                this.generate_new_level();
            }
            else if (event.key === 'Enter' && this.player_name) {
                this.high_score_manager.add_score(
                    this.player_name,
                    this.current_level - 1,
                    this.game_time
                );
                this.game_state = "SHOW_SCORES";
            }
            else if (event.key === 'Backspace') {
                this.player_name = this.player_name.slice(0, -1);
            }
            else if (this.player_name.length < 10 && event.key.length === 1 && event.key.match(/[a-zA-Z0-9]/)) {
                this.player_name += event.key.toUpperCase();
            }
        }
        else if (this.game_state === "SHOW_SCORES") {
            // Any key press
            this.current_level = 1;
            this.lives = STARTING_LIVES;
            this.is_game_active = true;
            this.game_state = "PLAYING";
            this.game_start_time = Date.now();
            this.paused_time = 0;
            this.game_time = 0;
            this.show_scores = false;
            this.generate_new_level();
        }
    }
    
    handleInput() {
        // Process attempted direction change
        if (this.attempted_direction) {
            const next_grid_pos = [
                this.player.grid_pos[0] + this.attempted_direction[0],
                this.player.grid_pos[1] + this.attempted_direction[1]
            ];
            
            // Check if new direction is valid
            if (this.maze.grid[next_grid_pos[1]][next_grid_pos[0]] === 0) {
                this.current_direction = this.attempted_direction;
                this.player.last_wall_hit = false;
                
                // Important: Immediately update target position if we're at a grid center
                if (this.player.isAtGridCenter()) {
                    this.player.target_pos = [
                        this.player.grid_pos[0] * GRID_SIZE + GRID_SIZE/2 + this.current_direction[0] * GRID_SIZE,
                        this.player.grid_pos[1] * GRID_SIZE + GRID_SIZE/2 + this.current_direction[1] * GRID_SIZE
                    ];
                }
            } else {
                // If new direction hits wall, keep going in current direction if possible
                const continue_grid_pos = [
                    this.player.grid_pos[0] + this.current_direction[0],
                    this.player.grid_pos[1] + this.current_direction[1]
                ];
                
                if (this.maze.grid[continue_grid_pos[1]][continue_grid_pos[0]] === 1) {
                    if (!this.player.last_wall_hit) {
                        this.sound_manager.play('wall_hit');
                        this.player.last_wall_hit = true;
                    }
                }
            }
            this.attempted_direction = null;
        }
    }
    
    update(deltaTime) {
        if (this.game_state === "PLAYING" && this.is_game_active) {
            this.game_time = (Date.now() - this.game_start_time - this.paused_time) / 1000;
            
            // Use current_direction directly instead of input buffer
            this.player.move(this.current_direction, this.maze);
            
            // Update trail length based on time in level
            const time_in_level = (performance.now() - this.level_start_time) / 1000;
            this.player.update_trail_length(time_in_level);
            
            for (const enemy of this.enemies) {
                enemy.move(this.maze);
            }
            
            // Check heart collection
            this.check_heart_collection();
            
            // Check enemy collision only if not invincible
            if (this.check_player_enemy_collision()) {
                if (performance.now() >= this.invincible_until) {
                    this.lives -= 1;
                    if (this.lives <= 0) {
                        console.log("Game Over!");
                        this.sound_manager.play('game_over');
                        this.is_game_active = false;
                        this.game_time = (Date.now() - this.game_start_time - this.paused_time) / 1000;
                        this.game_state = "NAME_INPUT";
                        this.player_name = "";
                    } else {
                        this.sound_manager.play('damage');
                        this.invincible_until = performance.now() + INVINCIBILITY_TIME;
                    }
                }
            }
            
            // Check if player reached goal AFTER movement
            if (this.player.pos[0] === this.maze.end_pos[0] && 
                this.player.pos[1] === this.maze.end_pos[1]) {
                console.log(`Level ${this.current_level} Complete!`);
                this.sound_manager.play('level_complete');
                this.current_level += 1;
                this.generate_new_level();
                this.sound_manager.change_background_music();
            }
            
            this.check_orb_collection();
        }
    }
    
    get_path_to_goal() {
        const start = [this.player.grid_pos[0], this.player.grid_pos[1]];
        const end = [
            Math.floor(this.maze.end_pos[0] / GRID_SIZE), 
            Math.floor(this.maze.end_pos[1] / GRID_SIZE)
        ];
        
        const heuristic = (a, b) => {
            return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
        };
        
        const get_neighbors = (pos) => {
            const neighbors = [];
            const directions = [[0,1], [1,0], [0,-1], [-1,0]];
            
            for (const [dx, dy] of directions) {
                const new_x = pos[0] + dx;
                const new_y = pos[1] + dy;
                
                if (new_x > 0 && new_x < GRID_WIDTH-1 && 
                    new_y > 0 && new_y < GRID_HEIGHT-1 && 
                    this.maze.grid[new_y][new_x] === 0) {
                    
                    // Check if any enemy is near this position
                    const grid_pos_center = [
                        new_x * GRID_SIZE + GRID_SIZE/2,
                        new_y * GRID_SIZE + GRID_SIZE/2
                    ];
                    
                    // Skip this neighbor if an enemy is too close
                    let enemy_nearby = false;
                    for (const enemy of this.enemies) {
                        const dx = grid_pos_center[0] - enemy.pos[0];
                        const dy = grid_pos_center[1] - enemy.pos[1];
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < GRID_SIZE * 2) {  // Avoid positions within 2 grid cells of enemies
                            enemy_nearby = true;
                            break;
                        }
                    }
                    
                    if (!enemy_nearby) {
                        neighbors.push([new_x, new_y]);
                    }
                }
            }
            return neighbors;
        };

        // A* implementation
        const frontier = [[0, start]];  // [priority, position]
        const came_from = new Map();
        const cost_so_far = new Map();
        came_from.set(start.toString(), null);
        cost_so_far.set(start.toString(), 0);

        while (frontier.length > 0) {
            frontier.sort((a, b) => a[0] - b[0]);
            const current = frontier.shift()[1];
            
            if (current[0] === end[0] && current[1] === end[1]) {
                break;
            }
            
            for (const next_pos of get_neighbors(current)) {
                const new_cost = cost_so_far.get(current.toString()) + 1;
                if (!cost_so_far.has(next_pos.toString()) || 
                    new_cost < cost_so_far.get(next_pos.toString())) {
                    cost_so_far.set(next_pos.toString(), new_cost);
                    const priority = new_cost + heuristic(end, next_pos);
                    frontier.push([priority, next_pos]);
                    came_from.set(next_pos.toString(), current);
                }
            }
        }

        // Reconstruct path
        let current = end;
        const path = [];
        while (current !== null) {
            path.push(current);
            current = came_from.get(current.toString());
            if (!current) break;
        }
        if (path.length <= 1) return [];  // No path found
        path.reverse();
        return path;
    }

    get_direction_to_next_point(current_grid_pos, next_grid_pos) {
        return [
            next_grid_pos[0] - current_grid_pos[0],
            next_grid_pos[1] - current_grid_pos[1]
        ];
    }
    
    draw() {
        this.ctx.fillStyle = BLACK;
        this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
        
        if (this.game_state === "START_SCREEN") {
            // Draw start screen
            this.ctx.font = this.big_font;
            this.ctx.fillStyle = NEON_BLUE;
            
            const title = "NEON MAZE";
            const prompt = "PRESS ANY KEY TO START";
            
            const title_metrics = this.ctx.measureText(title);
            const prompt_metrics = this.ctx.measureText(prompt);
            
            // Draw title
            this.ctx.fillText(
                title,
                (WINDOW_WIDTH - title_metrics.width) / 2,
                WINDOW_HEIGHT / 3
            );
            
            // Draw blinking prompt
            this.ctx.fillStyle = Math.floor(performance.now() / 500) % 2 ? 
                                NEON_BLUE : 'rgba(0, 195, 255, 0.5)';
            this.ctx.fillText(
                prompt,
                (WINDOW_WIDTH - prompt_metrics.width) / 2,
                WINDOW_HEIGHT * 2/3
            );
            
            return;  // Don't draw game elements on start screen
        }
        
        if (this.game_state === "PLAYING") {
            // Draw status bar first
            this.draw_status_bar();
            
            // Create game surface with adjusted size
            this.game_ctx.fillStyle = BLACK;
            this.game_ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT - STATUS_BAR_HEIGHT);
            
            // Check if light orb is active
            const light_orb_active = performance.now() < this.light_power_until;
            
            if (light_orb_active) {
                // Draw all walls with high visibility
                for (const wall of this.maze.walls) {
                    this.game_ctx.fillStyle = WALL_COLOR;
                    this.game_ctx.beginPath();
                    this.game_ctx.roundRect(
                        wall.rect.x, wall.rect.y, 
                        wall.rect.width, wall.rect.height, 
                        WALL_CORNER_RADIUS
                    );
                    this.game_ctx.fill();
                }
                
                // Draw all entities
                for (const enemy of this.enemies) {
                    enemy.draw(this.game_ctx, 1.0);
                }
                for (const heart of this.hearts) {
                    heart.draw(this.game_ctx, 1.0);
                }
                for (const orb of this.light_orbs) {
                    orb.draw(this.game_ctx, 1.0);
                }
                
                // Add slight darkness overlay
                this.game_ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';  // 40/255 ≈ 0.16
                this.game_ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT - STATUS_BAR_HEIGHT);
            } else {
                // Draw all walls in white first
                this.wall_ctx.clearRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT - STATUS_BAR_HEIGHT);
                for (const wall of this.maze.walls) {
                    this.wall_ctx.fillStyle = WALL_COLOR;  // White walls
                    this.wall_ctx.beginPath();
                    this.wall_ctx.roundRect(
                        wall.rect.x, wall.rect.y,
                        wall.rect.width, wall.rect.height,
                        WALL_CORNER_RADIUS
                    );
                    this.wall_ctx.fill();
                }

                // Create darkness overlay with light cutout
                const darkness = document.createElement('canvas');
                darkness.width = WINDOW_WIDTH;
                darkness.height = WINDOW_HEIGHT - STATUS_BAR_HEIGHT;
                const darkness_ctx = darkness.getContext('2d');

                // Fill with black
                darkness_ctx.fillStyle = BLACK;
                darkness_ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT - STATUS_BAR_HEIGHT);

                // Cut out light circle using 'destination-out'
                darkness_ctx.globalCompositeOperation = 'destination-out';
                const gradient = darkness_ctx.createRadialGradient(
                    this.player.pos[0], this.player.pos[1], 0,
                    this.player.pos[0], this.player.pos[1], LIGHT_RADIUS
                );

                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                darkness_ctx.fillStyle = gradient;
                darkness_ctx.beginPath();
                darkness_ctx.arc(this.player.pos[0], this.player.pos[1], LIGHT_RADIUS, 0, Math.PI * 2);
                darkness_ctx.fill();

                // Draw the walls
                this.game_ctx.drawImage(this.wall_surface, 0, 0);

                // Apply darkness overlay
                this.game_ctx.drawImage(darkness, 0, 0);

                // Draw visible entities
                this.draw_visible_entities();
            }
            
            // Draw goal indicator
            this.maze.draw_goal(this.game_ctx);
            
            // Draw player with invincibility effect
            if (performance.now() < this.invincible_until) {
                if (Math.floor(performance.now() / 125) % 2) {
                    this.player.draw(this.game_ctx);
                }
            } else {
                this.player.draw(this.game_ctx);
            }
            
            // Draw game surface onto main canvas
            this.ctx.drawImage(this.game_surface, 0, STATUS_BAR_HEIGHT);
            
            if (this.show_scores) {
                this.draw_high_scores();
            }
        } else if (this.game_state === "NAME_INPUT") {
            this.draw_name_input();
            this.draw_status_bar();
        } else if (this.game_state === "SHOW_SCORES") {
            this.draw_high_scores();
            
            // Draw blinking prompt
            const prompt_color = Math.floor(performance.now() / 500) % 2 ? 
                               'rgb(255, 0, 0)' : 'rgb(100, 0, 0)';
            this.ctx.font = this.font;
            this.ctx.fillStyle = prompt_color;
            const prompt_text = "PRESS ANY KEY TO CONTINUE";
            const text_metrics = this.ctx.measureText(prompt_text);
            this.ctx.fillText(
                prompt_text,
                (WINDOW_WIDTH - text_metrics.width) / 2,
                WINDOW_HEIGHT - 50
            );
        }
    }
    
    reset_level(maze_data) {
        this.maze = new Maze(maze_data);
        this.player = new Player(this.maze.start_pos, this.current_level, this.sound_manager);
        this.current_direction = [0, 0];
        this.level_start_time = performance.now();
        
        // Get reachable cells using flood fill
        const reachable_cells = this.get_reachable_cells(maze_data.grid);
        
        // Create list of valid spawn positions from reachable cells
        const valid_spawn_positions = [];
        for (const [y, x] of reachable_cells) {
            // Calculate spawn position at exact grid cell center for orbs, offset for hearts
            const heart_pos = [
                (x * GRID_SIZE) + (GRID_SIZE / 2),
                (y * GRID_SIZE) + GRID_SIZE  // Hearts offset by full grid cell
            ];
            
            const orb_pos = [
                (x * GRID_SIZE) + (GRID_SIZE / 2),
                (y * GRID_SIZE) + (GRID_SIZE / 2)  // Orbs at grid center
            ];
            
            // Check distance from start and end positions using grid coordinates
            const start_grid_x = Math.floor(this.maze.start_pos[0] / GRID_SIZE);
            const start_grid_y = Math.floor(this.maze.start_pos[1] / GRID_SIZE);
            const end_grid_x = Math.floor(this.maze.end_pos[0] / GRID_SIZE);
            const end_grid_y = Math.floor(this.maze.end_pos[1] / GRID_SIZE);
            
            if (Math.abs(x - start_grid_x) > 3 &&
                Math.abs(y - start_grid_y) > 3 &&
                Math.abs(x - end_grid_x) > 3 &&
                Math.abs(y - end_grid_y) > 3) {
                valid_spawn_positions.push({ heart_pos, orb_pos });
            }
        }
        
        // Initialize empty lists
        this.enemies = [];
        this.hearts = [];
        this.light_orbs = [];
        
        // Spawn enemies
        const num_enemies = Math.min(this.current_level, MAX_ENEMIES);
        if (valid_spawn_positions.length > 0 && num_enemies > 0) {
            const enemy_positions = this.getRandomElements(valid_spawn_positions, 
                                                         Math.min(num_enemies, valid_spawn_positions.length));
            for (const pos of enemy_positions) {
                this.enemies.push(new Enemy(pos.orb_pos));  // Use center position for enemies
                valid_spawn_positions.splice(valid_spawn_positions.indexOf(pos), 1);
            }
        }
        
        // Spawn hearts
        const num_hearts = Math.min(this.current_level, MAX_LIVES);
        if (valid_spawn_positions.length > 0 && num_hearts > 0) {
            const heart_positions = this.getRandomElements(valid_spawn_positions,
                                                         Math.min(num_hearts, valid_spawn_positions.length));
            for (const pos of heart_positions) {
                this.hearts.push(new Heart(pos.heart_pos));  // Use offset position for hearts
                valid_spawn_positions.splice(valid_spawn_positions.indexOf(pos), 1);
            }
        }
        
        // Maybe spawn light orb
        if (valid_spawn_positions.length > 0 && Math.random() < LIGHT_ORB_SPAWN_CHANCE) {
            const orb_pos = valid_spawn_positions[Math.floor(Math.random() * valid_spawn_positions.length)];
            this.light_orbs = [new LightOrb(orb_pos.orb_pos)];  // Use center position for orb
        }
    }
    
    get_reachable_cells(grid) {
        // Find all cells reachable from start position using flood fill
        const start_y = 1;
        const start_x = 1;
        const reachable = new Set();
        const queue = [[start_y, start_x]];
        
        while (queue.length > 0) {
            const [y, x] = queue.shift();
            const key = `${y},${x}`;
            
            if (reachable.has(key)) continue;
            
            reachable.add(key);
            
            // Check all adjacent cells
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            for (const [dy, dx] of directions) {
                const new_y = y + dy;
                const new_x = x + dx;
                if (new_y > 0 && new_y < grid.length - 1 &&
                    new_x > 0 && new_x < grid[0].length - 1 &&
                    grid[new_y][new_x] === 0 &&
                    !reachable.has(`${new_y},${new_x}`)) {
                    queue.push([new_y, new_x]);
                }
            }
        }
        
        // Convert back to array of coordinates
        return Array.from(reachable).map(key => {
            const [y, x] = key.split(',').map(Number);
            return [y, x];
        });
    }
    
    getRandomElements(array, n) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }
    
    check_player_enemy_collision() {
        for (const enemy of this.enemies) {
            const dx = this.player.pos[0] - enemy.pos[0];
            const dy = this.player.pos[1] - enemy.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.player.radius + enemy.radius)) {
                return true;
            }
        }
        return false;
    }
    
    generate_new_level() {
        const maze_generator = new MazeGenerator(GRID_WIDTH, GRID_HEIGHT);
        const maze_data = maze_generator.generate();
        this.reset_level(maze_data);
    }

    draw_status_bar() {
        // Draw status bar background
        this.ctx.fillStyle = STATUS_BAR_COLOR;
        this.ctx.fillRect(0, 0, WINDOW_WIDTH, STATUS_BAR_HEIGHT);
        this.ctx.strokeStyle = NEON_BLUE;
        this.ctx.lineWidth = STATUS_BAR_BORDER;
        this.ctx.beginPath();
        this.ctx.moveTo(0, STATUS_BAR_HEIGHT);
        this.ctx.lineTo(WINDOW_WIDTH, STATUS_BAR_HEIGHT);
        this.ctx.stroke();
        
        // Calculate stats
        const levels = this.current_level - 1;
        const lpm = (levels * 60) / this.game_time || 0;
        const score = Math.round(lpm * levels * 100) / 100;
        
        // Calculate space needed for hearts
        const heart_size = 6;
        const heart_spacing = heart_size * 2;
        const hearts_width = (this.lives * heart_spacing) + (STATUS_PADDING * 2);  // Add padding on both sides
        
        // Calculate width for text sections with space reserved for hearts
        const total_width = WINDOW_WIDTH - hearts_width - (2 * STATUS_PADDING);
        const section_width = total_width / 4;
        
        // Create text surfaces with adjusted positions
        const texts = [
            [`LEVEL ${this.current_level}`, STATUS_PADDING],
            [`TIME: ${Math.floor(this.game_time)}s`, STATUS_PADDING + section_width],
            [`LPM: ${lpm.toFixed(2)}`, STATUS_PADDING + section_width * 2],
            [`SCORE: ${score.toFixed(2)}`, STATUS_PADDING + section_width * 3]
        ];
        
        // Draw texts
        this.ctx.font = this.font;
        this.ctx.fillStyle = STATUS_TEXT_COLOR;
        for (const [text, x] of texts) {
            const metrics = this.ctx.measureText(text);
            const y = STATUS_BAR_HEIGHT / 2 + metrics.actualBoundingBoxAscent / 2;
            this.ctx.fillText(text, x, y);
        }
        
        // Draw lives as green circles
        const hearts_start_x = WINDOW_WIDTH - hearts_width + STATUS_PADDING;
        const hearts_y = STATUS_BAR_HEIGHT / 2;
        
        this.ctx.fillStyle = HEART_COLOR;  // Use heart color from settings
        for (let i = 0; i < this.lives; i++) {
            this.ctx.beginPath();
            this.ctx.arc(
                hearts_start_x + (i * heart_spacing),
                hearts_y,
                heart_size,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    draw_high_scores() {
        const scores = this.high_score_manager.get_top_scores();
        
        // Draw title
        this.ctx.font = this.big_font;
        this.ctx.fillStyle = NEON_BLUE;
        const title = "HIGH SCORES";
        const title_metrics = this.ctx.measureText(title);
        this.ctx.fillText(
            title,
            (WINDOW_WIDTH - title_metrics.width) / 2,
            50
        );
        
        // Draw scores
        this.ctx.font = this.font;
        let y = 120;
        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            const text = `${i + 1}. ${score.name}: ${score.score}`;
            const score_details = `(${score.levels} levels at ${score.lpm} LPM)`;
            
            const text_metrics = this.ctx.measureText(text);
            const details_metrics = this.ctx.measureText(score_details);
            
            // Draw main score line
            this.ctx.fillStyle = NEON_BLUE;
            this.ctx.fillText(
                text,
                (WINDOW_WIDTH - text_metrics.width) / 2,
                y
            );
            
            // Draw details line
            this.ctx.fillStyle = 'rgb(100, 100, 255)';
            this.ctx.fillText(
                score_details,
                (WINDOW_WIDTH - details_metrics.width) / 2,
                y + 25
            );
            
            y += 60;
        }
    }

    draw_name_input() {
        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
        
        // Calculate vertical spacing
        const spacing = 60;
        const start_y = WINDOW_HEIGHT / 4;
        
        // Draw game over text
        this.ctx.font = this.big_font;
        this.ctx.fillStyle = 'rgb(255, 0, 0)';
        const game_over = "GAME OVER";
        const game_over_metrics = this.ctx.measureText(game_over);
        this.ctx.fillText(
            game_over,
            (WINDOW_WIDTH - game_over_metrics.width) / 2,
            start_y
        );
        
        // Draw level reached
        this.ctx.font = this.font;
        this.ctx.fillStyle = NEON_BLUE;
        const level_text = `You reached level ${this.current_level}`;
        const level_metrics = this.ctx.measureText(level_text);
        this.ctx.fillText(
            level_text,
            (WINDOW_WIDTH - level_metrics.width) / 2,
            start_y + spacing
        );
        
        // Draw time info
        const time_text = `Time: ${Math.floor(this.game_time)}s`;
        const speed_text = `Speed: ${((this.current_level - 1) * 60 / this.game_time).toFixed(2)} LPM`;
        
        const time_metrics = this.ctx.measureText(time_text);
        const speed_metrics = this.ctx.measureText(speed_text);
        
        this.ctx.fillText(
            time_text,
            (WINDOW_WIDTH - time_metrics.width) / 2,
            start_y + spacing * 2
        );
        this.ctx.fillText(
            speed_text,
            (WINDOW_WIDTH - speed_metrics.width) / 2,
            start_y + spacing * 3
        );
        
        // Draw name input prompt
        const prompt = "Enter your name:";
        const prompt_metrics = this.ctx.measureText(prompt);
        this.ctx.fillText(
            prompt,
            (WINDOW_WIDTH - prompt_metrics.width) / 2,
            start_y + spacing * 4
        );
        
        // Draw name input with blinking cursor
        const cursor = Math.floor(performance.now() / 500) % 2 ? "_" : " ";
        const name = this.player_name + cursor;
        const name_metrics = this.ctx.measureText(name);
        this.ctx.fillText(
            name,
            (WINDOW_WIDTH - name_metrics.width) / 2,
            start_y + spacing * 5
        );
    }

    draw_visible_entities() {
        // Draw visible enemies
        for (const enemy of this.enemies) {
            const dx = enemy.pos[0] - this.player.pos[0];
            const dy = enemy.pos[1] - this.player.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= LIGHT_RADIUS) {
                const visibility = 1.0 - (distance / LIGHT_RADIUS);
                enemy.draw(this.game_ctx, visibility);
            }
        }
        
        // Draw visible hearts
        for (const heart of this.hearts) {
            const dx = heart.pos[0] - this.player.pos[0];
            const dy = heart.pos[1] - this.player.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= LIGHT_RADIUS) {
                const visibility = 1.0 - (distance / LIGHT_RADIUS);
                heart.draw(this.game_ctx, visibility);
            }
        }
        
        // Draw visible light orbs
        for (const orb of this.light_orbs) {
            const dx = orb.pos[0] - this.player.pos[0];
            const dy = orb.pos[1] - this.player.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= LIGHT_RADIUS) {
                const visibility = 1.0 - (distance / LIGHT_RADIUS);
                orb.draw(this.game_ctx, visibility);
            }
        }
    }

    check_heart_collection() {
        for (const heart of this.hearts) {
            const dx = this.player.pos[0] - heart.pos[0];
            const dy = this.player.pos[1] - heart.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.player.radius + heart.radius)) {
                this.hearts = this.hearts.filter(h => h !== heart);
                if (this.lives < MAX_LIVES) {
                    this.lives += 1;
                    this.sound_manager.play('coin');
                }
            }
        }
    }

    check_orb_collection() {
        for (const orb of this.light_orbs) {
            const dx = this.player.pos[0] - orb.pos[0];
            const dy = this.player.pos[1] - orb.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (this.player.radius + orb.radius)) {
                this.light_orbs = this.light_orbs.filter(o => o !== orb);
                this.light_power_until = performance.now() + LIGHT_ORB_DURATION;
                this.sound_manager.play('coin');
            }
        }
    }
} 
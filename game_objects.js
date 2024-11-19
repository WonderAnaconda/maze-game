class Player {
    constructor(start_pos, level, sound_manager) {
        this.pos = [...start_pos];
        this.target_pos = [...start_pos];
        this.grid_pos = [
            Math.floor(start_pos[0] / GRID_SIZE),
            Math.floor(start_pos[1] / GRID_SIZE)
        ];
        this.radius = PLAYER_SIZE / 2;
        this.speed = PLAYER_SPEED;
        this.trail = [];
        this.trail_length = Math.max(
            INITIAL_TRAIL_LENGTH,
            Math.min(
                BASE_TRAIL_LENGTH + (level - 1) * TRAIL_LENGTH_INCREASE,
                MAX_TRAIL_LENGTH
            )
        );
        this.sound_manager = sound_manager;
        this.last_wall_hit = false;
        this.current_direction = [0, 0];  // Track current movement direction
    }
    
    move(direction, maze) {
        // If we're at our target position, check for new direction
        if (this.pos[0] === this.target_pos[0] && this.pos[1] === this.target_pos[1]) {
            // Calculate new grid position based on input direction
            const new_grid_pos = [
                this.grid_pos[0] + direction[0],
                this.grid_pos[1] + direction[1]
            ];
            
            // Calculate exact target position (center of grid cell)
            const new_target = [
                new_grid_pos[0] * GRID_SIZE + GRID_SIZE/2,
                new_grid_pos[1] * GRID_SIZE + GRID_SIZE/2
            ];
            
            // First try the new direction
            if (maze.grid[new_grid_pos[1]][new_grid_pos[0]] === 0) {
                this.current_direction = direction;
                this.grid_pos = new_grid_pos;
                this.target_pos = new_target;
                this.last_wall_hit = false;
            }
            // If new direction is blocked, try continuing in current direction
            else if (this.current_direction[0] !== 0 || this.current_direction[1] !== 0) {
                const continue_grid_pos = [
                    this.grid_pos[0] + this.current_direction[0],
                    this.grid_pos[1] + this.current_direction[1]
                ];
                
                const continue_target = [
                    continue_grid_pos[0] * GRID_SIZE + GRID_SIZE/2,
                    continue_grid_pos[1] * GRID_SIZE + GRID_SIZE/2
                ];
                
                if (maze.grid[continue_grid_pos[1]][continue_grid_pos[0]] === 0) {
                    this.grid_pos = continue_grid_pos;
                    this.target_pos = continue_target;
                } else if (!this.last_wall_hit) {
                    this.sound_manager.play('wall_hit');
                    this.last_wall_hit = true;
                }
            }
        }
        
        // Move towards target position
        if (this.pos[0] !== this.target_pos[0] || this.pos[1] !== this.target_pos[1]) {
            this.trail.push({
                pos: [...this.pos],
                time: performance.now()
            });
            
            while (this.trail.length > this.trail_length) {
                this.trail.shift();
            }
            
            const dx = this.target_pos[0] - this.pos[0];
            const dy = this.target_pos[1] - this.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.speed) {
                this.pos = [...this.target_pos];
            } else {
                this.pos[0] += (dx / distance) * this.speed;
                this.pos[1] += (dy / distance) * this.speed;
            }
            
            this.grid_pos = [
                Math.floor(this.pos[0] / GRID_SIZE),
                Math.floor(this.pos[1] / GRID_SIZE)
            ];
        }
    }
    
    update_trail_length(time_in_level) {
        this.trail_length = Math.min(
            INITIAL_TRAIL_LENGTH + time_in_level * TRAIL_GROWTH_RATE,
            MAX_TRAIL_LENGTH
        );
    }
    
    draw(ctx) {
        const current_time = performance.now();
        
        // Draw trail with both position and time-based fading
        for (let i = 0; i < this.trail.length; i++) {
            const trail_point = this.trail[i];
            const pos_fade = i / this.trail.length;  // Position-based fade (0 to 1)
            const time_fade = Math.max(0, 1 - (current_time - trail_point.time) / 1000);
            const alpha = pos_fade * time_fade * 0.5;  // Combine both fades, max alpha 0.5
            
            ctx.fillStyle = `rgba(0, 195, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(
                trail_point.pos[0], trail_point.pos[1],
                this.radius * 0.8, 0, Math.PI * 2
            );
            ctx.fill();
        }
        
        // Draw player
        ctx.fillStyle = NEON_BLUE;
        ctx.beginPath();
        ctx.arc(
            this.pos[0], this.pos[1],
            this.radius, 0, Math.PI * 2
        );
        ctx.fill();
    }
    
    isAtGridCenter() {
        const grid_center_x = this.grid_pos[0] * GRID_SIZE + GRID_SIZE/2;
        const grid_center_y = this.grid_pos[1] * GRID_SIZE + GRID_SIZE/2;
        
        // Increase tolerance to allow for floating point imprecision
        const tolerance = PLAYER_SPEED;
        return Math.abs(this.pos[0] - grid_center_x) < tolerance && 
               Math.abs(this.pos[1] - grid_center_y) < tolerance;
    }
}

class Maze {
    constructor(maze_data) {
        this.grid = maze_data.grid;
        this.start_pos = [
            GRID_SIZE + GRID_SIZE/2,  // Start in second cell from left
            GRID_SIZE + GRID_SIZE/2   // Start in second cell from top
        ];
        this.end_pos = [
            (GRID_WIDTH - 2) * GRID_SIZE + GRID_SIZE/2,  // End in second to last cell
            (GRID_HEIGHT - 2) * GRID_SIZE + GRID_SIZE/2
        ];
        
        // Create wall rectangles for rendering
        this.walls = [];
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === 1) {
                    this.walls.push({
                        rect: {
                            x: x * GRID_SIZE,
                            y: y * GRID_SIZE,
                            width: GRID_SIZE,
                            height: GRID_SIZE
                        }
                    });
                }
            }
        }
    }
    
    get_visible_walls(player_pos, light_radius) {
        return this.walls.filter(wall => {
            // Check if any corner of the wall is within light radius
            const corners = [
                [wall.rect.x, wall.rect.y],
                [wall.rect.x + wall.rect.width, wall.rect.y],
                [wall.rect.x, wall.rect.y + wall.rect.height],
                [wall.rect.x + wall.rect.width, wall.rect.y + wall.rect.height]
            ];
            
            return corners.some(corner => {
                const dx = corner[0] - player_pos[0];
                const dy = corner[1] - player_pos[1];
                return Math.sqrt(dx * dx + dy * dy) <= light_radius;
            });
        });
    }
    
    draw_goal(ctx) {
        // Draw pulsing goal indicator
        const pulse = (Math.sin(performance.now() / 200) + 1) / 2;  // 0 to 1
        const radius = GOAL_SIZE + pulse * 4;
        
        ctx.fillStyle = GOAL_COLOR;
        ctx.beginPath();
        ctx.arc(this.end_pos[0], this.end_pos[1], radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    
    generate() {
        // Initialize grid with walls
        const grid = Array(this.height).fill().map(() => Array(this.width).fill(1));
        
        // Create paths using recursive backtracking
        const stack = [];
        const start = [1, 1];  // Start at (1,1) to ensure border
        grid[start[1]][start[0]] = 0;  // Clear starting cell
        stack.push(start);
        
        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.get_unvisited_neighbors(current, grid);
            
            if (neighbors.length === 0) {
                stack.pop();
                continue;
            }
            
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            const [dx, dy] = [
                next[0] - current[0],
                next[1] - current[1]
            ];
            
            // Clear path and destination
            grid[current[1] + dy/2][current[0] + dx/2] = 0;
            grid[next[1]][next[0]] = 0;
            
            stack.push(next);
        }
        
        // Ensure end position is clear
        const end_y = this.height - 2;
        const end_x = this.width - 2;
        grid[end_y][end_x] = 0;
        grid[end_y][end_x - 1] = 0;  // Clear path to end
        grid[end_y - 1][end_x] = 0;  // Clear path to end
        
        // Add some random paths for variety
        this.add_random_paths(grid);
        
        return { grid };
    }
    
    get_unvisited_neighbors(pos, grid) {
        const neighbors = [];
        const directions = [[0,2], [2,0], [0,-2], [-2,0]];
        
        for (const [dx, dy] of directions) {
            const new_x = pos[0] + dx;
            const new_y = pos[1] + dy;
            
            if (new_x > 0 && new_x < this.width - 1 &&
                new_y > 0 && new_y < this.height - 1 &&
                grid[new_y][new_x] === 1) {
                neighbors.push([new_x, new_y]);
            }
        }
        
        return neighbors;
    }
    
    add_random_paths(grid) {
        const num_paths = Math.floor((this.width + this.height) / 4);
        for (let i = 0; i < num_paths; i++) {
            const x = Math.floor(Math.random() * (this.width - 4)) + 2;
            const y = Math.floor(Math.random() * (this.height - 4)) + 2;
            if (Math.random() < 0.5) {
                // Horizontal path
                grid[y][x] = 0;
                grid[y][x+1] = 0;
            } else {
                // Vertical path
                grid[y][x] = 0;
                grid[y+1][x] = 0;
            }
        }
    }
}

class Enemy {
    constructor(pos) {
        this.pos = [...pos];
        this.target_pos = [...pos];
        this.grid_pos = [
            Math.floor(pos[0] / GRID_SIZE),
            Math.floor(pos[1] / GRID_SIZE)
        ];
        this.radius = ENEMY_SIZE / 2;
        this.speed = ENEMY_SPEED;
        this.direction = [1, 0];  // Start moving right
        this.last_move = performance.now();
    }
    
    move(maze) {
        // Only move every few milliseconds
        const current_time = performance.now();
        if (current_time - this.last_move < 16) return;  // ~60fps
        
        // If we've reached our target, choose new direction
        if (this.pos[0] === this.target_pos[0] && this.pos[1] === this.target_pos[1]) {
            // Calculate new target grid position
            const new_grid_pos = [
                this.grid_pos[0] + this.direction[0],
                this.grid_pos[1] + this.direction[1]
            ];
            
            // Check if new target would be in a wall
            if (maze.grid[new_grid_pos[1]][new_grid_pos[0]] === 0) {
                // Convert grid position to pixel position (center of grid cell)
                this.target_pos = [
                    new_grid_pos[0] * GRID_SIZE + GRID_SIZE/2,
                    new_grid_pos[1] * GRID_SIZE + GRID_SIZE/2
                ];
            } else {
                // Hit wall, choose new random direction
                const possible_directions = [[1,0], [-1,0], [0,1], [0,-1]];
                this.direction = possible_directions[
                    Math.floor(Math.random() * possible_directions.length)
                ];
            }
        }
        
        // Move towards target
        if (this.pos[0] !== this.target_pos[0] || this.pos[1] !== this.target_pos[1]) {
            const dx = this.target_pos[0] - this.pos[0];
            const dy = this.target_pos[1] - this.pos[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.speed) {
                this.pos = [...this.target_pos];
            } else {
                this.pos[0] += (dx / distance) * this.speed;
                this.pos[1] += (dy / distance) * this.speed;
            }
            
            // Update grid position
            this.grid_pos = [
                Math.floor(this.pos[0] / GRID_SIZE),
                Math.floor(this.pos[1] / GRID_SIZE)
            ];
        }
        
        this.last_move = current_time;
    }
    
    draw(ctx, visibility = 1.0) {
        // Draw normal enemy with visibility
        ctx.fillStyle = `rgba(255, 16, 240, ${visibility})`;
        ctx.beginPath();
        ctx.arc(
            this.pos[0],
            this.pos[1],
            this.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

class Heart {
    constructor(pos) {
        this.pos = pos;
        this.radius = HEART_RADIUS;
    }
    
    draw(ctx, visibility = 1.0) {
        const color = `rgba(${HEART_COLOR.match(/\d+/g).join(',')}, ${visibility})`;
        this._draw_glowing_circle(ctx, this.pos, this.radius, color);
    }
    
    _draw_glowing_circle(ctx, pos, radius, color) {
        // Draw a simple heart shape
        ctx.fillStyle = color;
        ctx.beginPath();
        
        // Scale heart based on radius
        const scale = this.radius / 10;  // Assuming base size of 10
        
        // Move to center position
        ctx.translate(pos[0], pos[1]);
        ctx.scale(scale, scale);
        
        // Draw heart path
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-10, -8, -10, -16, 0, -16);
        ctx.bezierCurveTo(10, -16, 10, -8, 0, 0);
        
        ctx.fill();
        
        // Reset transformations
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}

class LightOrb {
    constructor(pos) {
        this.pos = pos;
        this.radius = PLAYER_SIZE / 2;
        this.glow_offset = Math.random() * Math.PI * 2;  // Random starting phase
    }
    
    draw(ctx, visibility = 1.0) {
        // Create glowing effect
        const glow = (Math.sin(performance.now() / 200 + this.glow_offset) + 1) / 2;
        const alpha = (0.5 + glow * 0.5) * visibility;
        
        // Draw outer glow
        ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.pos[0], this.pos[1], this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner orb
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.pos[0], this.pos[1], this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Continue with other classes... 
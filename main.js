function main() {
    // Generate initial maze data
    const mazeGenerator = new MazeGenerator(GRID_WIDTH, GRID_HEIGHT);
    const initialMazeData = mazeGenerator.generate();
    
    // Create and start game
    const game = new Game(initialMazeData);
}

// Start the game when the page loads
window.addEventListener('load', main); 
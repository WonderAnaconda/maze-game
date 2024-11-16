class HighScoreManager {
    constructor(filename = "highscores.json") {
        this.filename = filename;
        this.highscores = this.load_scores();
    }
    
    load_scores() {
        try {
            const stored = localStorage.getItem(this.filename);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load scores:', error);
        }
        return [];
    }
    
    save_scores() {
        try {
            localStorage.setItem(this.filename, JSON.stringify(this.highscores));
        } catch (error) {
            console.error('Failed to save scores:', error);
        }
    }
    
    add_score(name, levels, time_taken) {
        // Calculate levels per minute
        const levels_per_minute = (levels * 60) / time_taken;
        // Multiply LPM by levels for final score
        const score = Math.round(levels_per_minute * levels * 100) / 100;  // Round to 2 decimal places
        
        this.highscores.push({
            name: name,
            levels: levels,
            time: time_taken,
            lpm: Math.round(levels_per_minute * 100) / 100,  // Store original LPM for display
            score: score
        });
        
        // Sort by score (LPM * levels), highest first
        this.highscores.sort((a, b) => b.score - a.score);
        // Keep only top 10
        this.highscores = this.highscores.slice(0, 10);
        this.save_scores();
    }
    
    get_top_scores(n = 10) {
        return this.highscores.slice(0, n);
    }
} 
class SoundManager {
    constructor() {
        this.sounds = {};
        this.background_tracks = [];
        this.current_bg_music = null;
        this.is_muted = false;
        
        // Add error handling for sound loading
        const loadSound = (name, path) => {
            try {
                const audio = new Audio(path);
                return audio.load(), audio;
            } catch (error) {
                console.error(`Could not load sound: ${path}`);
                return null;
            }
        };
        
        // Load sounds with error handling
        for (const [name, path] of Object.entries(SOUNDS)) {
            const audio = loadSound(name, path);
            if (audio) {
                if (name.startsWith('background')) {
                    audio.volume = BACKGROUND_VOLUME;
                    if (name === 'background') {
                        this.background_tracks.unshift(audio);
                    } else {
                        this.background_tracks.push(audio);
                    }
                } else {
                    this.sounds[name] = audio;
                }
            }
        }
        
        // Handle autoplay restrictions
        const startMusic = () => {
            if (this.current_bg_music && !this.is_muted) {
                this.current_bg_music.play().catch(() => {
                    // If autoplay fails, try again on first click
                    document.addEventListener('click', () => {
                        if (this.current_bg_music && !this.is_muted) {
                            this.current_bg_music.play();
                        }
                    }, { once: true });
                });
            }
        };
        
        // Try to start music immediately
        startMusic();
        
        // Also try on document load
        if (document.readyState === 'complete') {
            startMusic();
        } else {
            document.addEventListener('DOMContentLoaded', startMusic);
        }
    }
    
    play(sound_name) {
        if (!this.is_muted && this.sounds[sound_name]) {
            try {
                const clone = this.sounds[sound_name].cloneNode();
                clone.play().catch(e => console.error('Audio play failed:', e));
            } catch (e) {
                console.error('Sound play error:', e);
            }
        }
    }
    
    change_background_music() {
        // Stop current music if playing
        if (this.current_bg_music) {
            this.current_bg_music.pause();
            this.current_bg_music.currentTime = 0;
        }
        
        // Choose random background track
        if (this.background_tracks.length > 0) {
            this.current_bg_music = this.background_tracks[
                Math.floor(Math.random() * this.background_tracks.length)
            ];
            if (!this.is_muted) {
                this.current_bg_music.loop = true;
                this.current_bg_music.play();
            }
        }
    }
    
    toggle_mute() {
        this.is_muted = !this.is_muted;
        if (this.is_muted) {
            if (this.current_bg_music) {
                this.current_bg_music.pause();
            }
        } else {
            if (this.current_bg_music) {
                this.current_bg_music.play();
            }
        }
    }
} 
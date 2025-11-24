// Simple and Reliable Audio Player
class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentArticle = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 1;
        this.playbackRate = 1.0;
        this.isExpanded = false;
        
        console.log('🎵 AudioPlayer initialized');
        this.init();
    }

    init() {
        this.setupAudioEvents();
        // Don't setup UI events here - wait for DOM
    }

    setupAudioEvents() {
        this.audio.addEventListener('loadedmetadata', () => {
            console.log('📊 Audio metadata loaded, duration:', this.audio.duration);
            this.duration = this.audio.duration;
            this.updateDurationDisplay();
        });

        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
        });

        this.audio.addEventListener('ended', () => {
            console.log('⏹️ Audio ended');
            this.isPlaying = false;
            this.updatePlayButton();
        });

        this.audio.addEventListener('canplay', () => {
            console.log('▶️ Audio can play');
        });

        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
            console.error('Audio error details:', this.audio.error);
        });
    }

    setupUIEvents() {
        console.log('🔧 Setting up UI events');
        
        // Use direct onclick handlers to avoid event listener issues
        this.setupDirectHandlers();
    }

    setupDirectHandlers() {
        // Play/Pause buttons
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        if (miniPlayBtn) {
            miniPlayBtn.onclick = () => {
                console.log('🎵 Mini play clicked');
                this.togglePlay();
            };
        }
        if (playPauseBtn) {
            playPauseBtn.onclick = () => {
                console.log('🎵 Main play clicked');
                this.togglePlay();
            };
        }

        // Expand/Collapse
        const expandPlayer = document.getElementById('expandPlayer');
        const collapsePlayer = document.getElementById('collapsePlayer');
        
        if (expandPlayer) {
            expandPlayer.onclick = () => {
                console.log('📱 Expand clicked');
                this.expandPlayer();
            };
        }
        if (collapsePlayer) {
            collapsePlayer.onclick = () => {
                console.log('📱 Collapse clicked');
                this.collapsePlayer();
            };
        }

        // Skip buttons - FIXED
        const rewindBtn = document.getElementById('rewindBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (rewindBtn) {
            rewindBtn.onclick = () => {
                console.log('⏪ Rewind clicked');
                this.skip(-15);
            };
        }
        if (forwardBtn) {
            forwardBtn.onclick = () => {
                console.log('⏩ Forward clicked');
                this.skip(30);
            };
        }

        // Progress bars
        const progressInput = document.getElementById('progressInput');
        const miniProgressInput = document.getElementById('miniProgressInput');
        
        if (progressInput) {
            progressInput.oninput = (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.audio.currentTime = seekTime;
            };
        }
        if (miniProgressInput) {
            miniProgressInput.oninput = (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.audio.currentTime = seekTime;
            };
        }

        // Speed control
        const speedBtn = document.getElementById('speedBtn');
        if (speedBtn) {
            speedBtn.onclick = () => this.toggleSpeed();
        }

        // Volume control
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.oninput = (e) => {
                this.volume = e.target.value / 100;
                this.audio.volume = this.volume;
                this.updateVolumeIcon();
            };
        }
    }

    loadArticle(article) {
        console.log('📥 Loading article:', article?.title);
        
        if (!article || !article.audioUrl) {
            console.error('❌ Invalid article data');
            return;
        }

        this.currentArticle = article;
        
        try {
            // Reset audio
            this.audio.pause();
            this.audio.currentTime = 0;
            
            // Set new source
            this.audio.src = article.audioUrl;
            this.audio.volume = this.volume;
            this.audio.playbackRate = this.playbackRate;
            
            this.updatePlayerInfo();
            this.showMiniPlayer();
            
            // Preload audio
            this.audio.load();
            
            console.log('✅ Audio loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading audio:', error);
        }
    }

    updatePlayerInfo() {
        if (!this.currentArticle) return;

        console.log('🔄 Updating player info');

        // Update mini player
        this.setElementContent('miniThumbnail', this.currentArticle.thumbnailUrl);
        this.setElementContent('miniTitle', this.currentArticle.title);
        this.setElementContent('miniCategory', this.currentArticle.category);

        // Update full player
        this.setElementContent('fullThumbnail', this.currentArticle.thumbnailUrl);
        this.setElementContent('fullTitle', this.currentArticle.title);
        this.setElementContent('fullCategory', this.currentArticle.category);
    }

    setElementContent(id, content) {
        const element = document.getElementById(id);
        if (element && content) {
            if (id.includes('Thumbnail')) {
                element.src = content;
            } else {
                element.textContent = content || '';
            }
        }
    }

    showMiniPlayer() {
        const miniPlayer = document.getElementById('miniPlayer');
        if (miniPlayer) {
            miniPlayer.style.display = 'block';
        }
    }

    expandPlayer() {
        this.isExpanded = true;
        const fullPlayer = document.getElementById('fullPlayer');
        const miniPlayer = document.getElementById('miniPlayer');
        
        if (fullPlayer) fullPlayer.classList.remove('translate-y-full');
        if (miniPlayer) miniPlayer.style.opacity = '0';
    }

    collapsePlayer() {
        this.isExpanded = false;
        const fullPlayer = document.getElementById('fullPlayer');
        const miniPlayer = document.getElementById('miniPlayer');
        
        if (fullPlayer) fullPlayer.classList.add('translate-y-full');
        if (miniPlayer) miniPlayer.style.opacity = '1';
    }

    togglePlay() {
        console.log('🔄 Toggle play, current state:', this.isPlaying);
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    async play() {
        try {
            console.log('▶️ Attempting to play audio');
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            console.log('✅ Audio playing successfully');
        } catch (error) {
            console.error('❌ Error playing audio:', error);
        }
    }

    pause() {
        console.log('⏸️ Pausing audio');
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    skip(seconds) {
        console.log('⏩ Skip:', seconds, 'seconds');
        const newTime = Math.max(0, this.audio.currentTime + seconds);
        this.audio.currentTime = newTime;
        
        // Keep playing if it was playing
        if (this.isPlaying) {
            this.audio.play().catch(e => {
                console.log('⚠️ Auto-play after skip prevented');
            });
        }
    }

    toggleSpeed() {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(this.playbackRate);
        this.playbackRate = speeds[(currentIndex + 1) % speeds.length];
        this.audio.playbackRate = this.playbackRate;
        
        this.setElementContent('speedBtn', `${this.playbackRate}x`);
    }

    updatePlayButton() {
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        
        if (playIcon && pauseIcon) {
            if (this.isPlaying) {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            } else {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            }
        }

        if (miniPlayBtn) {
            const icon = miniPlayBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause text-xs' : 'fas fa-play text-xs';
            }
        }
    }

    updateProgressBar() {
        const progress = (this.currentTime / this.duration) * 100 || 0;
        
        // Update progress bars
        const miniProgress = document.getElementById('miniProgress');
        const fullProgress = document.getElementById('fullProgress');
        const miniProgressInput = document.getElementById('miniProgressInput');
        const progressInput = document.getElementById('progressInput');
        
        if (miniProgress) miniProgress.style.width = `${progress}%`;
        if (fullProgress) fullProgress.style.width = `${progress}%`;
        if (miniProgressInput) miniProgressInput.value = progress;
        if (progressInput) progressInput.value = progress;
    }

    updateTimeDisplay() {
        this.setElementContent('miniCurrentTime', this.formatTime(this.currentTime));
        this.setElementContent('fullCurrentTime', this.formatTime(this.currentTime));
        this.setElementContent('miniDuration', this.formatTime(this.duration));
        this.setElementContent('fullDuration', this.formatTime(this.duration));
    }

    updateDurationDisplay() {
        this.setElementContent('miniDuration', this.formatTime(this.duration));
        this.setElementContent('fullDuration', this.formatTime(this.duration));
    }

    updateVolumeIcon() {
        const volumeIcon = document.getElementById('volumeBtn');
        if (volumeIcon) {
            const icon = volumeIcon.querySelector('i');
            if (icon) {
                if (this.volume === 0) {
                    icon.className = 'fas fa-volume-mute';
                } else if (this.volume < 0.5) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize audio player
window.audioPlayer = new AudioPlayer();
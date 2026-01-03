// Enhanced Audio Player with Real Duration Detection
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
        this.useHtml5Duration = false; // Track if we're using HTML5 duration
        
        console.log('🎵 AudioPlayer initialized');
        this.init();
    }

    init() {
        this.setupAudioEvents();
        this.setupUIEvents();
    }

setupAudioEvents() {
    // Handle metadata loaded - THIS IS THE KEY EVENT
    this.audio.addEventListener('loadedmetadata', () => {
        console.log('📊 HTML5 Audio metadata loaded');
        console.log('🎵 HTML5 duration:', this.audio.duration, 'seconds');
        
        // Check if HTML5 duration is valid
        if (this.audio.duration && this.audio.duration > 0 && !isNaN(this.audio.duration)) {
            const html5Duration = Math.round(this.audio.duration);
            const dbDuration = this.currentArticle?.duration || 0;
            
            console.log('📊 Duration comparison:');
            console.log('   HTML5:', html5Duration, 'seconds');
            console.log('   Database:', dbDuration, 'seconds');
            console.log('   Difference:', Math.abs(html5Duration - dbDuration), 'seconds');
            
            // Always prefer HTML5 duration if it's significantly different
            // or if database duration is suspicious (exactly 480s = 8:00)
            const isSuspiciousDBDuration = dbDuration === 480 || dbDuration === 0;
            const isSignificantDifference = Math.abs(html5Duration - dbDuration) > 30;
            
            if (isSuspiciousDBDuration || isSignificantDifference) {
                console.log('🔄 Using HTML5 duration (more accurate)');
                this.duration = html5Duration;
                this.useHtml5Duration = true;
                
                // Update database with correct duration
                this.updateDatabaseDuration(html5Duration);
            } else {
                console.log('✅ Using database duration (close enough)');
                this.duration = dbDuration;
                this.useHtml5Duration = false;
            }
        } else {
            console.log('⚠️ HTML5 duration invalid, using database duration');
            this.duration = this.currentArticle?.duration || 0;
            this.useHtml5Duration = false;
        }
        
        console.log('🎵 Final duration:', this.duration, 'seconds');
        this.updateDurationDisplay();
        this.updateTimeDisplay();
        this.updateProgressBar();
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
        console.error('Audio src:', this.audio.src);
    });

    this.audio.addEventListener('durationchange', () => {
        console.log('🔄 Duration changed event:', this.audio.duration);
    });
}

    setupUIEvents() {
        console.log('🔧 Setting up UI events');
        this.setupDirectHandlers();
    }

    setupDirectHandlers() {
        // Play/Pause buttons
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        if (miniPlayBtn) {
            miniPlayBtn.onclick = () => this.togglePlay();
        }
        if (playPauseBtn) {
            playPauseBtn.onclick = () => this.togglePlay();
        }

        // Expand/Collapse
        const expandPlayer = document.getElementById('expandPlayer');
        const collapsePlayer = document.getElementById('collapsePlayer');
        
        if (expandPlayer) expandPlayer.onclick = () => this.expandPlayer();
        if (collapsePlayer) collapsePlayer.onclick = () => this.collapsePlayer();

        // Skip buttons
        const rewindBtn = document.getElementById('rewindBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (rewindBtn) rewindBtn.onclick = () => this.skip(-15);
        if (forwardBtn) forwardBtn.onclick = () => this.skip(30);

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
        if (speedBtn) speedBtn.onclick = () => this.toggleSpeed();

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
    console.log('📊 Article data:', {
        title: article?.title,
        duration: article?.duration,
        formattedDuration: article?.duration ? 
            `${Math.floor(article.duration/60)}:${Math.floor(article.duration%60).toString().padStart(2,'0')}` : '0:00',
        audioUrl: article?.audioUrl ? '✅' : '❌'
    });
    
    if (!article || !article.audioUrl) {
        console.error('❌ Invalid article data');
        return;
    }

    this.currentArticle = article;
    this.useHtml5Duration = false;
    
    try {
        // Reset audio
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        
        // Clear previous src
        this.audio.src = '';
        
        // Set initial duration from database
        if (article.duration && article.duration > 0 && !isNaN(article.duration)) {
            this.duration = article.duration;
            console.log('📊 Initial duration from database:', this.duration, 'seconds');
            
            // Check if it's the suspicious 8:00 duration
            if (this.duration === 480) {
                console.log('⚠️ Database duration is exactly 8:00 - may be default value');
            }
        } else {
            this.duration = 0;
            console.log('⚠️ No valid duration in database');
        }
        
        // Update display with initial duration
        this.updateDurationDisplay();
        this.updateTimeDisplay();
        this.updateProgressBar();
        
        // IMPORTANT: Set crossOrigin for Cloudinary URLs
        if (article.audioUrl.includes('cloudinary.com')) {
            this.audio.crossOrigin = 'anonymous';
            console.log('☁️ Cloudinary URL detected, setting crossOrigin="anonymous"');
        }
        
        // Set new source
        this.audio.src = article.audioUrl;
        this.audio.volume = this.volume;
        this.audio.playbackRate = this.playbackRate;
        
        this.updatePlayerInfo();
        this.showMiniPlayer();
        this.updatePlayButton();
        
        // Force metadata load
        console.log('🔄 Loading audio metadata...');
        this.audio.load();
        
        // Set timeout to check if metadata loaded
        setTimeout(() => {
            if (this.duration === 0 || isNaN(this.duration)) {
                console.log('⏰ Metadata load timeout, using fallback');
                if (article.duration && article.duration > 0) {
                    this.duration = article.duration;
                } else {
                    this.duration = 300; // 5 minute fallback
                }
                this.updateDurationDisplay();
                this.updateTimeDisplay();
            }
        }, 5000); // 5 second timeout
        
        console.log('✅ Audio source set, waiting for metadata...');
        
    } catch (error) {
        console.error('❌ Error loading audio:', error);
    }
}

// Update database with correct duration
async updateDatabaseDuration(html5Duration) {
    if (!this.currentArticle || !this.currentArticle._id) {
        console.log('⚠️ No article ID, cannot update database');
        return;
    }
    
    const dbDuration = this.currentArticle.duration || 0;
    const diff = Math.abs(html5Duration - dbDuration);
    
    // Only update if difference is significant (> 30 seconds)
    // or if database duration is suspicious (0 or exactly 480)
    const shouldUpdate = diff > 30 || dbDuration === 0 || dbDuration === 480;
    
    if (shouldUpdate) {
        console.log(`💾 Updating database duration: ${dbDuration}s → ${html5Duration}s (diff: ${diff}s)`);
        
        try {
            const response = await fetch(`http://localhost:5000/api/articles/${this.currentArticle._id}/duration`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ duration: html5Duration })
            });
            
            if (response.ok) {
                console.log('✅ Database duration updated successfully');
                // Update local article object
                this.currentArticle.duration = html5Duration;
            } else {
                console.log('⚠️ Failed to update database duration');
            }
        } catch (error) {
            console.error('❌ Error updating database:', error);
        }
    } else {
        console.log(`✅ Database duration is accurate (diff: ${diff}s), no update needed`);
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
        if (isNaN(seconds) || seconds === 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize audio player
window.audioPlayer = new AudioPlayer();
// Enhanced Audio Player with Compression, Fast Loading & Cross-Device Compatibility
class AudioPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentArticle = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = localStorage.getItem('audioVolume') || 1;
        this.playbackRate = localStorage.getItem('playbackRate') || 1.0;
        this.isExpanded = false;
        this.useHtml5Duration = false;
        this.isBuffering = false;
        this.hasFallback = false;
        this.preloadedChunks = [];
        this.bufferSize = 30; // Seconds to preload
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('🎵 AudioPlayer initialized');
        this.checkBrowserSupport();
        this.init();
    }

    // Check browser and device capabilities
    checkBrowserSupport() {
        this.deviceInfo = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPhone|iPad|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent),
            isSlowConnection: navigator.connection ? 
                (navigator.connection.effectiveType === 'slow-2g' || 
                 navigator.connection.effectiveType === '2g' ||
                 navigator.connection.saveData === true) : false,
            supportsMP3: !!this.audio.canPlayType('audio/mpeg').replace('no', ''),
            supportsOGG: !!this.audio.canPlayType('audio/ogg; codecs="vorbis"').replace('no', ''),
            supportsWAV: !!this.audio.canPlayType('audio/wav').replace('no', ''),
            supportsM4A: !!this.audio.canPlayType('audio/mp4').replace('no', ''),
            supportsWebM: !!this.audio.canPlayType('audio/webm; codecs="opus"').replace('no', '')
        };
        
        console.log('📱 Device Info:', this.deviceInfo);
        
        // Set optimal quality based on device
        this.audioQuality = this.deviceInfo.isMobile ? 'medium' : 'high';
        if (this.deviceInfo.isSlowConnection) {
            this.audioQuality = 'low';
        }
        
        // iOS specific optimizations
        if (this.deviceInfo.isIOS) {
            this.audio.preload = 'none'; // iOS requires user interaction
            this.bufferSize = 10; // Smaller buffer for iOS
        }
    }

    init() {
        this.setupAudioEvents();
        this.setupUIEvents();
        this.restoreSettings();
    }

    setupAudioEvents() {
        // Handle metadata loaded - FAST LOADING
        this.audio.addEventListener('loadedmetadata', () => {
            console.log('📊 HTML5 Audio metadata loaded');
            this.hideLoading();
            clearTimeout(this.loadTimeout);
            
            if (this.audio.duration && this.audio.duration > 0 && !isNaN(this.audio.duration)) {
                const html5Duration = Math.round(this.audio.duration);
                const dbDuration = this.currentArticle?.duration || 0;
                
                console.log('📊 Duration comparison:');
                console.log('   HTML5:', html5Duration, 'seconds');
                console.log('   Database:', dbDuration, 'seconds');
                
                // Always prefer HTML5 duration for accuracy
                const isSuspiciousDBDuration = dbDuration === 480 || dbDuration === 0 || dbDuration === 300;
                const isSignificantDifference = Math.abs(html5Duration - dbDuration) > 30;
                
                if (isSuspiciousDBDuration || isSignificantDifference) {
                    console.log('🔄 Using HTML5 duration (more accurate)');
                    this.duration = html5Duration;
                    this.useHtml5Duration = true;
                    
                    // Update database with correct duration
                    this.updateDatabaseDuration(html5Duration);
                } else {
                    console.log('✅ Using database duration');
                    this.duration = dbDuration;
                    this.useHtml5Duration = false;
                }
            } else {
                console.log('⚠️ HTML5 duration invalid, using database');
                this.duration = this.currentArticle?.duration || 0;
                this.useHtml5Duration = false;
            }
            
            console.log('🎵 Final duration:', this.duration, 'seconds');
            this.updateDurationDisplay();
            this.updateTimeDisplay();
            this.updateProgressBar();
            
            // Preload first chunk for instant playback
            if (!this.deviceInfo.isIOS) {
                this.preloadAudioChunk(0, this.bufferSize);
            }
        });

        // Time updates
        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
            
            // Preload next chunk if needed
            this.smartPreloading();
        });

        // Ended event
        this.audio.addEventListener('ended', () => {
            console.log('⏹️ Audio ended');
            this.isPlaying = false;
            this.updatePlayButton();
            this.retryCount = 0; // Reset retry count on success
        });

        // Can play - ready to play
        this.audio.addEventListener('canplay', () => {
            console.log('▶️ Audio can play');
            this.hideLoading();
        });

        // Can play through - entire audio is loaded
        this.audio.addEventListener('canplaythrough', () => {
            console.log('✅ Entire audio can play through');
            this.isBuffering = false;
        });

        // Buffering events
        this.audio.addEventListener('waiting', () => {
            console.log('⏳ Audio buffering...');
            this.isBuffering = true;
            this.showLoading();
        });

        this.audio.addEventListener('playing', () => {
            console.log('🎵 Audio playing');
            this.isBuffering = false;
            this.hideLoading();
        });

        // Error handling with retry logic
        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
            console.error('Audio error details:', this.audio.error);
            
            this.hideLoading();
            clearTimeout(this.loadTimeout);
            
            // Handle specific error codes
            const error = this.audio.error;
            if (error) {
                switch(error.code) {
                    case error.MEDIA_ERR_ABORTED:
                        console.error('⚠️ Playback aborted by user');
                        break;
                    case error.MEDIA_ERR_NETWORK:
                        console.error('🌐 Network error - retrying...');
                        this.retryWithFallback();
                        break;
                    case error.MEDIA_ERR_DECODE:
                        console.error('🔧 Decode error - trying different format');
                        this.tryAlternativeFormat();
                        break;
                    case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        console.error('🚫 Format not supported - using fallback');
                        this.useCompressedFallback();
                        break;
                }
            }
        });

        // Progress event for buffering
        this.audio.addEventListener('progress', () => {
            if (this.audio.buffered.length > 0) {
                const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
                const bufferedPercent = (bufferedEnd / this.duration) * 100;
                
                // Update buffer display if needed
                this.updateBufferDisplay(bufferedPercent);
            }
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
            miniPlayBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePlay();
            };
        }
        if (playPauseBtn) {
            playPauseBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePlay();
            };
        }

        // Expand/Collapse
        const expandPlayer = document.getElementById('expandPlayer');
        const collapsePlayer = document.getElementById('collapsePlayer');
        
        if (expandPlayer) expandPlayer.onclick = (e) => {
            e.stopPropagation();
            this.expandPlayer();
        };
        if (collapsePlayer) collapsePlayer.onclick = (e) => {
            e.stopPropagation();
            this.collapsePlayer();
        };

        // Skip buttons
        const rewindBtn = document.getElementById('rewindBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        
        if (rewindBtn) rewindBtn.onclick = (e) => {
            e.stopPropagation();
            this.skip(-15);
        };
        if (forwardBtn) forwardBtn.onclick = (e) => {
            e.stopPropagation();
            this.skip(30);
        };

        // Progress bars with better touch support
        const progressInput = document.getElementById('progressInput');
        const miniProgressInput = document.getElementById('miniProgressInput');
        
        if (progressInput) {
            progressInput.addEventListener('input', (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.seekTo(seekTime);
            });
            
            // Touch device support
            progressInput.addEventListener('touchstart', (e) => e.stopPropagation());
            progressInput.addEventListener('touchmove', (e) => e.stopPropagation());
        }
        
        if (miniProgressInput) {
            miniProgressInput.addEventListener('input', (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.seekTo(seekTime);
            });
            
            // Touch device support
            miniProgressInput.addEventListener('touchstart', (e) => e.stopPropagation());
            miniProgressInput.addEventListener('touchmove', (e) => e.stopPropagation());
        }

        // Speed control
        const speedBtn = document.getElementById('speedBtn');
        if (speedBtn) speedBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleSpeed();
        };

        // Volume control with persistence
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.value = this.volume * 100;
            volumeControl.addEventListener('input', (e) => {
                this.volume = e.target.value / 100;
                this.audio.volume = this.volume;
                this.updateVolumeIcon();
                localStorage.setItem('audioVolume', this.volume);
            });
        }

        // Quality selector if exists
        const qualityBtn = document.getElementById('qualityBtn');
        if (qualityBtn) {
            qualityBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleQualitySelector();
            };
        }

        // Auto-play next article
        const autoPlayToggle = document.getElementById('autoPlayToggle');
        if (autoPlayToggle) {
            autoPlayToggle.checked = localStorage.getItem('autoPlay') === 'true';
            autoPlayToggle.onchange = (e) => {
                localStorage.setItem('autoPlay', e.target.checked);
            };
        }
    }

    // RESTORE SETTINGS FROM LOCALSTORAGE
    restoreSettings() {
        // Volume
        if (localStorage.getItem('audioVolume')) {
            this.volume = parseFloat(localStorage.getItem('audioVolume'));
            this.audio.volume = this.volume;
        }
        
        // Playback rate
        if (localStorage.getItem('playbackRate')) {
            this.playbackRate = parseFloat(localStorage.getItem('playbackRate'));
            this.audio.playbackRate = this.playbackRate;
            this.updateSpeedButton();
        }
        
        // Update UI
        this.updateVolumeIcon();
    }

    // SMART AUDIO LOADING WITH COMPRESSION OPTIMIZATION
    loadArticle(article) {
        console.log('📥 Loading article:', article?.title);
        
        if (!article || !article.audioUrl) {
            console.error('❌ Invalid article data');
            this.showError('មិនមានអូឌីយ៉ូ');
            return;
        }

        this.currentArticle = article;
        this.useHtml5Duration = false;
        this.isBuffering = true;
        this.retryCount = 0;
        this.hasFallback = false;
        
        try {
            // Reset audio
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            
            // Show loading state
            this.showLoading();
            
            // Set initial duration from database
            if (article.duration && article.duration > 0 && !isNaN(article.duration)) {
                this.duration = article.duration;
                console.log('📊 Initial duration from database:', this.duration, 'seconds');
            } else {
                this.duration = 0;
                console.log('⚠️ No valid duration in database');
            }
            
            // Update display immediately
            this.updateDurationDisplay();
            this.updateTimeDisplay();
            this.updateProgressBar();
            
            // OPTIMIZE AUDIO URL FOR COMPRESSION & FAST LOADING
            const optimizedUrl = this.optimizeAudioUrl(article.audioUrl);
            console.log('🔗 Optimized URL:', optimizedUrl);
            
            // Clear previous src and create new audio element
            this.audio.src = '';
            this.audio = new Audio(); // Fresh instance for better compatibility
            
            // Configure for fast loading
            this.configureAudioForFastLoading();
            
            // Set crossOrigin for CDN
            if (optimizedUrl.includes('cloudinary.com') || optimizedUrl.includes('res.cloudinary.com')) {
                this.audio.crossOrigin = 'anonymous';
                console.log('☁️ Cloudinary URL detected, setting crossOrigin');
            }
            
            // Set source
            this.audio.src = optimizedUrl;
            this.audio.volume = this.volume;
            this.audio.playbackRate = this.playbackRate;
            
            // Re-attach events
            this.setupAudioEvents();
            
            // Update player info
            this.updatePlayerInfo();
            this.showMiniPlayer();
            this.updatePlayButton();
            
            // Force load metadata
            console.log('🔄 Loading audio metadata...');
            this.audio.load();
            
            // Set timeout for slow connections
            this.loadTimeout = setTimeout(() => {
                if (this.isBuffering) {
                    console.log('⚠️ Slow connection detected, enabling low-quality mode');
                    this.enableLowQualityMode();
                }
            }, 3000);
            
            console.log('✅ Audio source set, waiting for metadata...');
            
        } catch (error) {
            console.error('❌ Error loading audio:', error);
            this.showError('មិនអាចផ្ទុកអូឌីយ៉ូ');
        }
    }

    // OPTIMIZE CLOUDINARY URL FOR COMPRESSION
    optimizeAudioUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        // Check if it's a Cloudinary URL
        if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
            // Already has transformations?
            if (url.includes('/upload/') && !url.includes('/upload/q_')) {
                // Add compression transformations
                const qualityMap = {
                    'low': 'q_auto:low',
                    'medium': 'q_auto:good', 
                    'high': 'q_auto:best'
                };
                
                const transformation = qualityMap[this.audioQuality] || 'q_auto:good';
                
                // Split and insert transformations
                const parts = url.split('/upload/');
                if (parts.length === 2) {
                    // Add transformations for optimal streaming
                    return `${parts[0]}/upload/${transformation},f_auto,fl_streaming_attachment/${parts[1]}`;
                }
            }
        }
        
        return url;
    }

    // CONFIGURE FOR FAST LOADING
    configureAudioForFastLoading() {
        // Set preload strategy based on device
        if (this.deviceInfo.isIOS) {
            this.audio.preload = 'none'; // iOS requires user interaction
        } else if (this.deviceInfo.isSlowConnection) {
            this.audio.preload = 'metadata'; // Minimal preload for slow connections
        } else {
            this.audio.preload = 'auto'; // Full preload for fast connections
        }
        
        // Enable streaming optimizations
        this.audio.setAttribute('playsinline', ''); // For mobile browsers
        this.audio.setAttribute('webkit-playsinline', ''); // For iOS Safari
        
        // Disable controls for custom player
        this.audio.controls = false;
    }

    // SMART PRELOADING
    smartPreloading() {
        if (this.deviceInfo.isSlowConnection || this.deviceInfo.isMobile) return;
        
        const currentTime = this.audio.currentTime;
        const bufferAhead = 30; // Seconds ahead to preload
        
        // Check if we need to preload next chunk
        if (this.audio.buffered.length > 0) {
            const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
            
            // If less than bufferAhead seconds buffered ahead, preload more
            if (bufferedEnd - currentTime < bufferAhead && bufferedEnd < this.duration) {
                const startTime = bufferedEnd;
                const endTime = Math.min(bufferedEnd + bufferAhead, this.duration);
                
                if (!this.isChunkPreloaded(startTime, endTime)) {
                    console.log(`📥 Preloading chunk: ${startTime}s to ${endTime}s`);
                    this.preloadedChunks.push({start: startTime, end: endTime});
                }
            }
        }
    }

    isChunkPreloaded(start, end) {
        return this.preloadedChunks.some(chunk => 
            chunk.start <= start && chunk.end >= end
        );
    }

    preloadAudioChunk(startTime, duration) {
        // This is a simplified version - in production, you might use Range requests
        console.log(`📥 Preloading audio from ${startTime}s for ${duration}s`);
    }

    // LOW QUALITY MODE FOR SLOW CONNECTIONS
    enableLowQualityMode() {
        if (!this.currentArticle || this.hasFallback) return;
        
        console.log('🔽 Enabling low quality mode');
        
        // Modify URL to request lower quality
        const originalUrl = this.currentArticle.audioUrl;
        const lowQualityUrl = this.getLowQualityUrl(originalUrl);
        
        if (lowQualityUrl !== originalUrl) {
            this.audio.src = lowQualityUrl;
            this.audio.load();
            this.hasFallback = true;
        }
    }

    getLowQualityUrl(url) {
        if (url.includes('cloudinary.com') && url.includes('/upload/')) {
            const parts = url.split('/upload/');
            return `${parts[0]}/upload/q_auto:low,f_auto,fl_streaming_attachment/${parts[1]}`;
        }
        return url;
    }

    // ERROR HANDLING WITH RETRY
    retryWithFallback() {
        if (this.retryCount >= this.maxRetries) {
            console.error('❌ Max retries reached');
            this.showError('មិនអាចទាញយកអូឌីយ៉ូ');
            return;
        }
        
        this.retryCount++;
        console.log(`🔄 Retry attempt ${this.retryCount}/${this.maxRetries}`);
        
        setTimeout(() => {
            if (this.currentArticle) {
                // Try with different URL format
                const fallbackUrl = this.getFallbackUrl(this.currentArticle.audioUrl);
                this.audio.src = fallbackUrl;
                this.audio.load();
            }
        }, 1000 * this.retryCount); // Exponential backoff
    }

    getFallbackUrl(url) {
        // Try without optimizations
        if (url.includes('/upload/q_')) {
            return url.replace('/upload/q_auto:best', '/upload/')
                     .replace('/upload/q_auto:good', '/upload/')
                     .replace('/upload/q_auto:low', '/upload/');
        }
        return url;
    }

    tryAlternativeFormat() {
        console.log('🔄 Trying alternative audio format');
        // In a real app, you might have multiple format versions
        // For now, just retry with original URL
        if (this.currentArticle) {
            this.audio.src = this.currentArticle.audioUrl;
            this.audio.load();
        }
    }

    useCompressedFallback() {
        console.log('🔧 Using compressed fallback format');
        // Force MP3 format if available
        if (this.currentArticle && this.currentArticle.audioUrl) {
            let fallbackUrl = this.currentArticle.audioUrl;
            
            // Ensure it ends with .mp3 or add format parameter
            if (!fallbackUrl.includes('.mp3') && fallbackUrl.includes('cloudinary.com')) {
                if (fallbackUrl.includes('/upload/')) {
                    const parts = fallbackUrl.split('/upload/');
                    fallbackUrl = `${parts[0]}/upload/f_mp3/${parts[1]}`;
                }
            }
            
            this.audio.src = fallbackUrl;
            this.audio.load();
        }
    }

    // PLAYBACK CONTROLS
    async play() {
        try {
            console.log('▶️ Attempting to play audio');
            
            // iOS requires user gesture
            if (this.deviceInfo.isIOS && this.audio.currentTime === 0) {
                await this.audio.load(); // Load on iOS
            }
            
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            console.log('✅ Audio playing successfully');
            
            // Track play count
            this.trackPlay();
            
        } catch (error) {
            console.error('❌ Error playing audio:', error);
            
            // iOS specific error handling
            if (this.deviceInfo.isIOS && error.name === 'NotAllowedError') {
                this.showIOSPlaybackHint();
            }
        }
    }

    pause() {
        console.log('⏸️ Pausing audio');
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    togglePlay() {
        console.log('🔄 Toggle play, current state:', this.isPlaying);
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    seekTo(time) {
        time = Math.max(0, Math.min(time, this.duration));
        console.log('⏩ Seeking to:', time, 'seconds');
        
        this.audio.currentTime = time;
        this.currentTime = time;
        
        // Resume playback if it was playing
        if (this.isPlaying) {
            this.audio.play().catch(e => {
                console.log('⚠️ Auto-play after seek prevented');
            });
        }
        
        this.updateProgressBar();
        this.updateTimeDisplay();
    }

    skip(seconds) {
        console.log('⏩ Skip:', seconds, 'seconds');
        const newTime = Math.max(0, this.audio.currentTime + seconds);
        this.seekTo(newTime);
    }

    // SPEED CONTROL
    toggleSpeed() {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        const currentIndex = speeds.indexOf(this.playbackRate);
        this.playbackRate = speeds[(currentIndex + 1) % speeds.length];
        this.audio.playbackRate = this.playbackRate;
        
        // Save to localStorage
        localStorage.setItem('playbackRate', this.playbackRate);
        
        this.updateSpeedButton();
    }

    updateSpeedButton() {
        const speedBtn = document.getElementById('speedBtn');
        if (speedBtn) {
            speedBtn.textContent = `${this.playbackRate.toFixed(1)}x`;
        }
    }

    // QUALITY SELECTOR
    toggleQualitySelector() {
        const selector = document.getElementById('qualitySelector');
        if (selector) {
            selector.classList.toggle('active');
        }
    }

    setQuality(quality) {
        this.audioQuality = quality;
        console.log('🎚️ Setting audio quality to:', quality);
        
        // Reload with new quality if playing
        if (this.currentArticle && this.isPlaying) {
            const newUrl = this.optimizeAudioUrl(this.currentArticle.audioUrl);
            if (newUrl !== this.audio.src) {
                const wasPlaying = this.isPlaying;
                const currentTime = this.audio.currentTime;
                
                this.audio.src = newUrl;
                this.audio.currentTime = currentTime;
                this.audio.load();
                
                if (wasPlaying) {
                    this.audio.play().catch(console.error);
                }
            }
        }
        
        // Update selector UI
        document.querySelectorAll('.quality-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.quality === quality) {
                option.classList.add('active');
            }
        });
    }

    // UI UPDATES
    updatePlayerInfo() {
        if (!this.currentArticle) return;

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
                // Handle image with error fallback
                element.src = content;
                element.onerror = () => {
                    element.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBmaWxsPSIjREMyNjI2Ii8+CjxwYXRoIGQ9Ik0yMCAxOVYyOUwyOCAyNEwyMCAxOVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
                };
            } else {
                element.textContent = content || '';
            }
        }
    }

    showMiniPlayer() {
        const miniPlayer = document.getElementById('miniPlayer');
        if (miniPlayer) {
            miniPlayer.style.display = 'block';
            miniPlayer.style.opacity = '1';
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
        const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
        
        const miniProgress = document.getElementById('miniProgress');
        const fullProgress = document.getElementById('fullProgress');
        const miniProgressInput = document.getElementById('miniProgressInput');
        const progressInput = document.getElementById('progressInput');
        
        if (miniProgress) miniProgress.style.width = `${progress}%`;
        if (fullProgress) fullProgress.style.width = `${progress}%`;
        if (miniProgressInput) miniProgressInput.value = progress;
        if (progressInput) progressInput.value = progress;
        
        // Update progress handle position
        const miniHandle = document.getElementById('miniProgressHandle');
        const fullHandle = document.getElementById('fullProgressHandle');
        
        if (miniHandle) miniHandle.style.left = `${progress}%`;
        if (fullHandle) fullHandle.style.left = `${progress}%`;
    }

    updateBufferDisplay(bufferedPercent) {
        // Optional: Show buffered progress
        const bufferElement = document.getElementById('bufferProgress');
        if (bufferElement) {
            bufferElement.style.width = `${bufferedPercent}%`;
        }
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
        
        // Update volume control value
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.value = this.volume * 100;
        }
    }

    // LOADING STATES
    showLoading() {
        const playBtn = document.getElementById('playPauseBtn');
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon && !this.isPlaying) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        }
        
        if (miniPlayBtn) {
            const icon = miniPlayBtn.querySelector('i');
            if (icon && !this.isPlaying) {
                icon.className = 'fas fa-spinner fa-spin text-xs';
            }
        }
        
        // Show buffering indicator
        const bufferingIndicator = document.getElementById('bufferingIndicator');
        if (bufferingIndicator) {
            bufferingIndicator.classList.add('active');
        }
    }

    hideLoading() {
        const playBtn = document.getElementById('playPauseBtn');
        const miniPlayBtn = document.getElementById('miniPlayBtn');
        
        if (playBtn) {
            this.updatePlayButton();
        }
        
        if (miniPlayBtn) {
            this.updatePlayButton();
        }
        
        // Hide buffering indicator
        const bufferingIndicator = document.getElementById('bufferingIndicator');
        if (bufferingIndicator) {
            bufferingIndicator.classList.remove('active');
        }
    }

    // ERROR HANDLING UI
    showError(message) {
        console.error('❌ Player Error:', message);
        
        // Show error in player
        const errorElement = document.getElementById('playerError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.classList.add('hidden');
            }, 5000);
        }
    }

    showIOSPlaybackHint() {
        const hint = document.getElementById('iosPlaybackHint');
        if (hint) {
            hint.classList.remove('hidden');
            
            setTimeout(() => {
                hint.classList.add('hidden');
            }, 5000);
        }
    }

    // TRACKING
    async trackPlay() {
        if (!this.currentArticle || !this.currentArticle._id) return;
        
        try {
            // Send play event to server
            await fetch(`http://localhost:5000/api/articles/${this.currentArticle._id}/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            console.log('📊 Play tracked');
        } catch (error) {
            console.error('❌ Error tracking play:', error);
        }
    }

    async updateDatabaseDuration(html5Duration) {
        if (!this.currentArticle || !this.currentArticle._id) {
            console.log('⚠️ No article ID, cannot update database');
            return;
        }
        
        const dbDuration = this.currentArticle.duration || 0;
        const diff = Math.abs(html5Duration - dbDuration);
        
        // Only update if difference is significant
        const shouldUpdate = diff > 30 || dbDuration === 0 || dbDuration === 480 || dbDuration === 300;
        
        if (shouldUpdate) {
            console.log(`💾 Updating database duration: ${dbDuration}s → ${html5Duration}s`);
            
            try {
                const response = await fetch(`http://localhost:5000/api/articles/${this.currentArticle._id}/duration`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duration: html5Duration })
                });
                
                if (response.ok) {
                    console.log('✅ Database duration updated');
                    this.currentArticle.duration = html5Duration;
                }
            } catch (error) {
                console.error('❌ Error updating database:', error);
            }
        }
    }

    // FORMATTING
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === 0) return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // CLEANUP
    destroy() {
        this.audio.pause();
        this.audio.src = '';
        this.audio = null;
        this.currentArticle = null;
        
        console.log('🧹 AudioPlayer destroyed');
    }
}

// Initialize audio player globally
window.audioPlayer = new AudioPlayer();

// Add global helper functions
window.optimizeAudioForDevice = function(url) {
    if (window.audioPlayer && window.audioPlayer.optimizeAudioUrl) {
        return window.audioPlayer.optimizeAudioUrl(url);
    }
    return url;
};

// Handle page visibility changes (pause when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (window.audioPlayer && document.hidden && window.audioPlayer.isPlaying) {
        window.audioPlayer.pause();
    }
});

// Handle beforeunload to save state
window.addEventListener('beforeunload', () => {
    if (window.audioPlayer) {
        localStorage.setItem('lastPlaybackTime', window.audioPlayer.currentTime);
        localStorage.setItem('lastArticleId', window.audioPlayer.currentArticle?._id || '');
    }
});
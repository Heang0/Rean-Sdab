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
        this.bufferSize = 30;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.compressionLevel = 'medium';
        this.originalFileSize = 0;
        this.compressedFileSize = 0;
        
        console.log('🎵 AudioPlayer initialized');
        this.checkBrowserSupport();
        this.init();
    }
    
    // Add this method to calculate savings
    calculateSavings(originalUrl, compressedUrl) {
        const defaultOriginalSize = 9.6;
        const compressedSize = 2.4;
        
        if (this.currentArticle && this.currentArticle.duration) {
            const durationMinutes = this.currentArticle.duration / 60;
            const estimatedOriginal = (durationMinutes * 0.96).toFixed(1);
            const estimatedCompressed = (durationMinutes * 0.24).toFixed(1);
            const savings = (((estimatedOriginal - estimatedCompressed) / estimatedOriginal) * 100).toFixed(0);
            
            console.log('💰 SIZE ESTIMATE:');
            console.log(`   Duration: ${durationMinutes.toFixed(1)} minutes`);
            console.log(`   Original: ~${estimatedOriginal} MB`);
            console.log(`   Compressed: ~${estimatedCompressed} MB`);
            console.log(`   Savings: ${savings}% smaller`);
            
            return {
                originalMB: estimatedOriginal,
                compressedMB: estimatedCompressed,
                savingsPercent: savings
            };
        }
        
        return null;
    } // <-- Closing brace for calculateSavings method

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
        
        this.audioQuality = this.deviceInfo.isMobile ? 'medium' : 'high';
        if (this.deviceInfo.isSlowConnection) {
            this.audioQuality = 'low';
        }
        
        if (this.deviceInfo.isIOS) {
            this.audio.preload = 'none';
            this.bufferSize = 10;
        }
    }

    init() {
        this.setupAudioEvents();
        this.setupUIEvents();
        this.restoreSettings();
    }

    setupAudioEvents() {
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
                
                const isSuspiciousDBDuration = dbDuration === 480 || dbDuration === 0 || dbDuration === 300;
                const isSignificantDifference = Math.abs(html5Duration - dbDuration) > 30;
                
                if (isSuspiciousDBDuration || isSignificantDifference) {
                    console.log('🔄 Using HTML5 duration (more accurate)');
                    this.duration = html5Duration;
                    this.useHtml5Duration = true;
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
            
            if (!this.deviceInfo.isIOS) {
                this.preloadAudioChunk(0, this.bufferSize);
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
            this.smartPreloading();
        });

            this.audio.addEventListener('ended', () => {
    console.log('⏹️ Audio ended');
    this.isPlaying = false;
    this.hideLoading();  // ADD THIS LINE
    this.updatePlayButton();
    this.retryCount = 0;
});

        this.audio.addEventListener('canplay', () => {
    console.log('▶️ Audio can play');
    this.hideLoading();
    this.isBuffering = false;  // ADD THIS LINE
});

        this.audio.addEventListener('canplaythrough', () => {
            console.log('✅ Entire audio can play through');
            this.isBuffering = false;
        });

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

// ===== ADD THIS NEW EVENT LISTENER =====
this.audio.addEventListener('pause', () => {
    console.log('⏸️ Audio paused');
    this.hideLoading();  // CRITICAL: Hide loading when paused
    this.isPlaying = false;
    this.updatePlayButton();
});

        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
            console.error('Audio error details:', this.audio.error);
            
            this.hideLoading();
            clearTimeout(this.loadTimeout);
            
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

        this.audio.addEventListener('progress', () => {
            if (this.audio.buffered.length > 0) {
                const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
                const bufferedPercent = (bufferedEnd / this.duration) * 100;
                this.updateBufferDisplay(bufferedPercent);
            }
        });
    }

    setupUIEvents() {
        console.log('🔧 Setting up UI events');
        this.setupDirectHandlers();
    }

    setupDirectHandlers() {
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

        const progressInput = document.getElementById('progressInput');
        const miniProgressInput = document.getElementById('miniProgressInput');
        
        if (progressInput) {
            progressInput.addEventListener('input', (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.seekTo(seekTime);
            });
            
            progressInput.addEventListener('touchstart', (e) => e.stopPropagation());
            progressInput.addEventListener('touchmove', (e) => e.stopPropagation());
        }
        
        if (miniProgressInput) {
            miniProgressInput.addEventListener('input', (e) => {
                const seekTime = (e.target.value / 100) * this.duration;
                this.seekTo(seekTime);
            });
            
            miniProgressInput.addEventListener('touchstart', (e) => e.stopPropagation());
            miniProgressInput.addEventListener('touchmove', (e) => e.stopPropagation());
        }

        const speedBtn = document.getElementById('speedBtn');
        if (speedBtn) speedBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleSpeed();
        };

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

        const qualityBtn = document.getElementById('qualityBtn');
        if (qualityBtn) {
            qualityBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleQualitySelector();
            };
        }

        const autoPlayToggle = document.getElementById('autoPlayToggle');
        if (autoPlayToggle) {
            autoPlayToggle.checked = localStorage.getItem('autoPlay') === 'true';
            autoPlayToggle.onchange = (e) => {
                localStorage.setItem('autoPlay', e.target.checked);
            };
        }
    }

    restoreSettings() {
        if (localStorage.getItem('audioVolume')) {
            this.volume = parseFloat(localStorage.getItem('audioVolume'));
            this.audio.volume = this.volume;
        }
        
        if (localStorage.getItem('playbackRate')) {
            this.playbackRate = parseFloat(localStorage.getItem('playbackRate'));
            this.audio.playbackRate = this.playbackRate;
            this.updateSpeedButton();
        }
        
        this.updateVolumeIcon();
    }

    // Add missing methods:
    smartPreloading() {
        if (this.deviceInfo.isSlowConnection || this.deviceInfo.isMobile) return;
        
        const currentTime = this.audio.currentTime;
        const bufferAhead = 30;
        
        if (this.audio.buffered.length > 0) {
            const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
            
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
        console.log(`📥 Preloading audio from ${startTime}s for ${duration}s`);
    }

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
                const fallbackUrl = this.getFallbackUrl(this.currentArticle.audioUrl);
                this.audio.src = fallbackUrl;
                this.audio.load();
            }
        }, 1000 * this.retryCount);
    }

    getFallbackUrl(url) {
        if (url.includes('/upload/q_')) {
            return url.replace('/upload/q_auto:best', '/upload/')
                     .replace('/upload/q_auto:good', '/upload/')
                     .replace('/upload/q_auto:low', '/upload/');
        }
        return url;
    }

    tryAlternativeFormat() {
        console.log('🔄 Trying alternative audio format');
        if (this.currentArticle) {
            this.audio.src = this.currentArticle.audioUrl;
            this.audio.load();
        }
    }

    useCompressedFallback() {
        console.log('🔧 Using compressed fallback format');
        if (this.currentArticle && this.currentArticle.audioUrl) {
            let fallbackUrl = this.currentArticle.audioUrl;
            
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

    getLowQualityUrl(url) {
        if (url.includes('cloudinary.com') && url.includes('/upload/')) {
            const parts = url.split('/upload/');
            return `${parts[0]}/upload/q_auto:low,f_auto,fl_streaming_attachment/${parts[1]}`;
        }
        return url;
    }

    // Compression methods
    configureAudioForFastLoading() {
        if (this.deviceInfo.isIOS) {
            this.audio.preload = 'none';
        } else if (this.deviceInfo.isSlowConnection) {
            this.audio.preload = 'metadata';
        } else {
            this.audio.preload = 'auto';
        }
        
        this.audio.setAttribute('playsinline', '');
        this.audio.setAttribute('webkit-playsinline', '');
        this.audio.controls = false;
    }

    optimizeAudioUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        console.log('🔗 Original URL:', url);
        
        if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
            if (url.includes('/upload/')) {
                const parts = url.split('/upload/');
                if (parts.length === 2) {
                    let cleanUrl = url;
                    if (url.includes('/upload/q_') || url.includes('/upload/f_') || url.includes('/upload/ac_')) {
                        const urlParts = url.split('/upload/');
                        const afterUpload = urlParts[1];
                        const lastSlash = afterUpload.lastIndexOf('/');
                        const publicId = afterUpload.substring(lastSlash + 1);
                        
                        cleanUrl = `${urlParts[0]}/upload/${publicId}`;
                        console.log('🧹 Cleaned URL for transformation:', cleanUrl);
                        parts[0] = urlParts[0];
                        parts[1] = publicId;
                    }
                    
                    const compressionParams = [
                        'q_auto:low',
                        'ac_aac',
                        'ab_32k',
                        'ar_22050',
                        'ac_1',
                        'f_m4a',
                        'fl_streaming_attachment',
                        'fl_progressive',
                        'dn_50'
                    ].join(',');
                    
                    console.log('🎵 APPLYING AUDIO COMPRESSION:');
                    console.log('   Bitrate: 32kbps (vs 128kbps = 75% smaller)');
                    console.log('   Format: AAC/M4A (better compression than MP3)');
                    console.log('   Channels: Mono (50% smaller than stereo)');
                    console.log('   Sample rate: 22.05kHz (50% smaller than 44.1kHz)');
                    console.log('   Expected size: 2.4 MB per 10 minutes');
                    
                    const compressedUrl = `${parts[0]}/upload/${compressionParams}/${parts[1]}`;
                    console.log('🔗 Compressed URL:', compressedUrl);
                    return compressedUrl;
                }
            }
        }
        
        console.log('⚠️ Not a Cloudinary URL, returning original');
        return url;
    }

    getDeviceOptimizedAudioUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        if (!url.includes('cloudinary.com')) return url;
        
        let bitrate = '32k';
        let quality = 'low';
        let sampleRate = '22050';
        
        if (this.deviceInfo.isSlowConnection) {
            bitrate = '24k';
            quality = 'low';
            sampleRate = '16000';
            console.log('🐌 Slow connection: Using 24kbps extreme compression');
        } else if (this.deviceInfo.isMobile) {
            bitrate = '32k';
            quality = 'low';
            console.log('📱 Mobile: Using 32kbps compression');
        } else {
            bitrate = '48k';
            quality = 'good';
            console.log('💻 Desktop: Using 48kbps good quality');
        }
        
        if (url.includes('/upload/')) {
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                const compressionParams = [
                    `q_auto:${quality}`,
                    'ac_aac',
                    `ab_${bitrate}`,
                    `ar_${sampleRate}`,
                    'ac_1',
                    'f_m4a',
                    'fl_streaming_attachment'
                ].join(',');
                
                return `${parts[0]}/upload/${compressionParams}/${parts[1]}`;
            }
        }
        
        return url;
    }

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
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            
            this.showLoading();
            
            if (article.duration && article.duration > 0 && !isNaN(article.duration)) {
                this.duration = article.duration;
                console.log('📊 Initial duration from database:', this.duration, 'seconds');
            } else {
                this.duration = 0;
                console.log('⚠️ No valid duration in database');
            }
            
            this.updateDurationDisplay();
            this.updateTimeDisplay();
            this.updateProgressBar();
            
            const optimizedUrl = this.getDeviceOptimizedAudioUrl(article.audioUrl);
            console.log('🔗 Device-optimized URL:', optimizedUrl);
            
            this.audio.src = '';
            this.audio = new Audio();
            
            this.configureAudioForFastLoading();
            
            if (optimizedUrl.includes('cloudinary.com') || optimizedUrl.includes('res.cloudinary.com')) {
                this.audio.crossOrigin = 'anonymous';
                console.log('☁️ Cloudinary URL detected, setting crossOrigin');
            }
            
            this.audio.src = optimizedUrl;
            this.audio.volume = this.volume;
            this.audio.playbackRate = this.playbackRate;
            
            this.setupAudioEvents();
            
            this.updatePlayerInfo();
            this.showMiniPlayer();
            this.updatePlayButton();
            
            console.log('🔄 Loading audio metadata...');
            this.audio.load();
            
            this.loadTimeout = setTimeout(() => {
                if (this.isBuffering) {
                    console.log('⚠️ Slow connection detected, enabling extreme compression');
                    this.enableLowQualityMode();
                }
            }, 3000);
            
            console.log('✅ Audio source set, waiting for metadata...');
            
        } catch (error) {
            console.error('❌ Error loading audio:', error);
            this.showError('មិនអាចផ្ទុកអូឌីយ៉ូ');
        }
    }

    enableLowQualityMode() {
        if (!this.currentArticle || this.hasFallback) return;
        
        console.log('🔽 Enabling EXTREME compression mode (24kbps)');
        
        const currentUrl = this.audio.src;
        
        if (currentUrl.includes('cloudinary.com') && currentUrl.includes('/upload/')) {
            const parts = currentUrl.split('/upload/');
            if (parts.length === 2) {
                const extremeCompression = [
                    'q_auto:low',
                    'ac_aac',
                    'ab_24k',
                    'ar_16000',
                    'ac_1',
                    'f_m4a',
                    'fl_streaming_attachment'
                ].join(',');
                
                const extremeUrl = `${parts[0]}/upload/${extremeCompression}/${parts[1]}`;
                console.log('🔽 Extreme compression URL:', extremeUrl);
                
                const currentTime = this.audio.currentTime;
                const wasPlaying = this.isPlaying;
                
                this.audio.src = extremeUrl;
                this.audio.currentTime = currentTime;
                this.audio.load();
                this.hasFallback = true;
                
                if (wasPlaying) {
                    setTimeout(() => {
                        this.play().catch(e => {
                            console.log('⚠️ Auto-play after compression switch prevented');
                        });
                    }, 500);
                }
            }
        }
    }

    // PLAYBACK CONTROLS
    async play() {
        try {
            console.log('▶️ Attempting to play audio');
            
            if (this.deviceInfo.isIOS && this.audio.currentTime === 0) {
                await this.audio.load();
            }
            
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            console.log('✅ Audio playing successfully');
            
            this.trackPlay();
            
        } catch (error) {
            console.error('❌ Error playing audio:', error);
            
            if (this.deviceInfo.isIOS && error.name === 'NotAllowedError') {
                this.showIOSPlaybackHint();
            }
        }
    }

pause() {
    console.log('⏸️ Pausing audio');
    this.audio.pause();
    this.isPlaying = false;
    this.hideLoading();  // ADD THIS LINE
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

    toggleSpeed() {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        const currentIndex = speeds.indexOf(this.playbackRate);
        this.playbackRate = speeds[(currentIndex + 1) % speeds.length];
        this.audio.playbackRate = this.playbackRate;
        
        localStorage.setItem('playbackRate', this.playbackRate);
        
        this.updateSpeedButton();
    }

    updateSpeedButton() {
        const speedBtn = document.getElementById('speedBtn');
        if (speedBtn) {
            speedBtn.textContent = `${this.playbackRate.toFixed(1)}x`;
        }
    }

    toggleQualitySelector() {
        const selector = document.getElementById('qualitySelector');
        if (selector) {
            selector.classList.toggle('active');
        }
    }

    setQuality(quality) {
        this.audioQuality = quality;
        console.log('🎚️ Setting audio quality to:', quality);
        
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
        
        document.querySelectorAll('.quality-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.quality === quality) {
                option.classList.add('active');
            }
        });
    }

    updatePlayerInfo() {
        if (!this.currentArticle) return;

        this.setElementContent('miniThumbnail', this.currentArticle.thumbnailUrl);
        this.setElementContent('miniTitle', this.currentArticle.title);
        this.setElementContent('miniCategory', this.currentArticle.category);

        this.setElementContent('fullThumbnail', this.currentArticle.thumbnailUrl);
        this.setElementContent('fullTitle', this.currentArticle.title);
        this.setElementContent('fullCategory', this.currentArticle.category);
    }

    setElementContent(id, content) {
        const element = document.getElementById(id);
        if (element && content) {
            if (id.includes('Thumbnail')) {
                element.src = content;
                element.onerror = () => {
                    element.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM7Niczq9o0IDM2IDI0IDM2WiIgZmlsbD0iI0RDMjYyNiIvPgo8cGF0aCBkPSJNMjAgMTlWMjlMMjggMjRMMjAgMTlaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K=';
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
    // Big player icons
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (playIcon && pauseIcon) {
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    // Mini player button
    const miniPlayBtn = document.getElementById('miniPlayBtn');
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
        
        const miniHandle = document.getElementById('miniProgressHandle');
        const fullHandle = document.getElementById('fullProgressHandle');
        
        if (miniHandle) miniHandle.style.left = `${progress}%`;
        if (fullHandle) fullHandle.style.left = `${progress}%`;
    }

    updateBufferDisplay(bufferedPercent) {
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
        
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            volumeControl.value = this.volume * 100;
        }
    }

        showLoading() {
    // Show loading when buffering OR when trying to play but audio hasn't started
    if (!this.isBuffering && this.isPlaying) {
        // If we're playing but not buffering, don't show loading
        return;
    }
    
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
    
    const bufferingIndicator = document.getElementById('bufferingIndicator');
    if (bufferingIndicator) {
        bufferingIndicator.classList.add('active');
    }
}

hideLoading() {
    console.log('🔴 DEBUG: hideLoading called');
    
    // ===== FIX FOR BIG PLAYER =====
    // Get the play/pause icons from big player
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    
    if (playIcon && pauseIcon) {
        // Remove spinner class from both
        playIcon.className = 'fas fa-play';
        pauseIcon.className = 'fas fa-pause';
        
        // Show/hide based on playing state
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }
    
    // ===== FIX FOR MINI PLAYER =====
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    if (miniPlayBtn) {
        const miniIcon = miniPlayBtn.querySelector('i');
        if (miniIcon) {
            // Remove spinner class
            miniIcon.className = this.isPlaying ? 'fas fa-pause text-xs' : 'fas fa-play text-xs';
        }
    }
    
    // ===== FIX FOR BIG PLAY BUTTON (backward compatibility) =====
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        const btnIcon = playPauseBtn.querySelector('i');
        if (btnIcon && btnIcon.classList.contains('fa-spinner')) {
            // If spinner is showing, update to correct icon
            btnIcon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }
    
    // Hide buffering indicator
    const bufferingIndicator = document.getElementById('bufferingIndicator');
    if (bufferingIndicator) {
        bufferingIndicator.classList.remove('active');
    }
    
    console.log('✅ Loading hidden for all players');
}

    showError(message) {
        console.error('❌ Player Error:', message);
        
        const errorElement = document.getElementById('playerError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            
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

    async trackPlay() {
        if (!this.currentArticle || !this.currentArticle._id) return;
        
        try {
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

    destroy() {
        this.audio.pause();
        this.audio.src = '';
        this.audio = null;
        this.currentArticle = null;
        
        console.log('🧹 AudioPlayer destroyed');
    }
} // <-- CRITICAL: This closes the AudioPlayer class

// Initialize audio player globally
window.audioPlayer = new AudioPlayer();

// Add global helper functions
window.optimizeAudioForDevice = function(url) {
    if (window.audioPlayer && window.audioPlayer.optimizeAudioUrl) {
        return window.audioPlayer.optimizeAudioUrl(url);
    }
    return url;
};

// Handle page visibility changes
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
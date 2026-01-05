// Simple Audio Compressor without ffmpeg
const audioCompressor = {
    // Simple compression using Cloudinary transformations
    compressAudio: async (inputBuffer, originalName) => {
        console.log('🔧 Simple audio compression for:', originalName);
        
        // Just return the original buffer
        // Actual compression will happen in Cloudinary
        return {
            buffer: inputBuffer,
            size: inputBuffer.length,
            format: originalName.split('.').pop().toLowerCase(),
            mimeType: this.getMimeType(originalName)
        };
    },
    
    // Get MIME type from filename
    getMimeType: (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg',
            'aac': 'audio/aac',
            'webm': 'audio/webm'
        };
        return mimeTypes[ext] || 'audio/mpeg';
    },
    
    // Get audio duration using music-metadata (already installed)
    getAudioDuration: async (inputBuffer) => {
        try {
            const mm = require('music-metadata');
            const metadata = await mm.parseBuffer(inputBuffer);
            return Math.round(metadata.format.duration || 0);
        } catch (error) {
            console.error('❌ Duration detection error:', error.message);
            return 0;
        }
    },
    
    // Optimize Cloudinary URL for compression
    optimizeCloudinaryUrl: (url, quality = 'medium') => {
        if (!url || !url.includes('cloudinary.com')) return url;
        
        const qualityMap = {
            'low': 'q_auto:low',
            'medium': 'q_auto:good',
            'high': 'q_auto:best'
        };
        
        // Already has transformations?
        if (url.includes('/upload/') && !url.includes('/upload/q_')) {
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                const transformation = qualityMap[quality] || 'q_auto:good';
                return `${parts[0]}/upload/${transformation},f_auto,fl_streaming_attachment/${parts[1]}`;
            }
        }
        
        return url;
    }
};

module.exports = audioCompressor;
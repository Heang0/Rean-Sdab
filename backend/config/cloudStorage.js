const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload to Cloudinary with audio optimizations
const uploadToCloudinary = (buffer, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    // Convert buffer to base64
    const b64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${resourceType === 'image' ? 'image/jpeg' : 'audio/mpeg'};base64,${b64}`;
    
    // Add optimizations for audio files
    const options = {
      folder: folder,
      resource_type: resourceType,
      timeout: 60000 // 60 seconds timeout
    };
    
    // Add audio-specific optimizations
    if (resourceType === 'video' || resourceType === 'auto') {
      options.quality = 'auto:good'; // Auto quality for audio
      options.audio_codec = 'mp3'; // Force MP3 for compatibility
      options.audio_bitrate = '128k'; // Good quality bitrate
      options.streaming_profile = 'hd'; // Enable streaming
    }
    
    // For images
    if (resourceType === 'image') {
      options.quality = 'auto:good';
      options.fetch_format = 'auto';
    }
    
    console.log(`☁️ Uploading to Cloudinary: ${folder}/${resourceType}`);
    
    cloudinary.uploader.upload(dataURI, options, (error, result) => {
      if (error) {
        console.error('❌ Cloudinary upload error:', error);
        reject(error);
      } else {
        console.log('✅ Cloudinary upload successful:', result.secure_url);
        
        // Optimize the URL for fast streaming
        if (result.secure_url && result.resource_type === 'video') {
          const optimizedUrl = optimizeAudioUrl(result.secure_url);
          result.secure_url = optimizedUrl;
          console.log('🔗 Optimized audio URL:', optimizedUrl);
        }
        
        resolve(result);
      }
    });
  });
};

// Optimize Cloudinary audio URL for streaming
const optimizeAudioUrl = (url) => {
  if (!url.includes('cloudinary.com')) return url;
  
  // Add streaming optimizations
  if (url.includes('/upload/')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      // Add audio optimizations
      const transformations = 'q_auto:good,f_auto,fl_streaming_attachment,ac_mp3,ab_128k';
      return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    }
  }
  
  return url;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  optimizeAudioUrl
};
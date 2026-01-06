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
    
      // In uploadToCloudinary function, update the audio compression settings:
if (resourceType === 'video' || resourceType === 'auto') {
    // MAX COMPRESSION FOR NEW UPLOADS
    Object.assign(options, {
        quality: 'auto:low',            // Maximum compression
        audio_codec: 'aac',             // AAC format (better compression)
        audio_bitrate: '32k',           // 32kbps (75% smaller than 128k)
        audio_sample_rate: 22050,       // 22.05kHz (speech optimized)
        audio_channels: 1,              // Mono for speech
        format: 'm4a',                  // M4A container with AAC
        streaming_profile: 'hd'
    });
    
    console.log('🎵 NEW AUDIO COMPRESSION SETTINGS:');
    console.log('   32kbps AAC Mono');
    console.log('   ~0.24 MB per 10 minutes');
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

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType,
      invalidate: true
    }, (error, result) => {
      if (error) {
        console.error('❌ Cloudinary delete error:', error);
        reject(error);
      } else {
        console.log('✅ Cloudinary delete successful:', result);
        resolve(result);
      }
    });
  });
};

// Optimize Cloudinary audio URL for streaming
const optimizeAudioUrl = (url) => {
  if (!url.includes('cloudinary.com')) return url;
  
  if (url.includes('/upload/')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transformations = 'q_auto:good,f_auto,fl_streaming_attachment,ac_mp3,ab_128k';
      return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    }
  }
  
  return url;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,  // This was missing!
  optimizeAudioUrl
};
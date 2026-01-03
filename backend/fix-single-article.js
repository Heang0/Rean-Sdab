const mongoose = require('mongoose');
const getAudioDuration = require('get-audio-duration');
require('dotenv').config();

// Your article data from the debug endpoint
const articleData = {
  title: "ប្រវត្តិចក្រវាល​ - RFI ខេមរភាសា / RFI Khmer",
  audioUrl: "https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v...", // You'll need to get this from your database
  _id: "YOUR_ARTICLE_ID" // Get this from your database
};

async function fixArticleDuration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the Article model
    const Article = require('./models/Article');
    
    // Find the article
    const article = await Article.findOne({ title: articleData.title });
    
    if (!article) {
      console.error('❌ Article not found');
      return;
    }
    
    console.log(`📄 Found article: ${article.title}`);
    console.log(`🔗 Audio URL: ${article.audioUrl}`);
    
    if (!article.audioUrl) {
      console.error('❌ Article has no audio URL');
      return;
    }
    
    // Try to get duration
    let newDuration = 0;
    try {
      console.log('⏱️  Attempting to get duration from audio URL...');
      newDuration = await getAudioDuration(article.audioUrl);
      console.log(`✅ Duration retrieved: ${newDuration} seconds`);
    } catch (error) {
      console.error('❌ Error getting duration:', error.message);
      
      // Try alternative method
      try {
        console.log('🔄 Trying alternative method...');
        const axios = require('axios');
        
        // Download a small portion of the file to get headers
        const response = await axios.head(article.audioUrl);
        const contentLength = response.headers['content-length'];
        
        if (contentLength) {
          // Estimate based on file size
          const fileSizeMB = contentLength / (1024 * 1024);
          
          // Average bitrate for audio podcasts: 64-128 kbps
          // 128 kbps = 0.9375 KB per second = 0.0009375 MB per second
          // duration = fileSizeMB / 0.0009375
          const estimatedSeconds = Math.round(fileSizeMB / 0.0009375);
          
          // For speech/podcast, typical duration
          // 1 MB ≈ 1 minute at 128 kbps
          newDuration = Math.round(fileSizeMB * 60);
          
          console.log(`📊 File size: ${fileSizeMB.toFixed(2)} MB`);
          console.log(`📏 Estimated duration: ${newDuration} seconds (${Math.floor(newDuration/60)}:${(newDuration%60).toString().padStart(2,'0')})`);
        }
      } catch (altError) {
        console.error('❌ Alternative method failed:', altError.message);
      }
    }
    
    // Validate and update
    newDuration = Math.round(Number(newDuration));
    if (isNaN(newDuration) || newDuration <= 0) {
      console.log('⚠️ Using fallback duration of 300 seconds (5 minutes)');
      newDuration = 300;
    }
    
    // Update the article
    article.duration = newDuration;
    await article.save();
    
    console.log('\n✅ SUCCESS!');
    console.log(`📝 Article: ${article.title}`);
    console.log(`⏱️  Old duration: ${articleData.duration} seconds (0:00)`);
    console.log(`⏱️  New duration: ${article.duration} seconds (${Math.floor(article.duration/60)}:${(article.duration%60).toString().padStart(2,'0')})`);
    console.log(`📅 Updated at: ${new Date().toISOString()}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the function
fixArticleDuration();
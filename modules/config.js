require('dotenv').config();

module.exports = {
  inputDir: 'input_videos',
  frameSize: 1024,
  maxSheetSize: 4096,
  robloxApiKey: process.env.ROBLOX_API_KEY || null, // Ensure this is set in your .env file if you want to upload to Roblox
  userId: process.env.ROBLOX_USER_ID || null, // Ensure this is set in your .env file if you want to upload to Roblox
  robloxCookie: process.env.ROBLOX_COOKIE || null, // Ensure this is set in your .env file if you want to upload to Roblox
};
const fs = require("fs-extra");
const path = require("path");
const prompt = require("prompt");

const extractFrames = require("./modules/extractFrames");
const createSpriteSheets = require("./modules/createSpriteSheets");
const uploadToRobloxAsset = require("./modules/uploadToRoblox");
const generateLuaFile = require("./modules/generateLuaFile");
const createZip = require("./modules/createZip");
const config = require("./modules/config");

(async () => {
  try {
    const { inputDir, robloxApiKey } = config;

    if (!fs.existsSync(inputDir)) {
      console.error(`Input directory "${inputDir}" does not exist.`);
      return;
    }

    // Get video files from input directory
    const videoFiles = (await fs.readdir(inputDir)).filter((file) =>
      [".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv"].includes(
        path.extname(file).toLowerCase()
      )
    );

    if (videoFiles.length === 0) {
      console.error(`No video files found in "${inputDir}".`);
      return;
    }

    console.log(`Found ${videoFiles.length} video(s) to process.`);

    // Ask the user if they want to upload to Roblox
    const uploadToRoblox = await askUploadToRoblox();

    // Process each video file
    for (const videoFile of videoFiles) {
      await processVideo(videoFile, uploadToRoblox);
    }
  } catch (err) {
    console.error("Error:", err);
  }
})();

async function askUploadToRoblox() {
  prompt.start();
  const { upload } = await prompt.get({
    name: "upload",
    description: "Do you want to upload the sprite sheets to Roblox? (y/n)",
    type: "string",
    pattern: /^[yYnN]$/,
    message: "Please enter y or n",
    default: "n",
    required: true,
  });

  const uploadToRoblox = upload.toLowerCase() === "y";

  if (uploadToRoblox && !config.robloxApiKey) {
    console.error(
      "Roblox API key is not set in the .env file. Please set ROBLOX_API_KEY to upload."
    );
    return false;
  }

  return uploadToRoblox;
}

// Function to process each video
async function processVideo(videoFile, uploadToRoblox) {
  const { inputDir, frameSize, maxSheetSize } = config;
  const inputVideoPath = path.join(inputDir, videoFile);
  console.log(`Processing video: ${inputVideoPath}`);

  if (!fs.existsSync(inputVideoPath)) {
    console.error(`Video file "${inputVideoPath}" does not exist.`);
    return;
  }

  // Directory to save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseOutputDir = `results/${path.basename(
    videoFile,
    path.extname(videoFile)
  )}-${timestamp}`;
  const framesDir = `${baseOutputDir}/frames`;
  const sheetsDir = `${baseOutputDir}/sheets`;
  const zipDir = `${baseOutputDir}/zip`;
  const zipPath = `${zipDir}/sprite-sheets.zip`;
  const luaDir = `${baseOutputDir}/lua`;

  await fs.ensureDir(framesDir);
  await fs.ensureDir(sheetsDir);
  await fs.ensureDir(zipDir);

  if (uploadToRoblox) {
    await fs.ensureDir(luaDir);
  }

  console.log(`Output will be saved to: ${baseOutputDir}`);

  // Extract frames from video
  console.log("Extracting frames...");
  await extractFrames(inputVideoPath, framesDir, frameSize);
  console.log("Frames extracted successfully!");

  // Create sprite sheets from frames
  console.log("Creating sprite sheets...");
  const assetIds = await createSpriteSheets(
    framesDir,
    sheetsDir,
    { frameSize, maxSheetSize },
    uploadToRoblox
      ? (filePath) =>
          uploadToRobloxAsset(
            filePath,
            config.robloxApiKey,
            config.userId.toString(),
            config.robloxCookie
          )
      : null
  );
  console.log("All sprite sheets created successfully!");

  // Create ZIP archive of sprite sheets
  console.log("Creating ZIP archive...");
  await createZip(sheetsDir, zipPath);
  console.log(`ZIP archive created at: ${zipPath}`);

  // Generate Lua file with asset IDs if uploaded to Roblox
  if (uploadToRoblox) {
    console.log("Generating Lua file with asset IDs...");
    await generateLuaFile(assetIds, luaDir);
    console.log(`Lua file created at: ${luaDir}/AssetIds.lua`);
  }

  console.log(`Check your results at: ${baseOutputDir}`);
}

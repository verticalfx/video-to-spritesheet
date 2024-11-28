const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

const inputDir = "input_videos"; // Directory containing videos to process
const frameSize = 1024; // Increase this for higher-quality frames
const maxSheetSize = 4096; // Max canvas size for a sprite sheet (Roblox's max decal size)

(async () => {
  try {
    if (!fs.existsSync(inputDir)) {
      console.error(`Input directory "${inputDir}" does not exist.`);
      return;
    }

    const videoFiles = (await fs.readdir(inputDir)).filter((file) => {
      return [".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv"].includes(
        path.extname(file).toLowerCase()
      );
    });

    if (videoFiles.length === 0) {
      console.error(`No video files found in "${inputDir}".`);
      return;
    }

    console.log(`Found ${videoFiles.length} video(s) to process.`);

    for (const videoFile of videoFiles) {
      await processVideo(videoFile);
    }
  } catch (err) {
    console.error("Error:", err);
  }
})();

async function processVideo(videoFile) {
  const inputVideoPath = path.join(inputDir, videoFile);
  console.log(`Processing video: ${inputVideoPath}`);

  if (!fs.existsSync(inputVideoPath)) {
    console.error(`Video file "${inputVideoPath}" does not exist.`);
    return; 
  }

  // Directory to save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = `results/${path.basename(
    videoFile,
    path.extname(videoFile)
  )}-${timestamp}`;
  const framesDir = `${outputDir}/frames`;
  const sheetsDir = `${outputDir}/sheets`;
  await fs.ensureDir(framesDir);
  await fs.ensureDir(sheetsDir);

  console.log(`Output will be saved to: ${outputDir}`);

  console.log("Extracting frames...");
  await new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .outputOptions(
        "-vf",
        `scale=${frameSize}:${frameSize}`
      )
      .outputOptions("-c:v", "png") // Use PNG encoder
      .outputOptions("-pix_fmt", "rgba") // Preserve alpha channel
      .output(`${framesDir}/frame-%05d.png`)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  console.log("Frames extracted successfully!");

  console.log("Creating sprite sheets...");
  const frameFiles = (await fs.readdir(framesDir)).filter((file) =>
    file.endsWith(".png")
  );
  frameFiles.sort(); // Ensure frames are in order

  let sheetIndex = 0;
  let canvas = createCanvas(maxSheetSize, maxSheetSize);
  let ctx = canvas.getContext("2d");
  let x = 0,
    y = 0;

  const framesPerRow = Math.floor(maxSheetSize / frameSize);
  const framesPerSheet = framesPerRow * framesPerRow;

  for (let i = 0; i < frameFiles.length; i++) {
    const img = await loadImage(`${framesDir}/${frameFiles[i]}`);
    ctx.drawImage(img, x, y, frameSize, frameSize);

    x += frameSize;

    if (x + frameSize > maxSheetSize) {
      x = 0;
      y += frameSize;
    }

    // Check if we filled the current sheet or reached the last frame
    if (
      y + frameSize > maxSheetSize ||
      (i + 1) % framesPerSheet === 0 ||
      i === frameFiles.length - 1
    ) {
      // Save current sheet and start a new one
      const sheetPath = `${sheetsDir}/sprite-sheet-${sheetIndex}.png`;
      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(sheetPath, buffer);
      console.log(`Saved ${sheetPath}`);

      sheetIndex++;
      canvas = createCanvas(maxSheetSize, maxSheetSize);
      ctx = canvas.getContext("2d");
      x = 0;
      y = 0;
    }
  }

  console.log(
    `All sprite sheets created successfully for "${videoFile}"!`
  );
  console.log(`Check your results at: ${outputDir}`);
}

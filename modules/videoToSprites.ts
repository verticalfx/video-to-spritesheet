import { createCanvas, loadImage } from "canvas";
import { ensureDir } from "fs-extra";
// import { createWriteStream, existsSync, readdirSync, writeFileSync } from "fs";
import { createWriteStream, existsSync, readdirSync } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

import type { Canvas } from "canvas";
import type { Sheet } from "./uploadSprites";

ffmpeg.setFfmpegPath(ffmpegPath.path);

interface VideoToSpritesOptions {
  inputDir: string;
  frameSize: number;
  maxSheetSize: number;
  threads: number;
};

interface ExtractFramesOptions {
  inputVideoPath: string;
  framesDir: string;
  frameSize: number;
  threads: number;
};

export type VideoToSpriteAnswers = {
  inputDir: string;
  frameSize: number;
  maxSheetSize: number;
  threads: number;
};

const EXTRACT_FPS = 30;

export async function videoToSprites({ inputDir, frameSize, maxSheetSize, threads }: VideoToSpritesOptions) {
  const Sheets: Array<{
    videoFile: string;
    sheets: Sheet[];
  }> = [];

  try {
    if (!existsSync(inputDir)) {
      console.error(`Input directory "${inputDir}" does not exist.`);
      return;
    }

    const videoFiles = readdirSync(inputDir).filter((file) => {
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
      const VideoSheets = await processVideo({ inputDir, videoFile, frameSize, maxSheetSize, threads });
      if (VideoSheets && VideoSheets.length > 0) {
        Sheets.push({
          videoFile,
          sheets: VideoSheets,
        });
      }
    }

    return Sheets;
  } catch (err) {
    console.error("Error:", err);
  }
}

async function extractFrames({ inputVideoPath, framesDir, frameSize, threads }: ExtractFramesOptions) {
  await new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .outputOptions(
        "-vf",
        `fps=${EXTRACT_FPS},scale=${frameSize}:${frameSize}`
      )
      .outputOptions("-c:v", "png") // Use PNG encoder
      .outputOptions("-pix_fmt", "rgba") // Preserve alpha channel
      .outputOptions("-threads", threads.toString()) // Adjust number of threads as per your CPU cores
      .outputOptions("-compression_level", "5") // Optimize compression speed
      .output(`${framesDir}/frame-%05d.png`)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

function saveCanvasAsStream(canvas: Canvas, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const out = createWriteStream(path);
    const stream = canvas.createPNGStream();

    stream.pipe(out);
    out.on("finish", resolve);
    out.on("error", reject); // Handle potential errors
  });
}

async function generateSpriteSheets({
  frameFiles,
  framesDir,
  sheetsDir,
  maxSheetSize,
  frameSize,
}: {
  frameFiles: string[];
  framesDir: string;
  sheetsDir: string;
  maxSheetSize: number;
  frameSize: number;
}): Promise<Sheet[]> {
  const FramesPerRow = Math.floor(maxSheetSize / frameSize);
  const FramesPerSheet = FramesPerRow * FramesPerRow;

  const PrecomputedPositions = Array.from({ length: FramesPerSheet }, (_, idx) => ({
    x: (idx % FramesPerRow) * frameSize,
    y: Math.floor(idx / FramesPerRow) * frameSize,
  }));

  const Sheets: Sheet[] = [];

  for (let i = 0; i < frameFiles.length; i += FramesPerSheet) {
    const Batch = frameFiles.slice(i, i + FramesPerSheet);
    const CreatedCanvas = createCanvas(maxSheetSize, maxSheetSize);
    const CanvasContext = CreatedCanvas.getContext("2d");

    await Promise.all(
      Batch.map(async (frameFile, idx) => {
        try {
          const LoadedImage = await loadImage(`${framesDir}/${frameFile}`);
          const Position = PrecomputedPositions[idx];
          if (!Position) {
            console.error(`No precomputed position found for index: ${idx}`);
            return;
          }
          CanvasContext.drawImage(LoadedImage, Position.x, Position.y, frameSize, frameSize);
        } catch (error) {
          console.error(`Failed to load image: ${frameFile}`, error);
        }
      })
    );

    const SheetPath = `${sheetsDir}/sprite-sheet-${Sheets.length}.png`;
    await saveCanvasAsStream(CreatedCanvas, SheetPath);
    Sheets.push({
      dir: SheetPath,
      file: path.basename(SheetPath),
    });

    console.log(`Saved ${SheetPath}`);
  }

  return Sheets;
}

async function processVideo({ inputDir, videoFile, frameSize, maxSheetSize, threads }: VideoToSpritesOptions & { videoFile: string }) {
  const inputVideoPath = path.join(inputDir, videoFile);
  console.log(`Processing video: ${inputVideoPath}`);

  if (!existsSync(inputVideoPath)) {
    console.error(`Video file "${inputVideoPath}" does not exist.`);
    return; 
  }

  // Directory to save results
  const Timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const OutputDir = `sprite_results/${path.basename(
    videoFile,
    path.extname(videoFile)
  )}-${Timestamp}`;

  const framesDir = `${OutputDir}/frames`;
  const sheetsDir = `${OutputDir}/sheets`;

  ensureDir(framesDir).catch(console.warn);
  ensureDir(sheetsDir).catch(console.warn);

  console.log(`Output will be saved to: ${OutputDir}`);
  console.log("Extracting frames...");

  await extractFrames({ inputVideoPath, framesDir, frameSize, threads });

  console.log("Frames extracted successfully!");
  console.log("Creating sprite sheets...");

  const frameFiles = readdirSync(framesDir).filter((file) =>
    file.endsWith(".png")
  );
  frameFiles.sort(); // Ensure frames are in order

  const Sheets = await generateSpriteSheets({
    frameFiles,
    framesDir,
    sheetsDir,
    maxSheetSize,
    frameSize,
  });

  console.log(
    `All sprite sheets created successfully for "${videoFile}"!`
  );

  console.log(`Check your results at: ${OutputDir}`);
  return Sheets;
}

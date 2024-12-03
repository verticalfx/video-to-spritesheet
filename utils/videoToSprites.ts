import sharp from "sharp";
import { ensureDir } from "fs-extra";
import { existsSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

import type { Sheet } from "./uploadSprites";

ffmpeg.setFfmpegPath(ffmpegPath.path);

interface VideoToSpritesOptions {
  inputDir: string;
  frameSize: number;
  maxSheetSize: number;
  threads: number;
  frameRate: number;
};

interface ExtractFramesOptions {
  inputVideoPath: string;
  framesDir: string;
  frameSize: number;
  threads: number;
  frameRate: number;
};

export type VideoToSpriteAnswers = {
  inputDir: string;
  frameSize: number;
  maxSheetSize: number;
  threads: number;
  frameRate: number;
};

export async function videoToSprites({ inputDir, frameSize, maxSheetSize, threads, frameRate }: VideoToSpritesOptions) {
  const Sheets: Array<{
    videoFile: string;
    sheets: Sheet[];
  }> = [];

  try {
    if (!existsSync(inputDir)) {
      console.error(`[VideoToSprites] Input directory does not exist: ${inputDir}`);
      return;
    }

    const VideoFiles = readdirSync(inputDir).filter((file) => {
      return [".mp4", ".mov", ".avi", ".mkv", ".flv", ".wmv"].includes(
        path.extname(file).toLowerCase()
      );
    });

    if (VideoFiles.length === 0) {
      console.error(`[VideoToSprites] No video files found in "${inputDir}".`);
      return;
    }

    console.log(`Found ${VideoFiles.length} video(s) to process.`);

    for (const videoFile of VideoFiles) {
      const VideoSheets = await processVideo({ inputDir, videoFile, frameSize, maxSheetSize, threads, frameRate });
      if (VideoSheets && VideoSheets.length > 0) {
        Sheets.push({
          videoFile,
          sheets: VideoSheets,
        });
      };
    };

    return Sheets;
  } catch (err) {
    console.error("[VideoToSprites] Error:", err);
  };
}

async function extractFrames({ inputVideoPath, framesDir, frameSize, threads, frameRate }: ExtractFramesOptions) {
  await new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .outputOptions(
        "-vf",
        `fps=${frameRate},scale=${frameSize}:${frameSize}`
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
    const BlankCanvas = sharp({
      create: {
        width: maxSheetSize,
        height: maxSheetSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });
  
    // Prepare overlay operations
    const OverlayOperations = (
      await Promise.all(
        Batch.map(async (frameFile, idx) => {
          try {
            const LoadedImage = await sharp(`${framesDir}/${frameFile}`).toBuffer();
            const Position = PrecomputedPositions[idx];
            if (!Position) {
              console.error(`No precomputed position found for index: ${idx}`);
              return null;
            }
  
            return {
              input: LoadedImage,
              top: Position.y,
              left: Position.x,
            };
          } catch (error) {
            console.error(`[GenerateSpriteSheets] Failed to load image: ${frameFile}`, error);
            return null;
          }
        })
      )
    ).filter(Boolean) as {
      input: Buffer;
      top: number;
      left: number;
    }[];
  
    // Composite the images onto the blank canvas & save them
    const SpriteSheetBuffer = await BlankCanvas.composite(OverlayOperations).png().toBuffer();
    const SheetPath = `${sheetsDir}/sprite-sheet-${Sheets.length}.png`;
    writeFileSync(SheetPath, SpriteSheetBuffer);
  
    Sheets.push({
      dir: SheetPath,
      file: path.basename(SheetPath),
    });
  
    console.log(`Saved ${SheetPath}`);
  }

  return Sheets;
}

async function processVideo({ inputDir, videoFile, frameSize, maxSheetSize, threads, frameRate }: VideoToSpritesOptions & { videoFile: string }) {
  const InputVideoPath = path.join(inputDir, videoFile);
  console.log(`Processing video: ${InputVideoPath}`);

  if (!existsSync(InputVideoPath)) {
    console.error(`Video file "${InputVideoPath}" does not exist.`);
    return; 
  };

  // Directory to save results
  const Timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const OutputDir = `sprite_results/${path.basename(
    videoFile,
    path.extname(videoFile)
  )}-${Timestamp}`;

  const FramesDir = `${OutputDir}/frames`;
  const SheetsDir = `${OutputDir}/sheets`;

  ensureDir(FramesDir).catch(console.warn);
  ensureDir(SheetsDir).catch(console.warn);

  console.log(`Output will be saved to: ${OutputDir}`);
  console.log("Extracting frames...");

  await extractFrames({ inputVideoPath: InputVideoPath, framesDir: FramesDir, frameSize, threads, frameRate });

  console.log("Frames extracted successfully!");
  console.log("Creating sprite sheets...");

  const FrameFiles = readdirSync(FramesDir).filter((file) =>
    file.endsWith(".png")
  );
  FrameFiles.sort(); // Ensure frames are in order

  const Sheets = await generateSpriteSheets({
    frameFiles: FrameFiles,
    framesDir: FramesDir,
    sheetsDir: SheetsDir,
    maxSheetSize,
    frameSize,
  });

  console.log(`All sprite sheets created successfully for "${videoFile}"!`);
  console.log(`Check your sprite results at: ${OutputDir}`);
  return Sheets;
}
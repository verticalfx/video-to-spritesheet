import os from "os";

import type { DistinctQuestion } from "inquirer";
import type { VideoToSpriteAnswers } from "modules/videoToSprites";

const DEFAULT_FRAME_RATE = 25;
const DEFAULT_THREADS = os.cpus().length;
const DEFAULT_FRAME_SIZE = 1024;
const DEFAULT_MAX_SHEET_SIZE = 4096;
const DEFAULT_INPUT_DIR = "input_videos";

export function getVideoToSpritesQuestions(): DistinctQuestion<VideoToSpriteAnswers>[] {
  return [
    {
      type: "input",
      name: "inputDir",
      message: "Input directory containing videos:",
      default: DEFAULT_INPUT_DIR,
    },
    {
      type: "number",
      name: "frameSize",
      message: "Frame size (in pixels):",
      default: DEFAULT_FRAME_SIZE,
    },
    {
      type: "number",
      name: "maxSheetSize",
      message: "Max sheet size (in pixels):",
      default: DEFAULT_MAX_SHEET_SIZE,
    },
    {
      type: "number",
      name: "frameRate",
      message: "Extraction frame rate (in frames per second):",
      default: DEFAULT_FRAME_RATE,
    },
    {
      type: "number",
      name: "threads",
      message: "Threads (for faster processing):",
      default: DEFAULT_THREADS,
    }
  ];
};
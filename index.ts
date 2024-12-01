import inquirer from "inquirer";
import { uploadSpritesToRoblox } from "modules/uploadSprites";
import { videoToSprites } from "modules/videoToSprites";
import env from "env";
import os from "os";

import type { VideoToSpriteAnswers } from "modules/videoToSprites";
import type { UploadSpritesAnswers } from "modules/uploadSprites";

async function finishedPrompt(answers: VideoToSpriteAnswers) {
  const Sheets = await videoToSprites(answers);
  if (!Sheets || Sheets.length === 0) {
    console.error("No sheets found");
    return;
  }

  // Add choices
  const VideoChoices = Sheets.map((sheet) => sheet.videoFile);
  VideoChoices.unshift("All");
  
  // Now ask if they want to upload to Roblox
  await inquirer.prompt([
    {
      type: "confirm",
      name: "upload",
      message: "Upload to Roblox?",
      default: false,
    },
    {
      type: "list",
      name: "videoToProcess",
      message: "Which video do you want to upload?",
      choices: VideoChoices,
      default: 0,
    },
    {
      type: "list",
      name: "uploadType",
      message: "Do you want to upload from your Roblox Account or a Group?",
      choices: ["Group", "User"],
      default: "User",
      when: (answers) => answers.upload === true && !env.GROUP_ID && !env.USER_ID,
    },
    {
      type: "input",
      name: "id",
      message: "Group ID:",
      when: (answers) => answers.uploadType === "Group" && answers.upload === true && !env.GROUP_ID,
    },
    {
      type: "input",
      name: "id",
      message: "User ID:",
      when: (answers) => answers.uploadType === "User" && answers.upload === true && !env.USER_ID,
    }
  ]).then(async (answers: UploadSpritesAnswers) => {
    if (answers.upload) {
      let UploadType = answers.uploadType;
      let UploadId = answers.id;

      // If we don't have a uploadType or uploadId, then we can decide it based on the enviornment variables
      if (!UploadType) {
        if (!env.GROUP_ID && env.USER_ID) {
          UploadType = "User";
          UploadId = env.USER_ID;
        }
        if (!env.USER_ID && env.GROUP_ID) {
          UploadType = "Group";
          UploadId = env.GROUP_ID;
        }
      }

      // Now upload the sprites
      if (answers.videoToProcess === "All") {
        for (const sheet of Sheets) {
          await uploadSpritesToRoblox({
            id: UploadId,
            sheets: sheet.sheets.map(sheet => ({
              dir: sheet.dir,
              file: sheet.file,
            })),
            video: sheet.videoFile,
            uploadType: UploadType,
          });
        }
      } else {
        await uploadSpritesToRoblox({
          id: UploadId,
          sheets: Sheets.find(sheet => sheet.videoFile === answers.videoToProcess)?.sheets || [],
          video: answers.videoToProcess,
          uploadType: UploadType,
        });
      }
    }
  });
}

(async () => {
  await inquirer.prompt([
    {
      type: "input",
      name: "inputDir",
      message: "Input directory containing videos:",
      default: "input_videos",
    },
    {
      type: "number",
      name: "frameSize",
      message: "Frame size (in pixels):",
      default: 1024,
    },
    {
      type: "number",
      name: "maxSheetSize",
      message: "Max sheet size (in pixels):",
      default: 4096,
    },
    {
      type: "number",
      name: "threads",
      message: "Threads (for faster processing):",
      default: os.cpus().length,
    }
  ]).then(finishedPrompt);
})().catch(console.warn);
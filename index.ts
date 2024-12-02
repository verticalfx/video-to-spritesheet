import inquirer from "inquirer";
import env from "env";
import { uploadSpritesToRoblox } from "modules/uploadSprites";
import { videoToSprites } from "modules/videoToSprites";
import { getUploadSpritesQuestions } from "questions/uploadSpritesQuestions";
import { getVideoToSpritesQuestions } from "questions/videoToSpritesQuestions";

import type { VideoToSpriteAnswers } from "modules/videoToSprites";
import type { UploadSpritesAnswers } from "modules/uploadSprites";

async function finishedSpritePrompt(answers: VideoToSpriteAnswers) {
  const Sheets = await videoToSprites(answers);
  if (!Sheets || Sheets.length === 0) {
    console.error("No sheets found");
    return;
  };

  // Add choices
  const VideoChoices = Sheets.map((sheet) => sheet.videoFile);
  VideoChoices.unshift("All");

  // Now ask if they want to upload to Roblox
  await inquirer.prompt<UploadSpritesAnswers>(getUploadSpritesQuestions(VideoChoices)).then(async (answers) => {
    if (answers.upload) {
      let UploadType = answers.uploadType;
      let UploadId = answers.id;

      // If we don't have a uploadType or uploadId, then we can decide it based on the enviornment variables
      if (!UploadType) {
        if (!env.GROUP_ID && env.USER_ID) {
          UploadType = "User";
          UploadId = env.USER_ID;
        };
        if (!env.USER_ID && env.GROUP_ID) {
          UploadType = "Group";
          UploadId = env.GROUP_ID;
        };
      };

      // Now upload the sprites
      const SheetsToUpload = (answers.videoToProcess === "All" || answers.videoToProcess === undefined)
        ? Sheets.map(sheet => ({
          id: UploadId,
          sheets: sheet.sheets.map(sheet => ({
            dir: sheet.dir,
            file: sheet.file,
          })),
          video: sheet.videoFile,
          uploadType: UploadType,
        }))
        : [{
          id: UploadId,
          sheets: Sheets.find(sheet => sheet.videoFile === answers.videoToProcess)?.sheets || [],
          video: answers.videoToProcess,
          uploadType: UploadType,
        }];

      for (const sheet of SheetsToUpload) {
        await uploadSpritesToRoblox(sheet);
      };
    };
  });
}

(async () => await inquirer.prompt(getVideoToSpritesQuestions()).then(finishedSpritePrompt).catch(console.warn))().catch(console.warn);
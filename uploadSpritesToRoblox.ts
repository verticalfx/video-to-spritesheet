import env from "env";
import { readdirSync } from "fs";
import inquirer from "inquirer";
import path from "path";
import { uploadSpritesToRoblox } from "modules/uploadSprites";
import { getUploadSpritesToRobloxQuestions } from "questions/uploadSpritesToRobloxQuestions";

export type UploadToRobloxAnswers = {
  uploadType: "Group" | "User";
  id: string;
  inputSheetsDir: string;
};

async function finishedUploadPrompt(answers: UploadToRobloxAnswers) {
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

  const Sheets = readdirSync(answers.inputSheetsDir);
  if (Sheets.length === 0) {
    console.error("No sheets found");
    return;
  };

  await uploadSpritesToRoblox({
    id: UploadId,
    uploadType: UploadType,
    sheets: Sheets.map((file) => {
      return {
        dir: `${answers.inputSheetsDir}/${file}`,
        file: path.basename(file),
      };
    }),
  });
}

(async () => await inquirer.prompt<UploadToRobloxAnswers>(getUploadSpritesToRobloxQuestions()).then(finishedUploadPrompt))().catch(console.warn);
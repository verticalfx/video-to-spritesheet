import env from "env";

import type { DistinctQuestion } from "inquirer";

export type UploadToRobloxAnswers = {
  uploadType: "Group" | "User";
  id: string;
  inputSheetsDir: string;
};

export function getUploadSpritesToRobloxQuestions(): DistinctQuestion<UploadToRobloxAnswers>[] {
  return [
    {
      type: "input",
      name: "inputSheetsDir",
      message: "Input directory containing sheets:",
      default: "input_sheets",
    },
    {
      type: "input",
      name: "uploadType",
      message: "Do you want to upload from your Roblox Account or a Group?",
      choices: ["Group", "User"],
      default: "User",
      when: () => !env.GROUP_ID && !env.USER_ID,
    },
    {
      type: "input",
      name: "id",
      message: "Group ID:",
      when: (answers) => answers.uploadType === "Group" && !env.GROUP_ID,
    },
    {
      type: "input",
      name: "id",
      message: "User ID:",
      when: (answers) => answers.uploadType === "User" && !env.USER_ID,
    }
  ];
};
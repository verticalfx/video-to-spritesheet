import Axios from "axios";
import env from "env";
import { XMLParser } from "fast-xml-parser";
import FormData from "form-data";
import { createWriteStream, readFileSync } from "fs";
import { ensureDir } from "fs-extra";

const UPLOADED_SPRITES_DIR = "./uploaded_sprites";

const OPERATION_URL = (path: string) => `https://apis.roblox.com/assets/v1/${path}`;
const GET_IMAGE_URL = (id: string) => `https://assetdelivery.roblox.com/v1/asset/?id=${id}`;
const UPLOAD_URL = "https://apis.roblox.com/assets/v1/assets";

const parser = new XMLParser();

interface Asset {
  sheet: string;
  assetId: string;
};

interface OperationResponse {
  done: boolean;
  response?: {
    assetId: string;
  };
};

interface UploadSpritesToRobloxOptions {
  sheets: Sheet[];
  uploadType: "Group" | "User";
  video?: string;
  id: string;
};

interface UploadAssetOptions {
  sheet: Sheet;
  uploadType: "Group" | "User";
  id: string;
};

type UploadResponse = {
  path: string;
};

type RobloxImageXML = {
  roblox: {
    Item: {
      Properties: {
        Content: { url: string };
      };
    };
  };
};

export type UploadSpritesAnswers = {
  upload: boolean;
  uploadType: "Group" | "User";
  videoToProcess: string;
  id: string;
};

export type Sheet = {
  dir: string;
  file: string;
};

function extractRobloxImageUrl(xml: string): string | null {
  const JSONObject = parser.parse(xml) as RobloxImageXML;

  try {
    return JSONObject.roblox.Item.Properties.Content.url;
  } catch {
    return null;
  }
}

async function getOperation(operationPath: string): Promise<OperationResponse> {
  try {
    const OperationResponse = await Axios.get<OperationResponse>(OPERATION_URL(operationPath), {
      headers: {
        "x-api-key": env.API_KEY,
      },
    });
    return OperationResponse.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function uploadAsset({ sheet, uploadType, id }: UploadAssetOptions): Promise<string> {
  const BodyFormData = new FormData();
  BodyFormData.append(
    "request",
    JSON.stringify({
      assetType: "Decal",
      creationContext: {
        creator: {
          [uploadType === "Group" ? "groupId" : "userId"]: id,
        },
      },
      description: sheet.file,
      displayName: sheet.file,
    })
  );

  BodyFormData.append(
    "fileContent",
    readFileSync(sheet.dir),
    sheet.file
  );

  try {
    const UploadResponse = await Axios.post<UploadResponse>(
      UPLOAD_URL,
      BodyFormData,
      {
        headers: {
          "x-api-key": env.API_KEY,
          ...BodyFormData.getHeaders(),
        },
      }
    );

    return UploadResponse.data.path;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function uploadSpritesToRoblox({ sheets, uploadType, video, id }: UploadSpritesToRobloxOptions) {
  const Assets: Array<Asset> = [];

  if (sheets.length === 0) {
    console.error(`No sheets found`);
    return;
  }

  console.log(`Uploading sprites for video: ${video}`);

  for (const sheet of sheets) {
    console.log(`Uploading asset for sheet: ${sheet.file}`);

    try {
      const OperationPath = await uploadAsset({ sheet, uploadType, id });
      console.log(`Operation path received (uploaded): ${OperationPath}`);

      let OperationResult: OperationResponse;
      do {
        console.log(`Polling operation: ${OperationPath}`);
        OperationResult = await getOperation(OperationPath);

        if (!OperationResult.done) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } while (!OperationResult.done);

      if (OperationResult.response && OperationResult.response.assetId) {
        Assets.push({
          sheet: sheet.file,
          assetId: OperationResult.response.assetId,
        });

        console.log(`Asset fetched successfully: ${OperationResult.response.assetId}`);
      } else {
        console.error("Operation completed but no assetId found.");
      }
    } catch (err) {
      console.error(`Failed to upload or retrieve asset for sheet: ${sheet.dir}, Error: ${err as string}`);
    }
  }

  // Sort by the numbers in their name (lowest to highest)
  Assets.sort((a, b) => {
    const a_Match = a.sheet.match(/\d+/g);
    const b_Match = b.sheet.match(/\d+/g);
    if (a_Match && b_Match) {
      return parseInt(a_Match[0]) - parseInt(b_Match[0]);
    }

    return 0;
  });

  // Get images from the decal ids
  for (let i = 0; i < Assets.length; i++) {
    if (Assets[i] === undefined) continue;

    const Asset = Assets[i] as Asset;
    const ImageResponse = await Axios.get<string>(GET_IMAGE_URL(Asset.assetId));
    const ImageFromDecal = extractRobloxImageUrl(ImageResponse.data);
  
    if (ImageFromDecal) {
      Assets[i]!.assetId = ImageFromDecal;
    }
  }
  
  // Ensure the directory exists
  ensureDir(UPLOADED_SPRITES_DIR).catch(console.warn);

  // Now write the Luau file
  const Timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const OutputDir = `${UPLOADED_SPRITES_DIR}/${video ? video : "sprite_sheet"}-${Timestamp}.luau`;

  const LuauFile = createWriteStream(OutputDir);
  LuauFile.write(`return {\n`);

  for (let i = 0; i < Assets.length; i++) {
    LuauFile.write(`\t[${i + 1}] = "${Assets[i]?.assetId}"${i === Assets.length - 1 ? `` : `,`}\n`);
  }

  LuauFile.write(`}`);
  LuauFile.end();

  console.log(`Uploaded spritesheet to Roblox: ${OutputDir}`);
}
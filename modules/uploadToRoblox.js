const axios = require('axios');
const fs = require('fs-extra');
const FormData = require('form-data');
const path = require('path');

async function uploadToRobloxAsset(filePath, robloxApiKey, userId, cookie) {
  const form = new FormData();

  const requestPayload = {
    assetType: 'Decal', 
    displayName: path.basename(filePath, path.extname(filePath)),
    description: 'Uploaded via Open Cloud Assets API',
    creationContext: {
      creator: {
        userId: userId.toString(), 
      },
    },
  };

  form.append('request', JSON.stringify(requestPayload));

  const contentType = 'image/png'; // Adjust if necessary

  form.append('fileContent', fs.createReadStream(filePath), {
    contentType: contentType,
    filename: path.basename(filePath),
  });

  try {
    const response = await axios.post(
      'https://apis.roblox.com/assets/v1/assets',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-api-key': robloxApiKey,
          '.ROBLOSECURITY': cookie,
        },
      }
    );

    const operationPath = response.data.path;
    const operationId = operationPath.split('/').pop();

    // Poll the operation status to get the assetId - roblox takes a while to process the asset
    let assetId = null;
    let done = false;
    while (!done) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between polls

      const operationResponse = await axios.get(
        `https://apis.roblox.com/assets/v1/operations/${operationId}`,
        {
          headers: {
            'x-api-key': robloxApiKey,
          },
        }
      );

      if (operationResponse.data.done) {
        done = true;
        if (operationResponse.data.response?.assetId) {
          assetId = operationResponse.data.response.assetId;
        } else if (operationResponse.data.error) {
          throw new Error(`Upload failed: ${operationResponse.data.error.message}`);
        }
      }
    }

    return assetId;
  } catch (error) {
    console.error(
      'Error uploading to Roblox:',
      error.response?.data || error.message
    );
    return null;
  }
}

module.exports = uploadToRobloxAsset;

const fs = require('fs-extra');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function createSpriteSheets(framesDir, sheetsDir, config, uploadCallback) {
  const { frameSize, maxSheetSize } = config;
  const frameFiles = (await fs.readdir(framesDir)).filter((file) =>
    file.endsWith('.png')
  );
  frameFiles.sort(); // Ensure frames are in order

  let sheetIndex = 0;
  let canvas = createCanvas(maxSheetSize, maxSheetSize);
  let ctx = canvas.getContext('2d');
  let x = 0,
    y = 0;

  const framesPerRow = Math.floor(maxSheetSize / frameSize);
  const framesPerSheet = framesPerRow * framesPerRow;

  const assetIds = [];

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
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(sheetPath, buffer);
      console.log(`Saved ${sheetPath}`);

      // Upload to Roblox if callback is provided
      if (uploadCallback) {
        console.log(`Uploading ${sheetPath} to Roblox...`);
        const assetId = await uploadCallback(sheetPath);
        if (assetId) {
          assetIds.push(assetId);
          console.log(`Uploaded to Roblox with Asset ID: ${assetId}`);
        } else {
          console.error(`Failed to upload ${sheetPath} to Roblox.`);
        }
      }

      sheetIndex++;
      canvas = createCanvas(maxSheetSize, maxSheetSize);
      ctx = canvas.getContext('2d');
      x = 0;
      y = 0;
    }
  }

  return assetIds;
}

module.exports = createSpriteSheets;

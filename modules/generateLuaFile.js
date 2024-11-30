const fs = require('fs-extra');
const path = require('path');

async function generateLuaFile(assetIds, luaDir) {
  const luaFilePath = `${luaDir}/AssetIds.lua`;
  const luaContent = `local AssetIds = {\n${assetIds
    .map((id) => `  "rbxassetid://${id}",`)
    .join('\n')}\n}\n\nreturn AssetIds`;
  await fs.writeFile(luaFilePath, luaContent);
}

module.exports = generateLuaFile;

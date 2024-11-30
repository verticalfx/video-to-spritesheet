const ffmpeg = require('fluent-ffmpeg');

async function extractFrames(inputVideoPath, framesDir, frameSize) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideoPath)
      .outputOptions('-vf', `scale=${frameSize}:${frameSize}`)
      .outputOptions('-c:v', 'png') // Use PNG encoder
      .outputOptions('-pix_fmt', 'rgba') // Preserve alpha channel
      .output(`${framesDir}/frame-%05d.png`)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

module.exports = extractFrames;

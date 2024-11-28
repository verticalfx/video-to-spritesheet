ok so i made this basic project which takes a video and creates a spritesheet from it

reason i made this:
roblox has an incredibly shitty way of not allowing alpha channel support so working around with sprite sheets is the only way to go

# install
you need:
- node (v20 or lower - v22 is not supported for canvas, just use v20)
- ffmpeg installed and added in your system path
- and the following packages:

```
npm install fluent-ffmpeg fs-extra canvas
```

# setup
clone this repo to your local machine and do npm install to install the dependencies

once you're in the repo, place your files into the input folder called "input_videos". supported video formats include:
```
.mp4
.mov
.avi
.mkv
.flv
.wmv
```

feel free to adjust Settings - completely optional:
- open the index.js file and modify the following variables if needed:
- frameSize: The size of each frame in pixels. Increase this for higher-quality frames (default is 1024).
- maxSheetSize: The maximum size of the sprite sheet canvas (default is 4096).

and then to run the script:
```
node index.js
```

# output
- the script will process each video in the input folder and create a spritesheet for each one
- for each video, it extracts the frames and saves them in the results directory with a timestamped subfolder
- frames are combined into sprite sheets saved in the sheets subdirectory within each video's results folder

# special notes
- the script will not overwrite existing spritesheets
- the script supports alpha channel (transparency) - it will preserve the alpha channel if your input video has it supported 

# issues
if you find any issues, please open an issue & i'll try to fix it asap

Feel free to use and modify this project as you like.


ok so i made this basic project which takes a video and creates a spritesheet from it

reason i made this:
roblox has an incredibly shitty way of not allowing alpha channel support so working around with sprite sheets is the only way to go

# install
you need:
- node (v20 or lower - v22 is not supported for canvas, just use v20)
- ffmpeg installed and added in your system path
- and the following packages:

```bash
npm install axios archiver canvas dotenv fluent-ffmpeg form-data fs-extra prompt
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

feel free to adjust Settings - completely optional
go to modules/config.js file and modify the following variables if needed:
- frameSize: The size of each frame in pixels. Increase this for higher-quality frames (default is 1024).
- maxSheetSize: The maximum size of the sprite sheet canvas (default is 4096).

and then to run the script:

```bash
node index.js
```

# upload to roblox (optional)

go to https://create.roblox.com/dashboard/credentials and create an API key
- make sure you set assets to have asset:read and asset:write permissions
- for the ip address, set your own ip - do not do 0.0.0.0 it has a few issues
- generate the api key and copy it

copy the .env.example file to .env and fill in the required fields

```
ROBLOX_API_KEY=YOUR_OPENAPI_KEY
ROBLOX_USER_ID=YOUR_ROBLOX_USER_ID
ROBLOX_COOKIE=YOUR_ROBLOX_COOKIE - idk why i put this but just in case since i kept struggling lmao
```

then run the script again - node index.js and it should ask a prompt if you would like to upload the spritesheets to roblox

answer y or n and it will upload the spritesheets to roblox

it will process all the spritesheets and upload them to roblox & create a lua file with the asset ids of the spritesheets so you don't have to do it manually :)

# output
- the script will process each video in the input folder and create a spritesheet for each one
- for each video, it extracts the frames and saves them in the results directory with a timestamped subfolder
- frames are combined into sprite sheets saved in the sheets subdirectory within each video's results folder

# special notes
- the script will not overwrite existing spritesheets
- the script supports alpha channel (transparency) - it will preserve the alpha channel if your input video has it supported 
- it will automatically create a zip file with all the spritesheets in the zip subdirectory of each video's results folder
- now possible to upload to roblox

# issues
if you find any issues, please open an issue & i'll try to fix it asap

Feel free to use and modify this project as you like.


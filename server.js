const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());

ffmpeg.setFfmpegPath(ffmpegStatic);

const IMAGE_FORMATS = ["jpeg", "png", "webp", "avif", "ico"];
const VIDEO_FORMATS = ["mp4", "mov", "webm", "gif"];

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

if (!fs.existsSync("output")) {
  fs.mkdirSync("output");
}

const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
};

const sendAndCleanup = (res, inputPath, outputPath) => {
  res.download(outputPath, () => {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  });
};


// video conversion
const VIDEO_FORMAT_CONFIG = {
  gif: {
    format: "gif",
    options: ["-vf fps=10,scale=480:-1"],
    audio: false,
  },
  webm: {
    format: "webm",
    options: ["-c:v libvpx-vp9", "-crf 30", "-b:v 0"],
    audio: false,
  },
  mp4: {
    format: "mp4",
    options: ["-c:v libx264", "-preset veryfast"],
    audio: true,
  },
  mov: {
    format: "mov",
    options: ["-c:v libx264", "-preset veryfast"],
    audio: true,
  },
};

app.post("/convert-video", upload.single("file"), (req, res) => {
  const inputPath = req.file.path;
  const { format = "mp4" } = req.body;

  const config = VIDEO_FORMAT_CONFIG[format];
  if (!config) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported video format");
  }

  const outputPath = `output/${Date.now()}.${format}`;

  let command = ffmpeg(inputPath).outputOptions(config.options);

  if (!config.audio) {
    command = command.noAudio();
  }

  command
    .toFormat(config.format)
    .on("end", () => sendAndCleanup(res, inputPath, outputPath))
    .on("error", (err) => {
      console.error("Video conversion error:", err.message);
      safeUnlink(inputPath);
      res.status(500).send("Video conversion failed");
    })
    .save(outputPath);
});


// image conversion
app.post("/convert-image", upload.single("file"), async (req, res) => {
  const inputPath = req.file.path;
  const { format = "jpeg" } = req.body;

  if (!IMAGE_FORMATS.includes(format)) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported image format");
  }

  const outputPath = `output/${Date.now()}.${format}`;

  try {
    let image = sharp(inputPath);
    image = image[format]();
    await image.toFile(outputPath);

    sendAndCleanup(res, inputPath, outputPath);
  } catch (err) {
    console.error("Image conversion error:", err);
    safeUnlink(inputPath);
    res.status(500).send("Image conversion failed");
  }
});


// image compression
app.post("/compress-image", upload.single("file"), async (req, res) => {
  const inputPath = req.file.path;
  const { format = "jpeg", quality = 70 } = req.body;

  if (!IMAGE_FORMATS.includes(format)) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported image format");
  }

  const outputPath = `output/${Date.now()}.${format}`;

  try {
    let image = sharp(inputPath);

    if (format === "jpeg") image = image.jpeg({ quality });
    else if (format === "png") image = image.png({ quality });
    else image = image[format]();

    await image.toFile(outputPath);
    sendAndCleanup(res, inputPath, outputPath);
  } catch (err) {
    console.error("Image compression error:", err);
    safeUnlink(inputPath);
    res.status(500).send("Image compression failed");
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Formatix backend running on http://localhost:${PORT}`);
});

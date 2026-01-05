const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const sharp = require("sharp");
const fs = require("fs");

const app = express();
app.use(cors());

ffmpeg.setFfmpegPath(ffmpegStatic);

// config

const IMAGE_FORMATS = ["jpeg", "png", "webp", "avif", "ico"];
const VIDEO_FORMATS = ["mp4", "mov", "gif"];

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 40 * 1024 * 1024 },
});

if (!fs.existsSync("output")) fs.mkdirSync("output");

// helpers

const safeUnlink = (file) => {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch { }
};

const sendAndCleanup = (res, input, output) => {
  res.download(output, () => {
    safeUnlink(input);
    safeUnlink(output);
  });
};

// video-coverts

const VIDEO_CONVERT = {
  mp4: {
    format: "mp4",
    options: ["-c:v libx264", "-preset ultrafast", "-movflags +faststart"],
    audio: true,
  },
  mov: {
    format: "mov",
    options: ["-c:v libx264", "-preset ultrafast"],
    audio: true,
  },
  gif: {
    format: "gif",
    options: ["-vf fps=6,scale=320:-1"],
    audio: false,
  },
};

app.post("/convert-video", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const inputPath = req.file.path;
  const { format = "mp4" } = req.body;

  const config = VIDEO_CONVERT[format];
  if (!config) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported video format");
  }

  const outputPath = `output/${ Date.now() }.${ format }`;

  let cmd = ffmpeg(inputPath).outputOptions(config.options);

  if (!config.audio) cmd = cmd.noAudio();

  cmd
    .on("start", (c) => console.log("FFmpeg:", c))
    .toFormat(config.format)
    .on("end", () => sendAndCleanup(res, inputPath, outputPath))
    .on("error", (err) => {
      console.error("Video convert error:", err.message);
      safeUnlink(inputPath);
      safeUnlink(outputPath);
      res.status(500).send("Video conversion failed");
    })
    .save(outputPath);
});

// video-compress

app.post("/compress-video", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const inputPath = req.file.path;
  const { quality = "medium" } = req.body;

  const PRESETS = {
    high: "-crf 23",
    medium: "-crf 28",
    low: "-crf 33",
  };

  const outputPath = `output/${ Date.now() }.mp4`;

  ffmpeg(inputPath)
    .outputOptions([
      "-c:v libx264",
      "-preset ultrafast",
      "-vf scale=1280:-2",
      "-movflags +faststart",
      PRESETS[quality] || PRESETS.medium,
    ])
    .audioCodec("aac")
    .toFormat("mp4")
    .on("end", () => sendAndCleanup(res, inputPath, outputPath))
    .on("error", (err) => {
      console.error("Video compress error:", err.message);
      safeUnlink(inputPath);
      safeUnlink(outputPath);
      res.status(500).send("Video compression failed");
    })
    .save(outputPath);
});

// image-convert

app.post("/convert-image", upload.single("file"), async (req, res) => {
  const inputPath = req.file.path;
  const { format = "jpeg" } = req.body;

  if (!IMAGE_FORMATS.includes(format)) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported image format");
  }

  const outputPath = `output/${ Date.now() }.${ format }`;

  try {
    await sharp(inputPath)[format]().toFile(outputPath);
    sendAndCleanup(res, inputPath, outputPath);
  } catch (err) {
    console.error("Image convert error:", err.message);
    safeUnlink(inputPath);
    res.status(500).send("Image conversion failed");
  }
});

// image-compress

app.post("/compress-image", upload.single("file"), async (req, res) => {
  const inputPath = req.file.path;
  const { format = "jpeg", quality = "medium" } = req.body;

  const quality_map = {
    high: 90,
    medium: 70,
    low: 50
  }

  const qualityValue = quality_map[quality] || 70;

  if (!IMAGE_FORMATS.includes(format)) {
    safeUnlink(inputPath);
    return res.status(400).send("Unsupported image format");
  }

  const outputPath = `output/${ Date.now() }.${ format }`;

  try {
    let img = sharp(inputPath);

    if (format === "jpeg") img = img.jpeg({ quality: qualityValue });
    else if (format === "png") img = img.png({ quality: qualityValue });
    else img = img[format]();

    await img.toFile(outputPath);
    sendAndCleanup(res, inputPath, outputPath);
  } catch (err) {
    console.error("Image compress error:", err.message);
    safeUnlink(inputPath);
    res.status(500).send("Image compression failed");
  }
});

// server

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Formatix backend running on port ${ PORT }`);
});

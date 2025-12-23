const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static")
const sharp = require("sharp")
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());

ffmpeg.setFfmpegPath(ffmpegStatic);

const upload = multer({ dest: "uploads/" });

if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
}

const sendAndCleanup = (res, inputPath, outputPath) => {
    res.download(outputPath, () => {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    });
}

const FORMAT_CONFIG = {
    gif: {
        format: "gif",
        options: ["-vf fps=10,scale=480:-1"],
        videoCodec: null,
        audio: false,
    },
    webm: {
        format: "webm",
        options: ["-c:v libvpx-vp9", "-crf 30", "-b:v 0"],
        videoCodec: null,
        audio: false,
    },
    mov: {
        format: "mov",
        options: ["-c:v libx264", "-preset veryfast"],
        audio: true,
    },
    mp4: {
        format: "mp4",
        options: ["-c:v libx264", "-preset veryfast"],
        audio: true,
    },
};

app.post("/convert-video", upload.single("file"), async (req, res) => {
    const inputPath = req.file.path;
    const { format = "mp4" } = req.body;

    const config = FORMAT_CONFIG[format];
    if (!config) {
        fs.unlinkSync(inputPath);
        return res.status(400).send("Unsupported format");
    }

    const outputPath = `output/${ Date.now() }.${ format }`;

    let command = ffmpeg(inputPath).outputOptions(config.options);

    if (config.audio === false) {
        command = command.noAudio();
    }

    command
        .toFormat(config.format)
        .on("end", () => {
            sendAndCleanup(res, inputPath, outputPath);
        })
        .on("error", (err) => {
            console.error("FFmpeg error:", err.message);
            fs.unlinkSync(inputPath);
            res.status(500).send("Conversion failed");
        })
        .save(outputPath);
});


app.post('/convert-image', upload.single("file"), async (req, res) => {
    const inputPath = req.file.path;
    const outputFormat = req.body.format;
    const outputPath = `output/${ Date.now() }.${ outputFormat }`;

    try {

        let image = sharp(inputPath);

        if (outputFormat === "png") image = image.png();
        if (outputFormat === "jpeg") image = image.jpeg();
        if (outputFormat === "webp") image = image.webp();
        if (outputFormat === "avif") image = image.avif();
        if (outputFormat === "ico") image = image.ico();

        await image.toFile(outputPath)
        sendAndCleanup(res, inputPath, outputPath)
    }
    catch (error) {
        res.status(500).send("Conversion failed", error)
    }
})

app.post('/compress-image', upload.single("file"), async (req, res) => {
    const inputPath = req.file.path;
    const { format = "jpeg" } = req.body;
    const outputPath = `output/${ Date.now() }.${ format }`;

    try {
        let image = sharp(inputPath);

        switch (format) {
            case 'jpeg':
                image = image.jpeg();
                break;
            case 'png':
                image = image.png();
                break;
            case 'webp':
                image = image.webp();
                break;
            case 'avif':
                image = image.avif();
                break;
            case 'ico':
                image = image.ico();
                break;
        }

        await image.toFile(outputPath);
        sendAndCleanup(res, inputPath, outputPath);
    }
    catch (err) {
        console.error("Image Conversion Error:", err);
        fs.unlinkSync(inputPath);
        res.status(500).send("Image Conversion Failed");
    }
});

app.post('/compress-video', upload.single("file"), (req, res) => {
    const inputPath = req.file.path;
    const { format = "mp4" } = req.body;
    const outputPath = `output/${ Date.now() }.${ format }`;

    ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([`-crf 28`, "-preset medium", "-vf scale=1280:-1"])
        .toFormat(format)
        .on("end", () => {
            sendAndCleanup(res, inputPath, outputPath);
        })
        .on("error", (error) => {
            console.error(error);
            fs.unlinkSync(inputPath)
            res.status(500).send("Video Compression Failed" + error.message)
        })
        .save(outputPath);
})

app.listen(5000, () => {
    console.log("server running on http://localhost:5000");
});
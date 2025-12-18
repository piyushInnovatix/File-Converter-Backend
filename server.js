const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp")
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());

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

app.post('/mp4-to-gif', upload.single("file"), (req, res) => {
    const inputPath = req.file.path;
    const outputPath = `output/${ Date.now() }.gif`;

    ffmpeg(inputPath)
        .outputOptions(["-vf fps=10,scale=480:-1"])
        .toFormat("gif")
        .on("end", () => {
            res.download(outputPath, () => {
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
            });
            sendAndCleanup(res, inputPath, outputPath);
        })
        .on("error", (error) => {
            console.error(error);
            res.status(500).send("Conversion Failed")
        })
        .save(outputPath);
})

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

app.listen(5000, () => {
    console.log("server running on http://localhost:5000");
});
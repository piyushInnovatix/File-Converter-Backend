// src/modules/image/image.routes.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const convertImage = require("../modules/images/image.convert");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/convert", upload.single("file"), async (req, res) => {
    const file = req.file;
    const { format } = req.body;

    if (!file) return res.status(400).send("No file uploaded");
    if (!format) return res.status(400).send("No format specified");

    try {
        const outputPath = await convertImage(file.path, format);

        res.download(outputPath, () => {
            fs.unlinkSync(file.path);
            fs.unlinkSync(outputPath);
        });
    } catch (err) {
        console.error("Conversion failed:", err);
        fs.unlinkSync(file.path);
        res.status(500).send(err.message || "Conversion failed");
    }
});

module.exports = router;

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

async function sharpConverter(inputPath, format) {
    const outputPath = path.join(
        "output",
        `${ Date.now() }.${ format }`
    );

    let image = sharp(inputPath)

    switch (format) {
        case 'jpeg':
        case 'jpg':
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

        case 'tiff':
            image = image.tiff();
            break;

        default:
            throw new Error('Sharp can not encode format.')
    }

    await image.toFile(outputPath);

    return outputPath;
}

module.exports = sharpConverter;
const sharp = require('../../utils/sharp');
const magick = require('../../utils/magick');
const path = require("path");

async function imageConvert(inputPath, outputFormat) {
    const lower = outputFormat.toLowerCase();

    if (['ico', 'bmp'].includes(lower)) {
        return await magick(inputPath, lower)
    }

    return await sharp(inputPath, lower);
}

module.exports = imageConvert;
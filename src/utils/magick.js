const { exec } = require("child_process")
const path = require("path")

function magickConvert(inputPath, format) {
    return new Promise((resolve, reject) => {

        if (!require("fs").existsSync("output")) {
            require("fs").mkdirSync("output");
        }

        const outputPath = path.join("output", `${ Date.now() }.${ format }`);
        const cmd = `magick "${ inputPath }" "${ outputPath }"`;

        exec(cmd, (err) => {
            if (err) {
                console.error("Magick Error:", err);
                return reject(new Error(`Magick failed to format ${ format }`))
            }

            resolve(outputPath)
        })
    })
}

module.exports = magickConvert;
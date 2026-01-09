const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const imageRoutes = require("./routes/image.routes");

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");
if (!fs.existsSync("./output")) fs.mkdirSync("./output");

app.use("/image-convert", imageRoutes)

app.get("/", (req, res) => {
  res.send("Formatix Backed Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${ PORT }`));
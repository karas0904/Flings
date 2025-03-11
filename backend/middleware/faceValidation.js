const path = require("path");
const fs = require("fs");
const canvas = require("canvas");
const faceapi = require("face-api.js");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load face-api.js models
const MODEL_PATH = path.join(__dirname, "..", "models");
Promise.all([faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH)]).then(
  () => {
    console.log("Face-api.js models loaded");
  }
);

const validateFace = async (req, res, next) => {
  if (!req.files || !req.files.image) {
    return res.status(400).send("No image file uploaded.");
  }

  const { image } = req.files;
  const img = await canvas.loadImage(image.tempFilePath);
  const detection = await faceapi.detectSingleFace(
    img,
    new faceapi.TinyFaceDetectorOptions()
  );

  if (detection) {
    next();
  } else {
    fs.unlinkSync(image.tempFilePath); // Delete the temporary file
    res.status(400).send("No face detected in the image.");
  }
};

module.exports = validateFace;

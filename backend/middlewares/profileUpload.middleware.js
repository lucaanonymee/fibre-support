const fs = require("fs");
const path = require("path");
const multer = require("multer");

const PROFILE_PHOTO_FIELD = "photo";
const PROFILE_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "profiles");
const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PROFILE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const userId = req.user?.id?.toString() || "user";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${userId}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error("Seuls les fichiers image sont autorises (jpeg, png, webp, gif)."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_PROFILE_PHOTO_SIZE_BYTES,
  },
}).single(PROFILE_PHOTO_FIELD);

const uploadProfilePhoto = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "La taille maximale autorisee pour la photo est 2MB.",
      });
    }

    return res.status(400).json({
      message: err.message || "Erreur lors de l'upload de la photo.",
    });
  });
};

module.exports = {
  PROFILE_PHOTO_FIELD,
  uploadProfilePhoto,
};

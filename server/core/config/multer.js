const multer = require("multer");
const path = require("path");
const fs = require("fs");

// const uploadPath = path.join(__dirname, "../resources/uploads/");

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../resources/uploads/");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Memory storage configuration
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow images and videos
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed!"), false);
  }
};

// Single file upload configuration
const uploadSingle = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

const profileImageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (allowed.has(file.mimetype)) return cb(null, true);
    return cb(new Error("Profile images must be JPEG, PNG, WebP, or GIF"), false);
  },
});

// Multiple files upload configuration
const uploadMultiple = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5, // Maximum 5 files
  },
  fileFilter,
});

// Large file upload configuration (uses disk storage)
const uploadLarge = multer({
  dest: diskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter,
});

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadLarge,
  profileImageUpload,
  fileFilter,
};

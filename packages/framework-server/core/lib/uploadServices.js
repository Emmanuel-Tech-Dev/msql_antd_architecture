const {
  uploadFromBuffer,
  uploadFromPath,
  deleteFile,
} = require("../config/cloudinary");
const fs = require("fs");
const AppError = require("../../shared/helpers/AppError");

// File types recognised from their content (their first bytes), so a file
// that claims to be a PDF or an image really is one. resourceType is how
// Cloudinary stores the file; PDFs are stored "raw" and keep their extension
// so they are served as PDFs.
const FILE_SIGNATURES = {
  "image/jpeg": { resourceType: "image", matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": {
    resourceType: "image",
    matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  "image/gif": { resourceType: "image", matches: (buffer) => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")) },
  "image/webp": {
    resourceType: "image",
    matches: (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
  "application/pdf": { resourceType: "raw", extension: "pdf", matches: (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
};
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// The file's type when its claimed type is one of `allowedTypes` and its
// content matches that type; otherwise null.
function recognisedType(file, allowedTypes) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || !allowedTypes.includes(file.mimetype)) return null;
  const type = FILE_SIGNATURES[file.mimetype];
  return type && type.matches(buffer) ? type : null;
}

function hasSupportedImageSignature(buffer) {
  return IMAGE_TYPES.some((mimetype) => recognisedType({ buffer, mimetype }, IMAGE_TYPES));
}

class UploadService {
  async uploadProfileAvatar(file, userId) {
    if (!file?.buffer || !file.mimetype?.startsWith("image/")) {
      throw new AppError("ERR_VALIDATION_FAILED", "A valid profile image is required");
    }
    if (!hasSupportedImageSignature(file.buffer)) {
      throw new AppError(
        "ERR_VALIDATION_FAILED",
        "The uploaded file content is not a supported image",
      );
    }

    const safeUserId = String(userId).replace(/[^A-Za-z0-9_-]/g, "_");
    const result = await uploadFromBuffer(file.buffer, {
      folder: "mysql-orm/profile-avatars",
      resource_type: "image",
      public_id: safeUserId,
      overwrite: true,
      invalidate: true,
      transformation: [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      size: result.bytes,
      version: result.version,
    };
  }

  async uploadCompanyLogo(file) {
    if (!file?.buffer || !hasSupportedImageSignature(file.buffer)) {
      throw new AppError(
        "ERR_VALIDATION_FAILED",
        "The uploaded file content is not a supported image",
      );
    }

    // One logo per installation; a new upload replaces the previous file.
    const result = await uploadFromBuffer(file.buffer, {
      folder: "branding",
      resource_type: "image",
      public_id: "company-logo",
      overwrite: true,
      invalidate: true,
      transformation: [{ width: 800, height: 400, crop: "limit" }, { quality: "auto" }],
    });

    return { url: result.secure_url };
  }

  // The sign-in page's cover picture: one per installation, replaced by each upload.
  async uploadLoginCover(file) {
    if (!file?.buffer || !hasSupportedImageSignature(file.buffer)) {
      throw new AppError(
        "ERR_VALIDATION_FAILED",
        "The uploaded file content is not a supported image",
      );
    }

    const result = await uploadFromBuffer(file.buffer, {
      folder: "branding",
      resource_type: "image",
      public_id: "login-cover",
      overwrite: true,
      invalidate: true,
      transformation: [{ width: 2400, height: 1600, crop: "limit" }, { quality: "auto", fetch_format: "auto" }],
    });

    return { url: result.secure_url };
  }

  // A signature photographed or scanned on white paper: the paper is made
  // transparent and the image trimmed to the ink, so only the signature
  // shows wherever it is printed. Saved as PNG to keep the transparency; a
  // new upload with the same publicId replaces the old one.
  async uploadSignature(file, { folder, publicId }) {
    if (!recognisedType(file, ["image/jpeg", "image/png", "image/webp"])) {
      throw new AppError("ERR_VALIDATION_FAILED", "Upload the signature as a JPEG, PNG or WebP image");
    }
    const result = await uploadFromBuffer(file.buffer, {
      folder,
      resource_type: "image",
      public_id: publicId,
      overwrite: true,
      invalidate: true,
      format: "png",
      transformation: [
        { effect: "make_transparent:12", color: "white" },
        { effect: "trim:10" },
        { width: 900, height: 240, crop: "limit" },
      ],
    });
    return { url: result.secure_url, public_id: result.public_id };
  }

  // True when the file's claimed type is one of `allowedTypes` and its
  // content matches it.
  isAccepted(file, allowedTypes) {
    return Boolean(recognisedType(file, allowedTypes));
  }

  // Uploads a document or image (e.g. a receipt or a supplier's PDF) after
  // checking its content matches its type. `allowedTypes` is what the caller
  // accepts; `publicId` should be unique, as an existing file is replaced.
  async uploadDocument(file, { folder, publicId, allowedTypes }) {
    const type = recognisedType(file, allowedTypes);
    if (!type) {
      throw new AppError("ERR_VALIDATION_FAILED", "The file's content does not match an accepted file type");
    }
    const result = await uploadFromBuffer(file.buffer, {
      folder,
      resource_type: type.resourceType,
      public_id: type.extension ? `${publicId}.${type.extension}` : publicId,
    });
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      size: result.bytes,
    };
  }

  // Deletes a file stored with uploadDocument. The file's type decides how
  // Cloudinary stored it (PDFs are "raw"), which it needs to find the file.
  // A file that is already gone counts as deleted.
  async deleteDocument({ publicId, mimetype }) {
    const resourceType = FILE_SIGNATURES[mimetype]?.resourceType ?? "image";
    const result = await deleteFile(publicId, { resource_type: resourceType, invalidate: true });
    if (result?.result !== "ok" && result?.result !== "not found") {
      throw new AppError("ERR_EXTERNAL_SERVICE_ERROR", `The stored file could not be deleted (${result?.result ?? "no response"})`);
    }
    return result.result;
  }

  // Upload single file to Cloudinary
  async uploadSingleFile(file, folder = "home/testing folder") {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      throw new Error("Only image and video files are supported");
    }

    const options = {
      folder,
      resource_type: isImage ? "image" : "video",
      public_id: file.originalname.split(".")[0], // Use original filename without extension
    };

    let result;

    if (file.buffer) {
      // Memory storage - upload from buffer
      result = await uploadFromBuffer(file.buffer, options);
    } else if (file.path) {
      // Disk storage - upload from file path
      result = await uploadFromPath(file.path, options);
      // Clean up temporary file
      fs.unlinkSync(file.path);
    } else {
      throw new Error("No file buffer or path found");
    }
    const data = {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      size: result.bytes,
      version: result.version, // Version number changes on update
    };

    // const response = {
    //   success: true,
    //   status: "success",
    //   statusCode: 200,
    //   message: "Operation successful!",
    //   data: data,
    // };

    return data;
  }
  // In your uploadService.js
  async updateFile(file, publicId, folder = "home/Test") {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    const options = {
      folder,
      resource_type: isImage ? "image" : "video",
      public_id: publicId, // Same public_id = overwrite
      overwrite: true, // Explicitly allow overwrite
      invalidate: true, // Clear cached versions
    };

    let result;

    if (file.buffer) {
      result = await uploadFromBuffer(file.buffer, options);
    } else if (file.path) {
      result = await uploadFromPath(file.path, options);
      fs.unlinkSync(file.path);
    }

    const data = {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      size: result.bytes,
      version: result.version, // Version number changes on update
    };

    return data;
  }

  // In your uploadService.js
  async replaceFile(file, oldPublicId, folder = "home/Test") {
    // Delete old file
    await this.deleteFile(oldPublicId);

    // Upload new file
    const result = await this.uploadSingleFile(file, folder);

    return result;
  }

  // Upload multiple files to Cloudinary
  async uploadMultipleFiles(files, folder = "home/testing folder") {
    const uploadPromises = files.map((file) =>
      this.uploadSingleFile(file, folder)
    );
    const results = await Promise.all(uploadPromises);

    return results;
  }

  // Delete file from Cloudinary
  async deleteFile(publicId) {
    const result = await deleteFile(publicId);

    const response = {
      message: "Operation successful!",
      // data: results,
    };

    return result;
  }

  // Get file type from mimetype
}

module.exports = new UploadService();

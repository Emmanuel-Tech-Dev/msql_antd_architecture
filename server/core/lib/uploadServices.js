const {
  uploadFromBuffer,
  uploadFromPath,
  deleteFile,
} = require("../config/cloudinary");
const fs = require("fs");
const AppError = require("../../shared/helpers/AppError");

function hasSupportedImageSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  const gif = ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || gif || webp;
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

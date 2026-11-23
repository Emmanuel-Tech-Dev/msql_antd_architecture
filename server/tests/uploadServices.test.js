jest.mock("../core/config/cloudinary", () => ({
  uploadFromBuffer: jest.fn(),
  uploadFromPath: jest.fn(),
  deleteFile: jest.fn(),
}));

const { uploadFromBuffer, deleteFile } = require("../core/config/cloudinary");
const uploadServices = require("../core/lib/uploadServices");

const padded = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);
const PDF = padded("%PDF-1.7");
const PNG = padded([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = padded([0xff, 0xd8, 0xff, 0xe0]);
const HTML = padded("<html><script>");
const DOCUMENTS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

describe("uploadServices file checks", () => {
  beforeEach(() => jest.clearAllMocks());

  test("accepts files whose content matches their type", () => {
    expect(uploadServices.isAccepted({ mimetype: "application/pdf", buffer: PDF }, DOCUMENTS)).toBe(true);
    expect(uploadServices.isAccepted({ mimetype: "image/png", buffer: PNG }, DOCUMENTS)).toBe(true);
  });

  test("rejects a file dressed up as another type, or a type the caller does not allow", () => {
    expect(uploadServices.isAccepted({ mimetype: "application/pdf", buffer: HTML }, DOCUMENTS)).toBe(false);
    expect(uploadServices.isAccepted({ mimetype: "image/png", buffer: JPEG }, DOCUMENTS)).toBe(false);
    expect(uploadServices.isAccepted({ mimetype: "image/gif", buffer: padded("GIF89a") }, DOCUMENTS)).toBe(false);
  });

  test("uploadDocument stores PDFs raw with their extension and images as images", async () => {
    uploadFromBuffer.mockResolvedValue({ secure_url: "https://files/x", public_id: "id", resource_type: "raw", format: "pdf", bytes: 24 });

    const stored = await uploadServices.uploadDocument({ mimetype: "application/pdf", buffer: PDF }, {
      folder: "documents/receipts", publicId: "ATT-1", allowedTypes: DOCUMENTS,
    });
    expect(uploadFromBuffer).toHaveBeenLastCalledWith(PDF, { folder: "documents/receipts", resource_type: "raw", public_id: "ATT-1.pdf" });
    expect(stored).toEqual({ url: "https://files/x", public_id: "id", resource_type: "raw", format: "pdf", size: 24 });

    await uploadServices.uploadDocument({ mimetype: "image/jpeg", buffer: JPEG }, { folder: "f", publicId: "ATT-2", allowedTypes: DOCUMENTS });
    expect(uploadFromBuffer).toHaveBeenLastCalledWith(JPEG, { folder: "f", resource_type: "image", public_id: "ATT-2" });
  });

  test("uploadDocument refuses a mismatched file before anything is uploaded", async () => {
    await expect(uploadServices.uploadDocument({ mimetype: "application/pdf", buffer: HTML }, {
      folder: "f", publicId: "ATT-3", allowedTypes: DOCUMENTS,
    })).rejects.toMatchObject({ errorCode: "ERR_VALIDATION_FAILED" });
    expect(uploadFromBuffer).not.toHaveBeenCalled();
  });

  test("profile pictures still accept any supported image, including GIF", async () => {
    uploadFromBuffer.mockResolvedValue({ secure_url: "u", public_id: "p", format: "gif", bytes: 1, version: 1 });
    await expect(uploadServices.uploadProfileAvatar({ mimetype: "image/gif", buffer: padded("GIF89a") }, "USR-1"))
      .resolves.toMatchObject({ url: "u" });
    await expect(uploadServices.uploadProfileAvatar({ mimetype: "image/png", buffer: HTML }, "USR-1"))
      .rejects.toMatchObject({ errorCode: "ERR_VALIDATION_FAILED" });
  });

  test("deleteDocument removes PDFs as raw files and images as images", async () => {
    deleteFile.mockResolvedValue({ result: "ok" });
    await uploadServices.deleteDocument({ publicId: "docs/ATT-1.pdf", mimetype: "application/pdf" });
    expect(deleteFile).toHaveBeenLastCalledWith("docs/ATT-1.pdf", { resource_type: "raw", invalidate: true });
    await uploadServices.deleteDocument({ publicId: "docs/ATT-2", mimetype: "image/png" });
    expect(deleteFile).toHaveBeenLastCalledWith("docs/ATT-2", { resource_type: "image", invalidate: true });
  });

  test("deleteDocument treats a file that is already gone as deleted, and reports other failures", async () => {
    deleteFile.mockResolvedValueOnce({ result: "not found" });
    await expect(uploadServices.deleteDocument({ publicId: "x", mimetype: "image/png" })).resolves.toBe("not found");
    deleteFile.mockResolvedValueOnce({ result: "error" });
    await expect(uploadServices.deleteDocument({ publicId: "x", mimetype: "image/png" }))
      .rejects.toMatchObject({ errorCode: "ERR_EXTERNAL_SERVICE_ERROR" });
  });
  test("uploadSignature makes the paper transparent, trims to the ink and keeps it as PNG", async () => {
    uploadFromBuffer.mockResolvedValue({ secure_url: "https://files/sig.png", public_id: "signatures/manager" });
    const stored = await uploadServices.uploadSignature({ mimetype: "image/jpeg", buffer: JPEG }, { folder: "signatures", publicId: "manager" });
    expect(uploadFromBuffer).toHaveBeenLastCalledWith(JPEG, expect.objectContaining({
      folder: "signatures", public_id: "manager", format: "png", overwrite: true,
      transformation: [
        { effect: "make_transparent:12", color: "white" },
        { effect: "trim:10" },
        { width: 900, height: 240, crop: "limit" },
      ],
    }));
    expect(stored).toEqual({ url: "https://files/sig.png", public_id: "signatures/manager" });
    await expect(uploadServices.uploadSignature({ mimetype: "application/pdf", buffer: PDF }, { folder: "f", publicId: "x" }))
      .rejects.toMatchObject({ errorCode: "ERR_VALIDATION_FAILED" });
  });
});

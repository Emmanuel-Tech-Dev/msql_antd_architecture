jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));
jest.mock("../core/lib/uploadServices", () => ({
  uploadDocument: jest.fn(async (file, options) => ({
    url: `https://files.example/${options.folder}/${options.publicId}`,
    public_id: options.publicId,
    resource_type: "image",
    format: "png",
    size: file.size,
  })),
}));

const db = require("../core/config/conn");
const uploadServices = require("../core/lib/uploadServices");
const { uploadFieldFile } = require("../core/lib/metadataService");

const FIELDS = {
  logo: { column_name: "logo", col_real_name: "Logo", type: "image", disabled: 0, config: { maxSizeMb: 2 } },
  contract: { column_name: "contract", col_real_name: "Contract", type: "file", disabled: 0, config: { accept: ["application/pdf", "text/csv"] } },
  name: { column_name: "name", col_real_name: "Name", type: "text", disabled: 0, config: null },
};
const png = (size = 1024) => ({ buffer: Buffer.alloc(16), size, mimetype: "image/png", originalname: "logo.png" });

beforeEach(() => {
  db.query.mockReset();
  uploadServices.uploadDocument.mockClear();
  db.query.mockImplementation(async (sql, params = []) => [FIELDS[params[1]] ? [FIELDS[params[1]]] : []]);
});

describe("file and image field uploads", () => {
  test("an image field stores the image in the table's folder and returns where it is", async () => {
    const stored = await uploadFieldFile("suppliers", "logo", png(), { permissions: ["create:suppliers"] });

    expect(stored).toMatchObject({ name: "logo.png", format: "png" });
    expect(stored.url).toMatch(/^https:\/\/files\.example\/metadata\/suppliers\/logo-/);
    const [, options] = uploadServices.uploadDocument.mock.calls[0];
    expect(options.allowedTypes).toEqual(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  });

  test("a file field accepts only its configured types that a file field may hold", async () => {
    await uploadFieldFile("suppliers", "contract", png(), { permissions: ["update:suppliers"] });
    const [, options] = uploadServices.uploadDocument.mock.calls[0];
    expect(options.allowedTypes).toEqual(["application/pdf"]);
  });

  test("a file larger than the field allows is refused before it is stored", async () => {
    await expect(uploadFieldFile("suppliers", "logo", png(3 * 1024 * 1024), { privileged: true }))
      .rejects.toMatchObject({ errorCode: "ERR_VALIDATION_FAILED", message: "Logo must be at most 2 MB" });
    expect(uploadServices.uploadDocument).not.toHaveBeenCalled();
  });

  test("only someone who may create or update the table's records can upload for it", async () => {
    await expect(uploadFieldFile("suppliers", "logo", png(), { permissions: ["read:suppliers"] }))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
    expect(uploadServices.uploadDocument).not.toHaveBeenCalled();
  });

  test("a column that is not a file or image field is not an upload target", async () => {
    await expect(uploadFieldFile("suppliers", "name", png(), { privileged: true })).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
    await expect(uploadFieldFile("suppliers", "missing", png(), { privileged: true })).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
    await expect(uploadFieldFile("suppliers; drop", "logo", png(), { privileged: true })).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });

  test("no file is refused", async () => {
    await expect(uploadFieldFile("suppliers", "logo", undefined, { privileged: true }))
      .rejects.toMatchObject({ errorCode: "ERR_VALIDATION_FAILED", message: "Choose a file to upload" });
  });
});

jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));
jest.mock("../core/lib/uploadServices", () => ({ deleteDocument: jest.fn(async () => "ok") }));

const db = require("../core/config/conn");
const uploadServices = require("../core/lib/uploadServices");
const { fileChanges, purgeUploads, syncRecordFiles, releaseRecordFiles } = require("../core/lib/uploadTracking");

const OLD = "https://files.example/metadata/suppliers/logo-old.png";
const NEW = "https://files.example/metadata/suppliers/logo-new.png";
const tracked = (url, extra = {}) => ({ id: 7, table_name: "suppliers", column_name: "logo", url, public_id: "metadata/suppliers/logo-old", mimetype: "image/png", attempts: 0, ...extra });

// Answers each query by what it asks for; `stillUsed` is what the referenced check finds.
function database({ queued = [], stillUsed = [], abandoned = [], released = [] } = {}) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("FROM `tables_metadata`")) return [[{ column_name: "logo" }]];
    if (sql.startsWith("SELECT `logo` FROM `suppliers`")) return [stillUsed];
    if (sql.includes("FROM `metadata_uploads`") && params.includes("PENDING")) return [abandoned];
    if (sql.includes("FROM `metadata_uploads`") && sql.includes("`url` IN")) return [queued];
    if (sql.includes("FROM `metadata_uploads`")) return [released];
    return [{ affectedRows: 1 }];
  });
}
const updates = () => db.query.mock.calls.filter(([sql]) => sql.startsWith("UPDATE `metadata_uploads`"));

beforeEach(() => {
  db.query.mockReset();
  uploadServices.deleteDocument.mockReset();
  uploadServices.deleteDocument.mockResolvedValue("ok");
});

describe("upload clean-up", () => {
  test("a save keeps the new file and lets go of the one it replaced or cleared", () => {
    expect(fileChanges(["logo"], {}, { logo: NEW })).toEqual({ keep: [{ column: "logo", url: NEW }], release: [] });
    expect(fileChanges(["logo"], { logo: OLD }, { logo: NEW })).toEqual({ keep: [{ column: "logo", url: NEW }], release: [{ column: "logo", url: OLD }] });
    expect(fileChanges(["logo"], { logo: OLD }, { logo: null })).toEqual({ keep: [], release: [{ column: "logo", url: OLD }] });
    expect(fileChanges(["logo"], { logo: OLD }, { name: "Acme" })).toEqual({ keep: [], release: [] });
  });

  test("replacing a file attaches the new one and deletes the old one from storage", async () => {
    database({ queued: [tracked(OLD)] });
    await syncRecordFiles("suppliers", 42, { logo: OLD }, { logo: NEW });

    const [attach, release, deleted] = updates();
    expect(attach[0]).toContain("SET `status` = ?, `record_id` = ?");
    expect(attach[1]).toEqual(["ATTACHED", "42", "suppliers", "logo", NEW, "PENDING", "ATTACHED"]);
    expect(release[1]).toEqual(["REMOVED", "suppliers", "logo", OLD, "PENDING", "ATTACHED"]);
    expect(uploadServices.deleteDocument).toHaveBeenCalledWith({ publicId: "metadata/suppliers/logo-old", mimetype: "image/png" });
    expect(deleted[1][0]).toBe("DELETED");
  });

  test("a file another record still uses is kept", async () => {
    database({ queued: [tracked(OLD)], stillUsed: [{ logo: OLD }] });
    await releaseRecordFiles("suppliers", { id: 42, logo: OLD });

    expect(uploadServices.deleteDocument).not.toHaveBeenCalled();
    expect(updates().at(-1)[1][0]).toBe("ATTACHED");
  });

  test("the hourly purge deletes abandoned uploads and retries a failed delete later", async () => {
    database({ abandoned: [tracked(OLD, { id: 1 })], released: [tracked(NEW, { id: 2, public_id: "metadata/suppliers/logo-new" })] });
    uploadServices.deleteDocument
      .mockResolvedValueOnce("ok")
      .mockRejectedValueOnce(new Error("Cloudinary unavailable"));

    const outcome = await purgeUploads(new Date("2026-11-25T12:00:00Z"));

    expect(outcome).toEqual({ deleted: 1, kept: 0, failed: 1 });
    const pendingQuery = db.query.mock.calls.find(([sql, params]) => sql.includes("FROM `metadata_uploads`") && params.includes("PENDING"));
    expect(pendingQuery[1][1]).toEqual(new Date("2026-11-24T12:00:00Z"));
    const failed = updates().at(-1)[1];
    expect(failed.slice(0, 3)).toEqual(["REMOVED", 1, "Cloudinary unavailable"]);
  });

  test("a tracking failure never undoes the save", async () => {
    db.query.mockRejectedValue(new Error("metadata_uploads is missing"));
    await expect(syncRecordFiles("suppliers", 42, {}, { logo: NEW })).resolves.toBeUndefined();
  });
});

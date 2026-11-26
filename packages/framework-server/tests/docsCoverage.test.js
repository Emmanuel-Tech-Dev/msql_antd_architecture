// The UI package hosts the documentation; these checks fail when a server
// export or utility is added without being documented there.
const fs = require("fs");
const path = require("path");
const utils = require("../shared/utils/functions");
const framework = require("../index");

const REFERENCE = path.resolve(__dirname, "../../framework-ui/src/pages/docs/content/reference");
const read = (name) => fs.readFileSync(path.join(REFERENCE, `${name}.md`), "utf8");
const mentioned = (text, name) => new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`).test(text);

const docsPresent = fs.existsSync(REFERENCE);
const describeWithDocs = docsPresent ? describe : describe.skip;

describeWithDocs("server reference covers the package", () => {
  test("every export of @msql-antd/framework-server is on the Server API page", () => {
    const page = read("server-api");
    expect(Object.keys(framework).filter((name) => !mentioned(page, name))).toEqual([]);
  });

  test("every utils function is on the Server utilities page", () => {
    const page = read("server-utilities");
    expect(Object.keys(utils).filter((name) => !mentioned(page, name))).toEqual([]);
  });
});

jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), security: jest.fn(), info: jest.fn(), warn: jest.fn() }));
jest.mock("../core/lib/systemSettings", () => jest.fn().mockImplementation(() => ({
  get: jest.fn(async (key, fallback) => fallback),
  fetchFromDB: jest.fn(async () => null),
})));
jest.mock("../core/lib/authorizationEvents", () => ({ broadcast: jest.fn(), publish: jest.fn(), subscribe: jest.fn() }));

const db = require("../core/config/conn");
const { DEFAULT_LOGIN_UI, readLoginUi } = require("../core/config/loginUi");
const UiSettingsRoute = require("../route/UiSettingsRoute");
const AuthRoute = require("../route/authRoute");

const LOGIN_UI = {
  layout: "split",
  headline: "Every order, mixed right.",
  message: "Stock, orders and deliveries for every Acme branch.",
  highlights: [{ title: "Live stock", detail: "across all branches" }],
  coverImage: "",
  helpUrl: "https://acmepaints.example/help",
};

// Collects the handlers a route class registers, by method and path.
function routesOf(RouteClass) {
  const handlers = {};
  const register = (method) => (path, ...stack) => { handlers[`${method} ${path}`] = stack.at(-1); };
  new RouteClass({ get: register("GET"), post: register("POST"), put: register("PUT"), patch: register("PATCH"), delete: register("DELETE"), use: () => {} });
  return handlers;
}

async function call(handler, req) {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res), cookie: jest.fn(() => res) };
  const next = jest.fn();
  await handler({ params: {}, body: {}, user: { sub: "REG-1" }, requestId: "r1", ...req }, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0], error: next.mock.calls[0]?.[0] };
}

beforeEach(() => db.query.mockReset());

describe("login_ui setting", () => {
  test("a stored value is read with defaults filled in; a broken one falls back to the defaults", () => {
    expect(readLoginUi({ layout: "cover" })).toEqual({ ...DEFAULT_LOGIN_UI, layout: "cover" });
    expect(readLoginUi({ layout: "fancy" })).toEqual(DEFAULT_LOGIN_UI);
    expect(readLoginUi(null)).toEqual(DEFAULT_LOGIN_UI);
  });

  test("Appearance saves it through the same route as the sidebar, by its key and version", async () => {
    db.query.mockResolvedValue([{ affectedRows: 1 }]);
    const save = routesOf(UiSettingsRoute)["PUT /api/v1/ui-settings/:id"];

    const { body } = await call(save, { params: { id: "4" }, body: { settingKey: "login_ui", settingValue: LOGIN_UI, expectedVersion: 2 } });

    expect(body.data).toEqual({ id: 4, setting_key: "login_ui", setting_value: LOGIN_UI, version: 3 });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain("UPDATE `ui_settings`");
    expect(params).toEqual(expect.arrayContaining([JSON.stringify(LOGIN_UI), 3, "REG-1", 4, "login_ui", 2, 1]));
  });

  test("a value that breaks the rules is refused with the fields at fault, and nothing is written", async () => {
    const save = routesOf(UiSettingsRoute)["PUT /api/v1/ui-settings/:id"];
    const tooMany = Array.from({ length: 4 }, () => ({ title: "x", detail: "" }));

    const { error } = await call(save, {
      params: { id: "4" },
      body: { settingKey: "login_ui", settingValue: { ...LOGIN_UI, layout: "fancy", highlights: tooMany, helpUrl: "javascript:alert(1)" }, expectedVersion: 2 },
    });

    expect(error.errorCode ?? error.code).toBe("ERR_VALIDATION_FAILED");
    expect(error.metadata.fields).toEqual(expect.arrayContaining(["layout", "highlights", "helpUrl"]));
    expect(db.query).not.toHaveBeenCalled();
  });

  test("a sidebar page pinned in another area is accepted", async () => {
    const save = routesOf(UiSettingsRoute)["PUT /api/v1/ui-settings/:id"];
    const { error } = await call(save, { params: { id: "1" }, body: { settingValue: { bottomKey: "/finance/reports" }, expectedVersion: 1 } });
    // The rest of this sidebar value is missing, so it fails, but not on bottomKey.
    expect(error.metadata.fields).not.toContain("bottomKey");
  });
});

describe("/auth/login_options", () => {
  test("gives the signed-out sign-in page the brand and the sign-in page look, nothing else", async () => {
    db.query.mockImplementation(async (sql) => {
      if (sql.includes("`ui_settings`")) {
        return [[
          { setting_key: "layout.sider", setting_value: JSON.stringify({ brand: { name: "Acme Paints", caption: "Operations", mark: "A" }, colors: { accent: "#0f766e" } }) },
          { setting_key: "login_ui", setting_value: JSON.stringify(LOGIN_UI) },
        ]];
      }
      return [[]];
    });
    const options = routesOf(AuthRoute)["GET /auth/login_options"];

    const { body } = await call(options, {});

    expect(body.data.page).toEqual({ brand: { name: "Acme Paints", caption: "Operations", mark: "A" }, ...LOGIN_UI });
    expect(body.data.page.colors).toBeUndefined();
    const [sql] = db.query.mock.calls.find(([text]) => text.includes("`ui_settings`"));
    expect(sql).toContain("`setting_key` IN (?, ?)");
  });

  test("falls back to a neutral brand and the centered layout before anything is set", async () => {
    db.query.mockResolvedValue([[]]);
    const { body } = await call(routesOf(AuthRoute)["GET /auth/login_options"], {});
    expect(body.data.page).toEqual({ brand: { name: "Workspace", caption: "", mark: "W" }, ...DEFAULT_LOGIN_UI });
  });
});

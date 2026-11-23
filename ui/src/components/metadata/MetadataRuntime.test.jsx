import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { DataProviderContext } from "../../core/provider/DataProvider";
import { useResourceStore } from "../../core/provider/ResourceProvider";
import useAuthStore from "../../store/authStore";
import MetadataForm from "./MetadataForm";
import MetadataTable from "./MetadataTable";

const field = (column_name, col_real_name, type, overrides = {}) => ({
  column_name, col_real_name, type, form_visible: 1, list_visible: 1, editable: 1, disabled: 0,
  required: 0, section_key: null, col_span: 24, config: null, ...overrides,
});

const METADATA = {
  admin_role_permissions: {
    table: { table_name: "admin_role_permissions", label: "Role assignments", singular_label: "Assignment", search_columns: ["role_id", "permission"], form_layout: "modal", form_columns: 1, sections: [] },
    fields: [
      field("id", "ID", "primaryKey", { form_visible: 0, list_visible: 0 }),
      field("role_id", "Role", "lookup", { required: 1, config: { lookup: "roles" } }),
      field("permission", "Permission", "lookup", { required: 1, config: { lookup: "permissions" } }),
      field("createdAt", "createdAt", "dateTime", { form_visible: 0, list_visible: 0, disabled: 1 }),
    ],
    lookups: [{ lookup_key: "roles", depends_on: null }, { lookup_key: "permissions", depends_on: null }],
  },
  taxes: {
    table: { table_name: "taxes", label: "Taxes", singular_label: "Tax", form_layout: "drawer", form_columns: 2,
      sections: [{ key: "main", title: "Details" }, { key: "levy", title: "Levy" }] },
    fields: [
      field("id", "ID", "primaryKey", { form_visible: 0 }),
      field("name", "Name", "text", { required: 1, section_key: "main" }),
      field("code", "Code", "text", { editable: 0, section_key: "main", config: { rules: [{ rule: "pattern", value: "^[A-Z]{3}$", message: "Code is three capital letters" }] } }),
      field("rate", "Rate", "number", { section_key: "main", config: { min: 0, max: 100, default: 15 } }),
      field("kind", "Kind", "select", { section_key: "main", config: { options: [{ value: "VAT", label: "VAT" }, { value: "LEVY", label: "Levy" }] } }),
      field("levy_body", "Levy body", "text", { section_key: "levy", config: { visibleWhen: { field: "kind", in: ["LEVY"] }, requiredWhen: { field: "kind", in: ["LEVY"] } } }),
      field("channels", "Channels", "multiSelect", { section_key: "main", config: { options: [{ value: "SMS", label: "SMS" }, { value: "EMAIL", label: "Email" }] } }),
      field("resource_type", "Resource type", "select", { section_key: "main", config: { options: [{ value: "API_ENDPOINT", label: "API" }, { value: "BROWSER_ROUTE", label: "Route" }] } }),
      field("resource", "Resource", "lookup", { section_key: "main", config: { lookup: "resources_by_type" } }),
    ],
    lookups: [{ lookup_key: "resources_by_type", depends_on: "resource_type" }],
  },
};

const LOOKUPS = {
  roles: [{ value: "Auditor", label: "Auditor" }, { value: "User", label: "User" }],
  permissions: [{ value: "read:reports", label: "read:reports" }],
  resources_by_type: [{ value: "read:x", label: "/api/x" }],
};

let dataProvider;
function renderWithProviders(ui) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}>{ui}</DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

// Opens a select and picks one option, or several for a multi-select.
async function choose(label, ...optionTexts) {
  const item = screen.getByText(label, { selector: "label" }).closest(".ant-form-item");
  const select = item.querySelector(".ant-select");
  await act(async () => { fireEvent.mouseDown(select.querySelector(".ant-select-selector") ?? select); });
  for (const optionText of optionTexts) {
    const option = await waitFor(() => {
      const found = [...document.querySelectorAll(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")]
        .find((element) => element.textContent === optionText);
      expect(found).toBeTruthy();
      return found;
    });
    await act(async () => { fireEvent.click(option); });
  }
}

const typeInto = async (label, value) => {
  const input = screen.getByLabelText(label);
  await act(async () => { fireEvent.change(input, { target: { value } }); });
};
const submit = async (text) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name: text })); }); };

beforeEach(() => {
  dataProvider = {
    custom: vi.fn(async ({ url, payload }) => {
      const [, kind, name] = url.match(/api\/v1\/(metadata|lookups)\/(\w+)/) ?? [];
      if (kind === "metadata") return { data: METADATA[name] };
      if (kind === "lookups") return { data: name === "resources_by_type" && !payload?.parent ? [] : LOOKUPS[name] };
      return { data: null };
    }),
    create: vi.fn(async () => ({ data: { id: 1 } })),
    update: vi.fn(async () => ({ data: { id: 1 } })),
    getList: vi.fn(async () => ({ data: [{ id: 7, role_id: "Auditor", permission: "read:reports" }], total: 1, pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } })),
    deleteOne: vi.fn(async () => ({ data: {} })),
  };
});

afterEach(() => cleanup());

describe("MetadataForm", () => {
  test("adds a record from the metadata: labels, required checks, lookups and the payload", async () => {
    const onSaved = vi.fn();
    renderWithProviders(<MetadataForm table="admin_role_permissions" onSaved={onSaved} />);
    await screen.findByText("Role", { selector: "label" });

    await submit("Add assignment");
    expect(await screen.findByText("Role is required")).toBeTruthy();
    expect(screen.getByText("Permission is required")).toBeTruthy();
    expect(dataProvider.create).not.toHaveBeenCalled();

    await choose("Role", "Auditor");
    await choose("Permission", "read:reports");
    await submit("Add assignment");

    await waitFor(() => expect(dataProvider.create).toHaveBeenCalledWith({
      resource: "admin_role_permissions",
      variables: { role_id: "Auditor", permission: "read:reports" },
      meta: undefined,
    }));
    expect(onSaved).toHaveBeenCalled();
  });

  test("shows the server's field errors under their fields", async () => {
    dataProvider.create.mockRejectedValueOnce(Object.assign(new Error("Validation failed"), {
      details: { errors: { permission: "Permission must be one of the available choices" } },
    }));
    renderWithProviders(<MetadataForm table="admin_role_permissions" />);
    await screen.findByText("Role", { selector: "label" });
    await choose("Role", "User");
    await choose("Permission", "read:reports");
    await submit("Add assignment");

    expect(await screen.findByText("Permission must be one of the available choices")).toBeTruthy();
  });

  test("defaults, sections, rules, conditions and a multi-select on a new record", { timeout: 30_000 }, async () => {
    renderWithProviders(<MetadataForm table="taxes" />);
    await screen.findByText("Details");

    expect(screen.getByLabelText("Rate").value).toBe("15");
    expect(screen.queryByLabelText("Levy body")).toBeNull();

    await typeInto("Name", "Road levy");
    await typeInto("Code", "rd");
    await choose("Kind", "Levy");
    expect(await screen.findByLabelText("Levy body")).toBeTruthy();
    expect(screen.getByText("Levy", { selector: "h5" })).toBeTruthy();

    await submit("Add tax");
    expect(await screen.findByText("Code is three capital letters")).toBeTruthy();
    expect(screen.getByText("Levy body is required")).toBeTruthy();

    await typeInto("Code", "RDL");
    await typeInto("Levy body", "Ministry");
    await choose("Channels", "SMS", "Email");
    await submit("Add tax");

    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(dataProvider.create.mock.calls[0][0].variables).toEqual({
      name: "Road levy", code: "RDL", rate: 15, kind: "LEVY", levy_body: "Ministry",
      channels: ["SMS", "EMAIL"], resource_type: undefined, resource: undefined,
    });
  });

  test("a dependent lookup loads for the chosen parent and clears when the parent changes", { timeout: 30_000 }, async () => {
    renderWithProviders(<MetadataForm table="taxes" />);
    await screen.findByText("Details");

    await choose("Resource type", "API");
    await choose("Resource", "/api/x");
    expect(dataProvider.custom).toHaveBeenCalledWith({ url: "api/v1/lookups/resources_by_type", payload: { parent: "API_ENDPOINT" }, unwrap: true });

    await choose("Resource type", "Route");
    const resourceItem = screen.getByText("Resource", { selector: "label" }).closest(".ant-form-item");
    await waitFor(() => expect(within(resourceItem).queryByText("/api/x")).toBeNull());
  });

  test("editing fills the record, keeps fields that are not editable read-only, and updates by primary key", async () => {
    renderWithProviders(<MetadataForm table="taxes" record={{ id: 4, name: "VAT", code: "VAT", rate: 15, kind: "VAT", channels: "SMS,EMAIL" }} />);
    await screen.findByText("Details");

    expect(screen.getByLabelText("Name").value).toBe("VAT");
    expect(screen.getByLabelText("Code").disabled).toBe(true);
    await typeInto("Rate", "12.5");
    await submit("Save changes");

    await waitFor(() => expect(dataProvider.update).toHaveBeenCalled());
    const { id, variables } = dataProvider.update.mock.calls[0][0];
    expect(id).toBe(4);
    expect(variables).not.toHaveProperty("code");
    expect(variables).toMatchObject({ name: "VAT", rate: 12.5, kind: "VAT", channels: ["SMS", "EMAIL"] });
  });
});

describe("MetadataForm typing", () => {
  test("typing re-renders only the field, not the page around the form", async () => {
    const pageRendered = vi.fn();
    function Page() {
      pageRendered();
      return <MetadataForm table="taxes" />;
    }
    renderWithProviders(<Page />);
    await screen.findByText("Details");
    const rendersBeforeTyping = pageRendered.mock.calls.length;

    for (const value of ["R", "Ro", "Roa", "Road", "Road levy"]) await typeInto("Name", value);

    expect(pageRendered.mock.calls.length).toBe(rendersBeforeTyping);
    expect(screen.getByLabelText("Name").value).toBe("Road levy");
  });
});

describe("MetadataTable", () => {
  const signInAs = (roles, permissions = []) => {
    useAuthStore.setState({ roles, permissions });
    useResourceStore.setState({ isReady: true });
  };

  test("lists the list-visible columns with the page's overrides, and opens the add form", async () => {
    signInAs([{ role_id: "superadmin" }]);
    renderWithProviders(
      <MetadataTable table="admin_role_permissions" columns={{ permission: { title: "Inherited permission" } }} addLabel="Assign permission" />,
    );

    expect(await screen.findByText("Inherited permission")).toBeTruthy();
    expect(await screen.findByText("read:reports")).toBeTruthy();
    expect(screen.queryByText("createdAt")).toBeNull();

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /assign permission/i })); });
    expect(await screen.findByText("Role", { selector: "label" })).toBeTruthy();
  }, 30_000);

  test("hides add, edit and delete from a user without those permissions", async () => {
    signInAs([{ role_id: "User" }], ["read:admin_role_permissions"]);
    renderWithProviders(<MetadataTable table="admin_role_permissions" />);

    expect(await screen.findByText("read:reports", {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /add assignment/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit assignment/i })).toBeNull();
  }, 30_000);
});

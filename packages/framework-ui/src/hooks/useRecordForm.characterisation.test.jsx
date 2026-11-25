// Safety net for the metadata upgrade: what useRecordForm shows for the admin
// tables, from their live metadata rows. Since phase 4 useRecordForm is a
// thin wrapper over MetadataForm (one form engine); the snapshots below were
// compared field by field with the previous engine's when it was replaced.

import { useEffect } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import adminTablesMetadata from "../../../framework-server/tests/fixtures/adminTablesMetadata.v2.json";
import { DataProviderContext } from "../core/provider/DataProvider";
import useRecordForm from "./useRecordForm";

const SYSTEM_RESOURCE_TYPES = [{ value: "API_ENDPOINT", label: "API_ENDPOINT" }, { value: "BROWSER_ROUTE", label: "BROWSER_ROUTE" }];

// What GET /api/v1/metadata/:table returns for an admin table.
function tableMetadata(table) {
  const fields = adminTablesMetadata.filter((field) => field.table_name === table);
  const lookupKeys = [...new Set(fields.map((field) => field.config?.lookup).filter(Boolean))];
  return {
    table: { table_name: table, label: table, singular_label: null, form_layout: "modal", form_columns: 1, sections: [] },
    fields,
    lookups: lookupKeys.map((lookup_key) => ({ lookup_key, depends_on: null })),
  };
}

function createDataProvider() {
  return {
    custom: vi.fn(async ({ url }) => {
      const [, kind, name] = url.match(/api\/v1\/(metadata|lookups)\/(\w+)/) ?? [];
      if (kind === "metadata") return { data: tableMetadata(name) };
      if (kind === "lookups") return { data: name === "resource_types" ? SYSTEM_RESOURCE_TYPES : [] };
      return { data: null };
    }),
    create: vi.fn(async () => ({ data: { id: 1 } })),
    update: vi.fn(async () => ({ data: { id: 1 } })),
  };
}

function RecordFormHarness({ table, existingRecord, onRender }) {
  onRender?.();
  const recordForm = useRecordForm("tables_metadata", "table_name");
  useEffect(() => {
    if (existingRecord) recordForm.openEdit(table, existingRecord, existingRecord.id);
    else recordForm.openCreate(table);
    // Open once, like a page's "Add" or "Edit" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return recordForm.recordModal({ createTitle: "Add", editTitle: "Edit" });
}

async function renderForm(table, existingRecord, { onRender } = {}) {
  const dataProvider = createDataProvider();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}>
          <RecordFormHarness table={table} existingRecord={existingRecord} onRender={onRender} />
        </DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(document.querySelector(".ant-modal-body .ant-form-item")).not.toBeNull());
  return dataProvider;
}

// What a person sees for each field: its label, whether it is marked
// required, the kind of input, whether it can be changed, and its options.
async function describeFields() {
  const fields = [];
  for (const item of document.querySelectorAll(".ant-modal-body .ant-form-item")) {
    const labelElement = item.querySelector(".ant-form-item-label label");
    const select = item.querySelector(".ant-select");
    const input = item.querySelector("input, textarea");
    const field = {
      label: labelElement?.textContent ?? "",
      required: Boolean(labelElement?.classList.contains("ant-form-item-required")),
      control: select ? "select" : item.querySelector("textarea") ? "textarea"
        : item.querySelector(".ant-picker") ? "date" : item.querySelector(".ant-input-number") ? "number"
          : input?.type ?? "other",
      disabled: Boolean(item.querySelector(".ant-select-disabled, input:disabled, textarea:disabled, input[readonly], .ant-picker-disabled")),
    };
    if (select && !field.disabled) {
      // Each select gets its own dropdown; opening it and reading the options
      // that belong to it (toggled closed again afterwards).
      const before = new Set(document.querySelectorAll(".ant-select-dropdown"));
      await act(async () => { fireEvent.mouseDown(select); });
      const dropdown = await waitFor(() => {
        const opened = [...document.querySelectorAll(".ant-select-dropdown")].find((element) => !before.has(element))
          ?? [...document.querySelectorAll(".ant-select-dropdown:not(.ant-select-dropdown-hidden)")].at(-1);
        expect(opened?.querySelector(".ant-select-item-option")).toBeTruthy();
        return opened;
      });
      field.options = [...dropdown.querySelectorAll(".ant-select-item-option")]
        .map((option) => option.getAttribute("title") ?? option.textContent);
      await act(async () => { fireEvent.mouseDown(select); });
    }
    fields.push(field);
  }
  return fields;
}

afterEach(() => cleanup());

const SAMPLE_RECORDS = {
  admin: { id: 3, custom_id: "REG-1", name: "Ama Mensah", email: "ama@example.com", phone_no: "+233241234567", status: 1, forced_password_change: 0 },
  admin_roles: { id: 2, role_name: "Auditor", description: "Reads reports", is_system_role: 0 },
  admin_permissions: { id: 5, permission_name: "read:reports", description: "Read reports", alias: "Read reports" },
  admin_resources: { id: 9, resource: "read:reports", resource_type: "API_ENDPOINT", resource_path: "/api/v1/reports", http_method: "GET", is_public: 0, display_order: 1, category: "Reports", show_in_nav: 1 },
};

describe.each(Object.keys(SAMPLE_RECORDS))("%s form", (table) => {
  test("adding a record", { timeout: 30_000 }, async () => {
    await renderForm(table);
    expect(await describeFields()).toMatchSnapshot();
  });

  test("editing a record", { timeout: 30_000 }, async () => {
    await renderForm(table, SAMPLE_RECORDS[table]);
    expect(await describeFields()).toMatchSnapshot();
  });
});

test("the resource type options come from the named lookup, not from SQL", async () => {
  const dataProvider = await renderForm("admin_resources");
  await waitFor(() => expect(dataProvider.custom).toHaveBeenCalledWith({ url: "api/v1/lookups/resource_types", unwrap: true }));
  expect(dataProvider.custom.mock.calls.some(([request]) => request.url.includes("extra_meta_options"))).toBe(false);
});

describe("typing and saving", () => {
  test("typing does not re-render the page, and saving sends what was typed", { timeout: 30_000 }, async () => {
    const pageRendered = vi.fn();
    const dataProvider = await renderForm("admin_roles", undefined, { onRender: pageRendered });
    const roleInput = await waitFor(() => {
      const found = document.querySelector('.ant-modal-body input[placeholder="Enter Role"]');
      expect(found).not.toBeNull();
      return found;
    });
    const rendersBeforeTyping = pageRendered.mock.calls.length;

    for (const value of ["A", "Au", "Aud", "Audit", "Auditor"]) {
      await act(async () => { fireEvent.change(roleInput, { target: { value } }); });
    }
    expect(pageRendered.mock.calls.length).toBe(rendersBeforeTyping);

    await act(async () => { fireEvent.click(document.querySelector(".ant-modal-footer .ant-btn-primary")); });
    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(dataProvider.create.mock.calls[0][0]).toMatchObject({ resource: "admin_roles", variables: { role_name: "Auditor" } });
  });

  test("the modal's OK does not save an incomplete record", { timeout: 30_000 }, async () => {
    const dataProvider = await renderForm("admin_roles");
    await act(async () => { fireEvent.click(document.querySelector(".ant-modal-footer .ant-btn-primary")); });
    await waitFor(() => expect(document.body.textContent).toContain("Role is required"));
    expect(dataProvider.create).not.toHaveBeenCalled();
  });
});

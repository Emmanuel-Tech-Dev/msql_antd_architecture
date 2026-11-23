// Safety net for the metadata upgrade (phase 0): what useRecordForm renders
// today for the admin tables, from their saved metadata rows. Phase 4 moves
// these forms to MetadataForm and must show the same fields (or better).

import { useEffect } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import adminTablesMetadata from "../../../server/tests/fixtures/adminTablesMetadata.json";
import adminTablesMetadataV2 from "../../../server/tests/fixtures/adminTablesMetadata.v2.json";
import { DataProviderContext } from "../core/provider/DataProvider";
import { useStore as useValuesStore } from "../store/values-store";
import useRecordForm from "./useRecordForm";

const SYSTEM_RESOURCE_TYPES = [{ resource_type: "API_ENDPOINT" }, { resource_type: "BROWSER_ROUTE" }];
// The lookup keys and dependencies startup loads (migration 020).
const METADATA_LOOKUPS = [
  { lookup_key: "roles", depends_on: null },
  { lookup_key: "permissions", depends_on: null },
  { lookup_key: "users", depends_on: null },
  { lookup_key: "resource_types", depends_on: null },
  { lookup_key: "resources_by_type", depends_on: "resource_type" },
];
const LOOKUP_OPTIONS = {
  resource_types: SYSTEM_RESOURCE_TYPES.map(({ resource_type }) => ({ value: resource_type, label: resource_type })),
  resources_by_type: [{ value: "read:reports", label: "/api/v1/reports" }],
};

function RecordFormHarness({ table, existingRecord }) {
  const recordForm = useRecordForm("tables_metadata", "table_name");
  useEffect(() => {
    if (existingRecord) recordForm.openEdit(table, existingRecord, existingRecord.id);
    else recordForm.openCreate(table);
    // Open once, like a page's "Add" or "Edit" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return recordForm.recordModal({ createTitle: "Add", editTitle: "Edit", shouldDrag: false });
}

async function renderForm(table, existingRecord, metadata = adminTablesMetadata) {
  const dataProvider = {
    custom: vi.fn(async ({ url }) => (url.startsWith("/api/v1/lookups/")
      ? { data: LOOKUP_OPTIONS[url.split("/").pop()] ?? [] }
      : { data: { details: SYSTEM_RESOURCE_TYPES } })),
  };
  useValuesStore.getState().setRuntimeValues({ tables_metadata: metadata, metadata_lookups: METADATA_LOOKUPS });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}>
          <RecordFormHarness table={table} existingRecord={existingRecord} />
        </DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );

  await waitFor(() => expect(formFieldWrappers().length).toBeGreaterThan(0));
  return dataProvider;
}

// recordModal renders the form between childrenTop and childrenBottom; each
// child of that container is one field.
const formFieldWrappers = () => [
  ...(document.querySelector(".ant-modal-body .grid > div:nth-child(2)")?.children ?? []),
];

// What a person sees for each field: its label, whether it is marked
// required, the kind of input, and whether it can be changed.
async function describeFields() {
  const fields = [];
  for (const wrapper of formFieldWrappers()) {
    const label = wrapper.querySelector(":scope > span, :scope > label")?.textContent ?? "";
    const select = wrapper.querySelector(".ant-select");
    const input = wrapper.querySelector("input, textarea");
    const field = {
      label: label.replace(/\*?:$/, "").replace(/\*$/, ""),
      required: label.includes("*"),
      control: wrapper.classList.contains("hidden") ? "hidden"
        : select ? "select" : wrapper.querySelector("textarea") ? "textarea"
          : wrapper.querySelector(".ant-picker") ? "date" : wrapper.querySelector('input[type="file"]') ? "upload"
            : input?.type ?? "other",
      disabled: Boolean(wrapper.querySelector(".ant-select-disabled, input:disabled, textarea:disabled, .ant-picker-disabled")),
    };
    if (select) {
      await act(async () => {
        fireEvent.mouseDown(select.querySelector(".ant-select-selector") ?? select);
      });
      field.options = [...document.querySelectorAll(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option")]
        .map((option) => option.getAttribute("title") ?? option.textContent);
      await act(async () => {
        fireEvent.keyDown(select.querySelector("input") ?? select, { key: "Escape" });
      });
    }
    fields.push(field);
  }
  return fields;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const SAMPLE_RECORDS = {
  admin: { id: 3, custom_id: "REG-1", name: "Ama Mensah", email: "ama@example.com", phone_no: "+233241234567", status: 1, forced_password_change: 0 },
  admin_roles: { id: 2, role_name: "Auditor", description: "Reads reports", is_system_role: 0 },
  admin_permissions: { id: 5, permission_name: "read:reports", description: "Read reports", alias: "Read reports" },
  admin_resources: { id: 9, resource: "read:reports", resource_type: "API_ENDPOINT", resource_path: "/api/v1/reports", http_method: "GET", is_public: 0, display_order: 1, category: "Reports", show_in_nav: 1 },
};

describe.each(Object.keys(SAMPLE_RECORDS))("%s form", (table) => {
  test("adding a record", async () => {
    await renderForm(table);
    expect(await describeFields()).toMatchSnapshot();
  });

  test("editing a record shows only the record's fields", async () => {
    await renderForm(table, SAMPLE_RECORDS[table]);
    expect(await describeFields()).toMatchSnapshot();
  });
});

test("the resource type options come from the lookup endpoint, not from SQL run in the browser", async () => {
  const dataProvider = await renderForm("admin_resources");
  await waitFor(() => expect(dataProvider.custom).toHaveBeenCalled());
  expect(dataProvider.custom).toHaveBeenCalledWith({
    url: "/api/v1/extra_meta_options",
    method: "post",
    payload: { lookup: { table: "system_resources", fields: ["resource_type"] } },
    unwrap: true,
  });
});

describe("metadata v2 (migration 020)", () => {
  test.each(Object.keys(SAMPLE_RECORDS))("%s renders the same forms from the converted metadata", async (table) => {
    for (const existingRecord of [undefined, SAMPLE_RECORDS[table]]) {
      await renderForm(table, existingRecord);
      const original = await describeFields();
      cleanup();
      document.body.innerHTML = "";

      await renderForm(table, existingRecord, adminTablesMetadataV2);
      expect(await describeFields()).toEqual(original);
      cleanup();
      document.body.innerHTML = "";
    }
  }, 30_000);

  test("a lookup is loaded from the lookups endpoint by name", async () => {
    const dataProvider = await renderForm("admin_resources", undefined, adminTablesMetadataV2);
    await waitFor(() => expect(dataProvider.custom).toHaveBeenCalledWith({ url: "/api/v1/lookups/resource_types", unwrap: true }));
    expect(dataProvider.custom.mock.calls.some(([request]) => request.url.includes("extra_meta_options"))).toBe(false);
  });

  test("choosing a resource type loads the resources of that type", async () => {
    const field = (column_name, col_real_name, type, config, rank) => ({
      table_name: "admin_permission_resources", column_name, col_real_name, type, config,
      options: null, extra_options: null, backend_visible: 1, frontend_visible: 1, form_visible: 1,
      list_visible: 1, editable: 1, validator: "", required: 0, disabled: 0, rank,
    });
    const dataProvider = await renderForm("admin_permission_resources", undefined, [
      field("resource_type", "Resource Type", "select", { options: [{ value: "API_ENDPOINT", label: "API_ENDPOINT" }] }, 1),
      field("resource", "Resource", "lookup", { lookup: "resources_by_type" }, 2),
    ]);
    expect(dataProvider.custom).not.toHaveBeenCalled();

    const [typeSelect] = document.querySelectorAll(".ant-modal-body .ant-select");
    await act(async () => { fireEvent.mouseDown(typeSelect.querySelector(".ant-select-selector") ?? typeSelect); });
    const option = await waitFor(() => {
      const found = document.querySelector(".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option");
      expect(found).not.toBeNull();
      return found;
    });
    await act(async () => { fireEvent.click(option); });

    await waitFor(() => expect(dataProvider.custom).toHaveBeenCalledWith({
      url: "/api/v1/lookups/resources_by_type",
      payload: { parent: "API_ENDPOINT" },
      unwrap: true,
    }));
    await waitFor(async () => {
      const fields = await describeFields();
      expect(fields[1]).toMatchObject({ label: "Resource", options: ["/api/v1/reports"] });
    });
  });
});

describe("typing performance", () => {
  test("typing does not re-render the page, and saving sends what was typed", async () => {
    let pageRenders = 0;
    let createRequest;
    function RolesPage() {
      pageRenders += 1;
      const recordForm = useRecordForm("tables_metadata", "table_name");
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => { recordForm.openCreate("admin_roles"); }, []);
      return recordForm.recordModal({ createTitle: "Add", shouldDrag: false });
    }
    const dataProvider = {
      custom: vi.fn(async () => ({ data: [] })),
      create: vi.fn(async (request) => { createRequest = request; return { data: {} }; }),
    };
    useValuesStore.getState().setRuntimeValues({ tables_metadata: adminTablesMetadataV2, metadata_lookups: METADATA_LOOKUPS });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AntdApp>
          <DataProviderContext.Provider value={dataProvider}>
            <RolesPage />
          </DataProviderContext.Provider>
        </AntdApp>
      </QueryClientProvider>,
    );
    const roleInput = await waitFor(() => {
      const found = document.querySelector('.ant-modal-body input[placeholder="Enter Role"]');
      expect(found).not.toBeNull();
      return found;
    });
    await act(async () => { fireEvent.change(roleInput, { target: { value: "A" } }); });
    const rendersAfterFirstKey = pageRenders;

    for (const value of ["Au", "Aud", "Audi", "Audit", "Audito", "Auditor"]) {
      await act(async () => { fireEvent.change(roleInput, { target: { value } }); });
    }
    expect(pageRenders).toBe(rendersAfterFirstKey);

    await act(async () => { fireEvent.click(document.querySelector(".ant-modal-footer .ant-btn-primary")); });
    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(createRequest).toMatchObject({ resource: "admin_roles", variables: { role_name: "Auditor" } });
  });
});

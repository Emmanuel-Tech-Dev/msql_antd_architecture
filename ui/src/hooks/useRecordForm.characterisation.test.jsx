// Safety net for the metadata upgrade (phase 0): what useRecordForm renders
// today for the admin tables, from their saved metadata rows. Phase 4 moves
// these forms to MetadataForm and must show the same fields (or better).

import { useEffect } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import adminTablesMetadata from "../../../server/tests/fixtures/adminTablesMetadata.json";
import { DataProviderContext } from "../core/provider/DataProvider";
import { useStore as useValuesStore } from "../store/values-store";
import useRecordForm from "./useRecordForm";

const SYSTEM_RESOURCE_TYPES = [{ resource_type: "API_ENDPOINT" }, { resource_type: "BROWSER_ROUTE" }];

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

async function renderForm(table, existingRecord) {
  const dataProvider = {
    custom: vi.fn(async () => ({ data: { details: SYSTEM_RESOURCE_TYPES } })),
  };
  useValuesStore.getState().setRuntimeValues({ tables_metadata: adminTablesMetadata });

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

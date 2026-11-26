import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { DataProviderContext } from "../../core/provider/DataProvider";
import MetadataForm from "./MetadataForm";

const field = (column_name, col_real_name, type, overrides = {}) => ({
  column_name, col_real_name, type, form_visible: 1, list_visible: 1, editable: 1, disabled: 0,
  required: 0, section_key: null, col_span: 24, config: null, ...overrides,
});
const METADATA = {
  table: { table_name: "customers", label: "Customers", singular_label: "Customer", form_layout: "modal", form_columns: 1, sections: [] },
  fields: [
    field("id", "ID", "primaryKey", { form_visible: 0 }),
    field("name", "Name", "text", { required: 1 }),
    field("email", "Email", "email"),
    field("internal_score", "Internal score", "number", { disabled: 1 }),
  ],
  lookups: [],
};

let dataProvider;
function renderForm(props) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}><MetadataForm table="customers" {...props} /></DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}
const type = async (label, value) => { await act(async () => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }); };
const click = async (name) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };

beforeEach(() => {
  dataProvider = {
    custom: vi.fn(async () => ({ data: METADATA })),
    create: vi.fn(async () => ({ data: { id: 1 } })),
    update: vi.fn(async () => ({ data: { id: 1 } })),
  };
});
afterEach(() => cleanup());

describe("MetadataForm onSubmit", () => {
  test("saves through your own function, after the same checks, instead of the generic route", { timeout: 20000 }, async () => {
    const onSubmit = vi.fn(async (values) => ({ id: 77, ...values }));
    const onSaved = vi.fn();
    renderForm({ onSubmit, onSaved });
    await screen.findByLabelText("Name");

    await click("Add customer");
    expect(await screen.findByText("Name is required")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await type("Name", "Ama Mensah");
    await type("Email", "ama@example.com");
    await click("Add customer");

    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 5000 });
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ama Mensah", email: "ama@example.com" }, { mode: "create", record: undefined });
    expect(onSaved.mock.calls[0][0]).toEqual({ id: 77, name: "Ama Mensah", email: "ama@example.com" });
    expect(dataProvider.create).not.toHaveBeenCalled();
  });

  test("an error from your route with details.errors is shown under those fields", { timeout: 20000 }, async () => {
    const refused = Object.assign(new Error("Validation failed"), { details: { errors: { email: "This email is already a customer" } } });
    const onSaveError = vi.fn();
    renderForm({ record: { id: 5, name: "Kofi", email: "kofi@example.com" }, onSubmit: vi.fn(async () => { throw refused; }), onSaveError });
    await screen.findByLabelText("Name");

    await click("Save changes");
    expect(await screen.findByText("This email is already a customer")).toBeTruthy();
    expect(onSaveError).toHaveBeenCalledWith(refused);
    expect(dataProvider.update).not.toHaveBeenCalled();
  });
  test("a required multi-value field accepts its list of values", { timeout: 20000 }, async () => {
    const tagsForm = {
      table: { table_name: "articles", label: "Articles", singular_label: "Article", form_layout: "modal", form_columns: 1, sections: [] },
      fields: [field("topics", "Topics", "checkboxGroup", { required: 1, config: { options: [{ value: "news", label: "News" }, { value: "sport", label: "Sport" }] } })],
      lookups: [],
    };
    dataProvider.custom = vi.fn(async () => ({ data: tagsForm }));
    const onSubmit = vi.fn(async (values) => values);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AntdApp><DataProviderContext.Provider value={dataProvider}><MetadataForm table="articles" onSubmit={onSubmit} /></DataProviderContext.Provider></AntdApp>
      </QueryClientProvider>,
    );
    await screen.findByLabelText("News");
    await click("Add article");
    expect(await screen.findByText("Topics is required")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => { fireEvent.click(screen.getByLabelText("Sport")); });
    await click("Add article");
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ topics: ["sport"] }, expect.anything()), { timeout: 5000 });
  });
});

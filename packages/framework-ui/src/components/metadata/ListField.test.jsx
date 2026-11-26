import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import dayjs from "dayjs";
import { DataProviderContext } from "../../core/provider/DataProvider";
import { getFieldType } from "../../core/metadata/fieldTypes";
import MetadataForm from "./MetadataForm";

const field = (column_name, col_real_name, type, overrides = {}) => ({
  column_name, col_real_name, type, form_visible: 1, list_visible: 1, editable: 1, disabled: 0,
  required: 0, section_key: null, col_span: 24, config: null, ...overrides,
});
const rowField = (column_name, col_real_name, type, overrides = {}) => ({ column_name, col_real_name, type, required: 0, config: null, ...overrides });

const CONTACTS = field("contacts", "Contacts", "list", {
  config: {
    rowLabel: "Contact", addLabel: "Add contact", minRows: 1, maxRows: 2,
    fields: [
      rowField("name", "Name", "text", { required: 1 }),
      rowField("channel", "Channel", "select", { config: { options: [{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }] } }),
    ],
  },
});
const PRICES = field("price_list", "Price list", "groupList", {
  config: {
    rowLabel: "Category", addLabel: "Add category",
    fields: [rowField("name", "Category name", "text", { required: 1 })],
    children: { key: "items", label: "Items", rowLabel: "Item", fields: [rowField("item", "Item", "text", { required: 1 }), rowField("price", "Price", "money")] },
  },
});
const metadataFor = (fields) => ({
  table: { table_name: "suppliers", label: "Suppliers", singular_label: "Supplier", form_layout: "modal", form_columns: 1, sections: [] },
  fields: [field("id", "ID", "primaryKey", { form_visible: 0 }), field("name", "Name", "text", { required: 1 }), ...fields],
  lookups: [],
});

let dataProvider;
let metadata;
function renderForm(props = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}><MetadataForm table="suppliers" {...props} /></DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}
const click = async (name) => { await act(async () => { fireEvent.click(screen.getByRole("button", { name })); }); };
const type = async (input, value) => { await act(async () => { fireEvent.change(input, { target: { value } }); }); };

beforeEach(() => {
  dataProvider = {
    custom: vi.fn(async () => ({ data: metadata })),
    create: vi.fn(async () => ({ data: { id: 1 } })),
    update: vi.fn(async () => ({ data: { id: 1 } })),
  };
});
afterEach(() => cleanup());

describe("list fields in MetadataForm", () => {
  test("rows are added, checked with each row field's rules and saved as an array", { timeout: 60_000 }, async () => {
    metadata = metadataFor([CONTACTS]);
    renderForm();
    await screen.findByText("No contacts yet.");
    await type(screen.getAllByLabelText("Name")[0], "Kumasi Office Supplies");

    await click("Add supplier");
    expect(await screen.findByText("Contacts needs at least 1 contact")).toBeTruthy();

    // The test screen is narrow, so rows show as cards.
    await click(/Add contact/);
    const row = screen.getByRole("region", { name: "Contact 1" });
    await click("Add supplier");
    expect(await within(row).findByText("Name is required")).toBeTruthy();

    await type(within(row).getByLabelText("Name"), "Ama Mensah");
    await click(/Add contact/);
    expect(screen.getByRole("button", { name: /Add contact/ }).disabled).toBe(true);
    await click("Remove contact 2");
    await click("Add supplier");

    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(dataProvider.create.mock.calls[0][0].variables).toEqual({ name: "Kumasi Office Supplies", contacts: [{ name: "Ama Mensah" }] });
  });

  test("the only row can be removed even with minRows; the minimum is checked on save", { timeout: 60_000 }, async () => {
    metadata = metadataFor([CONTACTS]);
    renderForm();
    await type((await screen.findAllByLabelText("Name"))[0], "Kumasi Office Supplies");
    await click(/Add contact/);
    await click("Remove contact 1");
    expect(screen.getByText("No contacts yet.")).toBeTruthy();

    await click("Add supplier");
    expect(await screen.findByText("Contacts needs at least 1 contact")).toBeTruthy();
    expect(dataProvider.create).not.toHaveBeenCalled();
  });

  test("a stored JSON value opens as rows and saves back", async () => {
    metadata = metadataFor([CONTACTS]);
    renderForm({ record: { id: 4, name: "Tema Packaging", contacts: JSON.stringify([{ name: "Efua Owusu", channel: "phone", stray: 1 }]) } });
    const row = await screen.findByRole("region", { name: "Contact 1" });
    expect(within(row).getByLabelText("Name").value).toBe("Efua Owusu");

    await click("Save changes");
    await waitFor(() => expect(dataProvider.update).toHaveBeenCalled());
    expect(dataProvider.update.mock.calls[0][0].variables.contacts).toEqual([{ name: "Efua Owusu", channel: "phone" }]);
  });

  test("a groupList holds groups, each with its own inner list", { timeout: 60_000 }, async () => {
    metadata = metadataFor([PRICES]);
    renderForm();
    await type((await screen.findAllByLabelText("Name"))[0], "Kumasi Office Supplies");
    await click(/Add category/);
    const category = screen.getByRole("region", { name: "Category 1" });
    await type(within(category).getByLabelText("Category name"), "Stationery");
    await act(async () => { fireEvent.click(within(category).getByRole("button", { name: /Add item/ })); });
    await type(within(category).getByLabelText("Item"), "A4 paper");
    await type(within(category).getByLabelText("Price"), "58");
    await click("Add supplier");

    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(dataProvider.create.mock.calls[0][0].variables.price_list).toEqual([{ name: "Stationery", items: [{ item: "A4 paper", price: 58 }] }]);
  });

  test("row values go through their own types: dates become dayjs in the form and text again on save", () => {
    const list = field("visits", "Visits", "list", { config: { fields: [rowField("on", "On", "date"), rowField("note", "Note", "text")] } });
    const definition = getFieldType("list");
    const inForm = definition.toForm('[{"on":"2026-11-25","note":"Delivered","extra":true}]', list);
    expect(dayjs.isDayjs(inForm[0].on)).toBe(true);
    expect(inForm[0]).not.toHaveProperty("extra");
    expect(definition.fromForm(inForm, list)).toEqual([{ on: "2026-11-25", note: "Delivered" }]);
  });
});

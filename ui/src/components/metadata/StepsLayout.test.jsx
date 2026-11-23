import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import { DataProviderContext } from "../../core/provider/DataProvider";
import MetadataForm from "./MetadataForm";

const field = (column_name, col_real_name, type, section_key, overrides = {}) => ({
  column_name, col_real_name, type, section_key, form_visible: 1, list_visible: 1, editable: 1, disabled: 0,
  required: 0, col_span: 12, config: null, ...overrides,
});

const supplierMetadata = (stepper) => ({
  table: {
    table_name: "suppliers", label: "Suppliers", singular_label: "Supplier", title_column: "name",
    form_layout: "modal", form_columns: 2,
    sections: [
      { key: "details", title: "Details", description: "Who the supplier is", icon: "ShopOutlined" },
      { key: "address", title: "Address", description: "Where they deliver from", icon: "EnvironmentOutlined" },
      { key: "terms", title: "Terms", description: "How you pay them", icon: "FileTextOutlined" },
    ],
    stepper,
  },
  fields: [
    field("id", "ID", "primaryKey", null, { form_visible: 0 }),
    field("name", "Supplier name", "text", "details", { required: 1 }),
    field("category", "Category", "select", "details", { config: { display: "chips", options: [{ value: "RAW", label: "Raw materials" }, { value: "LOGISTICS", label: "Logistics" }] } }),
    field("city", "City", "text", "address", { required: 1 }),
    field("payment_terms", "Payment terms", "select", "terms", { required: 1, config: { display: "cards", options: [{ value: "COD", label: "On delivery", description: "Pay when goods arrive" }, { value: "NET30", label: "30 days", description: "Most common" }] } }),
    field("credit_limit", "Credit limit", "money", "terms", { config: { currency: "GHS" } }),
  ],
  lookups: [],
});

let dataProvider;
let metadata;
const narrowMatchMedia = window.matchMedia;
// A desktop-width screen: below the md breakpoint the stepper switches to its
// compact variant (no step cards or summary).
const desktopMatchMedia = (query) => ({ ...narrowMatchMedia(query), matches: /min-width/.test(query) });
function renderForm(props = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AntdApp>
        <DataProviderContext.Provider value={dataProvider}>
          <MetadataForm table="suppliers" {...props} />
        </DataProviderContext.Provider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

const typeInto = async (label, value) => {
  await act(async () => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); });
};
const press = async (name) => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
};
const stepCard = (title) => screen.getByText(title, { selector: "ol span" }).closest("li");

beforeEach(() => {
  window.matchMedia = desktopMatchMedia;
  metadata = supplierMetadata({ variant: "horizontal", showSummary: true });
  dataProvider = {
    custom: vi.fn(async ({ url }) => ({ data: url.includes("api/v1/metadata/") ? metadata : [] })),
    create: vi.fn(async () => ({ data: { id: 1 } })),
    update: vi.fn(async () => ({ data: { id: 1 } })),
  };
});

afterEach(() => {
  cleanup();
  window.matchMedia = narrowMatchMedia;
});

describe("stepper form", () => {
  test("shows one step at a time and checks only that step before continuing", { timeout: 30_000 }, async () => {
    renderForm();
    expect(await screen.findByLabelText("Supplier name")).toBeTruthy();
    expect(screen.queryByLabelText("City")).toBeNull();
    expect(screen.getByText("STEP 1 OF 3")).toBeTruthy();

    await press(/continue to address/i);
    expect(await screen.findByText("Supplier name is required")).toBeTruthy();
    expect(screen.queryByLabelText("City")).toBeNull();

    await typeInto("Supplier name", "Kumasi Timber Works");
    await act(async () => { fireEvent.click(screen.getByLabelText("Raw materials")); });
    await press(/continue to address/i);

    expect(await screen.findByLabelText("City")).toBeTruthy();
    expect(within(stepCard("Details")).getByText("DONE")).toBeTruthy();
    expect(within(stepCard("Address")).getByText("NOW")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
  });

  test("Back keeps what was typed, and saving on the last step sends every step's values", { timeout: 30_000 }, async () => {
    const onSaved = vi.fn();
    renderForm({ onSaved });
    await screen.findByLabelText("Supplier name");
    await typeInto("Supplier name", "Kumasi Timber Works");
    await press(/continue to address/i);
    await typeInto("City", "Kumasi");

    await press(/^back$/i);
    expect(screen.getByLabelText("Supplier name").value).toBe("Kumasi Timber Works");
    await press(/continue to address/i);
    expect(screen.getByLabelText("City").value).toBe("Kumasi");
    await press(/continue to terms/i);

    expect(await screen.findByText("GHS")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByLabelText(/30 days/)); });
    await press(/add supplier/i);

    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
    expect(dataProvider.create.mock.calls[0][0].variables).toEqual({
      name: "Kumasi Timber Works", category: undefined, city: "Kumasi", payment_terms: "NET30", credit_limit: undefined,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  test("Enter in a field continues to the next step instead of saving", { timeout: 30_000 }, async () => {
    renderForm();
    await screen.findByLabelText("Supplier name");
    await typeInto("Supplier name", "Kumasi Timber Works");
    await act(async () => { fireEvent.keyDown(screen.getByLabelText("Supplier name"), { key: "Enter" }); });

    expect(await screen.findByLabelText("City")).toBeTruthy();
    expect(dataProvider.create).not.toHaveBeenCalled();
  });

  test("a server error opens the step holding the field and shows the message under it", { timeout: 30_000 }, async () => {
    dataProvider.create.mockRejectedValueOnce(Object.assign(new Error("Validation failed"), {
      details: { errors: { name: "A supplier with this name already exists" } },
    }));
    renderForm();
    await screen.findByLabelText("Supplier name");
    await typeInto("Supplier name", "Kumasi Timber Works");
    await press(/continue to address/i);
    await typeInto("City", "Kumasi");
    await press(/continue to terms/i);
    await act(async () => { fireEvent.click(await screen.findByLabelText(/On delivery/)); });
    await press(/add supplier/i);

    expect(await screen.findByText("A supplier with this name already exists")).toBeTruthy();
    expect(screen.getByLabelText("Supplier name")).toBeTruthy();
    expect(within(stepCard("Details")).getByText("FIX")).toBeTruthy();
  });

  test("the summary shows earlier steps' values, and the review step lists every answer", { timeout: 30_000 }, async () => {
    metadata = supplierMetadata({ variant: "vertical", showSummary: true, showReview: true });
    renderForm();
    await screen.findByLabelText("Supplier name");
    await typeInto("Supplier name", "Kumasi Timber Works");
    await act(async () => { fireEvent.click(screen.getByLabelText("Raw materials")); });
    await press(/continue to address/i);

    const summary = await screen.findByRole("complementary", { name: "Summary" });
    expect(within(summary).getByText("Kumasi Timber Works")).toBeTruthy();
    expect(within(summary).getByText("Raw materials")).toBeTruthy();

    await typeInto("City", "Kumasi");
    await press(/continue to terms/i);
    await act(async () => { fireEvent.click(await screen.findByLabelText(/30 days/)); });
    await press(/^review$/i);

    expect(await screen.findByRole("heading", { name: "Review" })).toBeTruthy();
    expect(screen.getByText("Kumasi")).toBeTruthy();
    expect(screen.getAllByText("Not provided").length).toBe(1);
    expect(dataProvider.create).not.toHaveBeenCalled();

    await press(/add supplier/i);
    await waitFor(() => expect(dataProvider.create).toHaveBeenCalled());
  });

  test("on a narrow screen the stepper switches to its compact variant", { timeout: 30_000 }, async () => {
    window.matchMedia = narrowMatchMedia;
    renderForm();
    await screen.findByLabelText("Supplier name");
    expect(screen.getByRole("progressbar", { name: "Step 1 of 3" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Summary" })).toBeNull();
  });

  test("editing a record: fields are filled, any step can be opened, and saving updates it", { timeout: 30_000 }, async () => {
    const onSaved = vi.fn();
    renderForm({ onSaved, record: { id: 7, name: "Kumasi Timber Works", category: "RAW", city: "Kumasi", payment_terms: "NET30", credit_limit: 5000 } });
    expect((await screen.findByLabelText("Supplier name")).value).toBe("Kumasi Timber Works");
    await act(async () => { fireEvent.click(within(stepCard("Terms")).getByRole("button")); });
    expect(await screen.findByLabelText(/30 days/)).toBeTruthy();
    await press(/save changes/i);
    await waitFor(() => expect(dataProvider.update).toHaveBeenCalled());
    expect(dataProvider.update.mock.calls[0][0]).toMatchObject({ id: 7, variables: { name: "Kumasi Timber Works", city: "Kumasi", payment_terms: "NET30", credit_limit: 5000 } });
    expect(onSaved).toHaveBeenCalled();
  });

  test("a table without a stepper keeps the plain form", async () => {
    metadata = supplierMetadata(null);
    renderForm();
    expect(await screen.findByLabelText("Supplier name")).toBeTruthy();
    expect(screen.getByLabelText("City")).toBeTruthy();
    expect(screen.queryByText(/STEP 1 OF/)).toBeNull();
  });
});

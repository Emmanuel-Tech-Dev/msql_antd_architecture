import { createContext, useContext } from "react";

/*
  Every data provider must implement this shape.
  meta is passed through untouched — each provider
  reads only the meta fields it understands.

  Expected return shapes:
    getList   → { data: [], total: number }
    getOne    → { data: {} }
    create    → { data: {} }
    update    → { data: {} }
    deleteOne → { data: {} }
    getMany   → { data: [] }
    custom    → { data: any }
*/

export const DATA_PROVIDER_INTERFACE = [
  "getList",
  "getOne",
  "create",
  "update",
  "deleteOne",
  "getMany",
  "custom",
];

export function validateProvider(provider, name = "dataProvider") {
  DATA_PROVIDER_INTERFACE.forEach((method) => {
    if (typeof provider[method] !== "function") {
      throw new Error(
        `[Framework] ${name} is missing required method: "${method}"`,
      );
    }
  });
}

export const DataProviderContext = createContext(null);

export function useDataProvider() {
  const ctx = useContext(DataProviderContext);
  if (!ctx) {
    throw new Error(
      "[Framework] useDataProvider must be used inside FrameworkProvider",
    );
  }
  return ctx;
}

// src/core/providers/ResourceProvider.js

import { createContext, useContext } from "react";
import { create } from "zustand";

export const useResourceStore = create((set, get) => ({
  // JS resource configs keyed by resource name
  resources: {},
  // BROWSER_ROUTE rows from admin_resources — drives sidebar + route guard
  browserRoutes: [],
  isReady: false,

  setRegistry: ({ resources, browserRoutes }) => {
    set({ resources, browserRoutes, isReady: true });
  },

  getResource: (name) => get().resources[name] ?? null,
  getBrowserRoutes: () => get().browserRoutes,
}));

export function mergeResources(jsResources = [], adminResources = []) {
  // JS config keyed by name for O(1) lookup
  const resources = jsResources.reduce((acc, r) => {
    acc[r.name] = {
      name: r.name,
      label: r.label ?? r.name,
      meta: r.meta ?? {},
    };
    return acc;
  }, {});

  // Only browser routes — API endpoint auth is the server's concern
  const browserRoutes = adminResources
    .filter((r) => r.resource_type === "BROWSER_ROUTE")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return { resources, browserRoutes };
}

export const ResourceProviderContext = createContext(null);

export function useResourceProvider() {
  const ctx = useContext(ResourceProviderContext);
  if (!ctx) {
    throw new Error(
      "[Framework] useResourceProvider must be used inside FrameworkProvider",
    );
  }
  return ctx;
}

export function useResource(name) {
  return useResourceStore((s) => s.getResource(name));
}

export function useBrowserRoutes() {
  return useResourceStore((s) => s.getBrowserRoutes());
}

export function useResourcesReady() {
  return useResourceStore((s) => s.isReady);
}

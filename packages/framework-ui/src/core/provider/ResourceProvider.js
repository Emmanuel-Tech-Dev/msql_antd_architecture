// src/core/providers/ResourceProvider.js

import { createContext, useContext, useMemo } from "react";
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
  resetRegistry: () => set({ resources: {}, browserRoutes: [], isReady: false }),

  getResource: (name) => get().resources[name] ?? null,
  getBrowserRoutes: () => get().browserRoutes,
}));

export function mergeResources(jsResources = [], adminResources = []) {
  // JS config keyed by name for O(1) lookup
  const resources = jsResources.reduce((acc, r) => {
    acc[r.name] = {
      ...r,
      name: r.name,
      label: r.label ?? r.name,
      permissions: { ...(r.permissions ?? {}) },
      meta: r.meta ?? {},
    };
    return acc;
  }, {});

  // Only browser routes — API endpoint auth is the server's concern
  const browserRoutes = adminResources
    .filter((r) => r.resource_type === "BROWSER_ROUTE")
    .sort(
      (a, b) =>
        (a.order ?? a.display_order ?? 0) -
        (b.order ?? b.display_order ?? 0),
    );

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

export function isRouteVisibleInNav(route) {
  return route?.show_in_nav === true || Number(route?.show_in_nav) === 1;
}

export function useNavigationRoutes() {
  const browserRoutes = useBrowserRoutes();
  return useMemo(
    () => browserRoutes.filter(isRouteVisibleInNav),
    [browserRoutes],
  );
}

export function useResourcesReady() {
  return useResourceStore((s) => s.isReady);
}

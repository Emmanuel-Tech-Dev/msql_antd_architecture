import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../provider/DataProvider";

// The metadata builder's API (Settings › Data model, manage:metadata).
const BASE = "api/v1/metadata-admin";
const KEY = "metadata-admin";

function useAdminQuery(path, { enabled = true } = {}) {
  const dataProvider = useDataProvider();
  return useQuery({
    queryKey: [KEY, path],
    queryFn: async () => (await dataProvider.custom({ url: `${BASE}/${path}`, unwrap: true })).data,
    enabled: Boolean(path) && enabled,
  });
}

// A write that refreshes the builder's lists and the runtime's metadata, so
// forms and lists pick a saved change up straight away.
function useAdminMutation(method = "post") {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, payload }) => {
      const { raw } = await dataProvider.custom({ url: `${BASE}/${path}`, method, payload });
      return { message: raw?.message, data: raw?.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ["metadata"] });
      queryClient.invalidateQueries({ queryKey: ["lookup"] });
    },
  });
}

export const useMetadataTables = () => useAdminQuery("tables");
export const useTableDefinition = (table, options) => useAdminQuery(table ? `tables/${table}` : null, options);
export const useTableScaffold = (table) => useAdminQuery(table ? `tables/${table}/scaffold` : null);
export const useTableVersions = (table) => useAdminQuery(table ? `tables/${table}/versions` : null);
export const useTableExport = (table, options) => useAdminQuery(table ? `tables/${table}/export` : null, options);
export const useMetadataLookups = () => useAdminQuery("lookups");

export const useSaveDefinition = () => useAdminMutation("put");
export const useRestoreVersion = () => useAdminMutation("post");
export const useSaveLookup = () => useAdminMutation("put");
export const useAdminAction = () => useAdminMutation("post");

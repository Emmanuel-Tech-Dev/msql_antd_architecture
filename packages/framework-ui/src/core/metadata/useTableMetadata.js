import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "../provider/DataProvider";

// A described table: { table, fields, lookups } from GET /api/v1/metadata/:table.
export function useTableMetadata(table) {
  const dataProvider = useDataProvider();
  return useQuery({
    queryKey: ["metadata", table],
    queryFn: async () => {
      const { data } = await dataProvider.custom({ url: `api/v1/metadata/${table}`, unwrap: true });
      return data;
    },
    enabled: Boolean(table),
    staleTime: 60_000,
  });
}

// Options of a named lookup. A dependent lookup waits for its parent value.
export function useLookupOptions(lookupKey, { dependsOn, parent } = {}) {
  const dataProvider = useDataProvider();
  const waitingForParent = Boolean(dependsOn) && (parent === undefined || parent === null || parent === "");
  return useQuery({
    queryKey: ["lookup", lookupKey, dependsOn ? parent : null],
    queryFn: async () => {
      const { data } = await dataProvider.custom({
        url: `api/v1/lookups/${lookupKey}`,
        ...(dependsOn ? { payload: { parent } } : {}),
        unwrap: true,
      });
      return data ?? [];
    },
    enabled: Boolean(lookupKey) && !waitingForParent,
    staleTime: 60_000,
  });
}

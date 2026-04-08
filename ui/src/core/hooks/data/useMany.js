// src/core/hooks/data/useMany.js

import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "../../providers/DataProvider";
import queryKeys from "../../queryKeys";

const useMany = ({ resource, ids, meta, queryOptions = {} }) => {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.many(resource, ids),
    queryFn: () => dataProvider.getMany({ resource, ids, meta }),
    enabled: !!resource && !!ids?.length,
    ...queryOptions,
  });
};

export default useMany;

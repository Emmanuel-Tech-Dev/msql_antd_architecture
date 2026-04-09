// src/core/hooks/data/useList.js

import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

const useList = ({
  resource,
  pagination,
  filters,
  sorters,
  meta,
  queryOptions = {},
}) => {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.list(resource, { pagination, filters, sorters }),
    queryFn: () =>
      dataProvider.getList({ resource, pagination, filters, sorters, meta }),
    enabled: !!resource,
    ...queryOptions,
  });
};

export default useList;

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

  const query = useQuery({
    queryKey: queryKeys.list(resource, { pagination, filters, sorters }),
    queryFn: () =>
      dataProvider.getList({ resource, pagination, filters, sorters, meta }),
    enabled: !!resource,
    ...queryOptions,
  });

  return query;
};

export default useList;

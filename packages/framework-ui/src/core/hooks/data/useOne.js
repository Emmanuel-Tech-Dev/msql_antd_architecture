// src/core/hooks/data/useOne.js

import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

const useOne = ({ resource, id, meta, queryOptions = {} }) => {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.one(resource, id),
    queryFn: () => dataProvider.getOne({ resource, id, meta }),
    enabled: !!resource && id !== undefined && id !== null,
    ...queryOptions,
  });
};

export default useOne;

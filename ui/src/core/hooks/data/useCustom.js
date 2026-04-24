// src/core/hooks/data/useCustom.js

import { useQuery, useMutation } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

export const useCustom = ({
  url,
  method = "get",
  payload,
  headers,
  meta,
  queryOptions = {},
}) => {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.custom(url, payload),
    queryFn: () => dataProvider.custom({ url, method, payload, headers, meta }),
    enabled: !!url,
    ...queryOptions,
  });
};

export const useCustomMutation = ({ mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();

  return useMutation({
    mutationFn: ({ url, method = "post", payload, headers, meta }) =>
      dataProvider.custom({ url, method, payload, headers, meta }),

    onSuccess: (data, variables, context) => {
      // console.log("mutation onSuccess fired", data);
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      //  console.log("mutation onSuccess fired", error);
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

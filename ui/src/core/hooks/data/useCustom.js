// src/core/hooks/data/useCustom.js

import { useQuery, useMutation } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

export const useCustom = ({
  url,
  method = "get",
  payload,
  headers,
  unwrap = false,
  meta,
  queryOptions = {},
}) => {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.custom(url, method, payload, unwrap),
    queryFn: () => dataProvider.custom({ url, method, payload, headers, unwrap, meta }),
    enabled: !!url,
    ...queryOptions,
  });
};

export const useCustomMutation = ({ mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();

  return useMutation({
    ...mutationOptions,
    mutationFn: ({ url, method = "post", payload, headers, unwrap = false, meta }) =>
      dataProvider.custom({ url, method, payload, headers, unwrap, meta }),

    onSuccess: (data, variables, context) => {
      // console.log("mutation onSuccess fired", data);
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      //  console.log("mutation onSuccess fired", error);
      mutationOptions.onError?.(error, variables, context);
    },
  });
};

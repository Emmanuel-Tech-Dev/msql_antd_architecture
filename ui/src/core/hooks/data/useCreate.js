// src/core/hooks/data/useCreate.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../../providers/DataProvider";
import queryKeys from "../../queryKeys";

const useCreate = ({ resource, meta, mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      dataProvider.create({ resource, variables, meta }),

    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [resource, "list"] });
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useCreate;

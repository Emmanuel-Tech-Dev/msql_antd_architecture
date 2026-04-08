// src/core/hooks/data/useUpdate.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../../providers/DataProvider";
import queryKeys from "../../queryKeys";

const useUpdate = ({ resource, meta, mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, variables }) =>
      dataProvider.update({ resource, id, variables, meta }),

    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [resource, "list"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.one(resource, variables.id),
      });
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },

    ...mutationOptions,
  });
};

export default useUpdate;

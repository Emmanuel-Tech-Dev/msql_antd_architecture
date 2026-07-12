// src/core/hooks/data/useDelete.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

const useDeleteOne = ({ resource, meta, mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    ...mutationOptions,
    mutationFn: (id) => dataProvider.deleteOne({ resource, id, meta }),

    onSuccess: (data, id, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(resource) });
      queryClient.removeQueries({ queryKey: queryKeys.one(resource, id) });
      mutationOptions.onSuccess?.(data, id, context);
    },

    onError: (error, id, context) => {
      mutationOptions.onError?.(error, id, context);
    },
  });
};

export default useDeleteOne;

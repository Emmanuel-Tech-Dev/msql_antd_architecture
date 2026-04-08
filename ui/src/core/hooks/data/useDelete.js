// src/core/hooks/data/useDelete.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../../providers/DataProvider";

const useDeleteOne = ({ resource, meta, mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => dataProvider.deleteOne({ resource, id, meta }),

    onSuccess: (data, id, context) => {
      queryClient.invalidateQueries({ queryKey: [resource, "list"] });
      queryClient.removeQueries({ queryKey: [resource, "detail", id] });
      mutationOptions.onSuccess?.(data, id, context);
    },

    onError: (error, id, context) => {
      mutationOptions.onError?.(error, id, context);
    },

    ...mutationOptions,
  });
};

export default useDeleteOne;

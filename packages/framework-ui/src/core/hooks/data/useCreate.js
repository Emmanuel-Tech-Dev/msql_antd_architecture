import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../../provider/DataProvider";
import queryKeys from "../../queryKeys";

const useCreate = ({ resource, meta, mutationOptions = {} } = {}) => {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    ...mutationOptions,
    mutationFn: (variables) =>
      dataProvider.create({ resource, variables, meta }),

    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lists(resource) });
      mutationOptions.onSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      mutationOptions.onError?.(error, variables, context);
    },
  });
};

export default useCreate;

import { useRequest } from "ahooks";
import { apiRequest } from "../services/apiClient";
import Settings from "../utils/Settings";
import useNotification from "./useNotification";

// hooks/useApi.js
const useApi = (method, url, options = {}) => {
    const { message } = useNotification()

    return useRequest(
        (data) => apiRequest(method, `${Settings.baseUrl}/${url}`, data),
        {
            manual: true,
            onSuccess: (res) => {
                options.successMessage && message.success(options.successMessage);
                options.onSuccess?.(res);
            },
            onError: (err) => {
                message.error(err?.message || 'Something went wrong');
                options.onError?.(err);
            },
            ...options,
        }
    );
};

export default useApi;
import { useRequest } from "ahooks";
import { apiRequest } from "../services/apiClient";
import Settings from "../utils/Settings";
import useNotification from "./useNotification";

// hooks/useApi.js
const useApi = (method, url, options = {}) => {
    const { message } = useNotification();

    return useRequest(
        (data) => apiRequest(method, `${Settings.baseUrl}/${url}`, data),
        {
            manual: true,
            // Pass the original options so ahooks sees them
            ...options,
            onSuccess: (res, params) => {
                // 1. Internal logic (Notifications)
                if (options.successMessage) {
                    message.success(options.successMessage);
                }

                // 2. Manual Trigger: Call the function passed in the options
                // This ensures the code in useBootstrap: (res) => { console.log(res) } runs
                if (options.onSuccess) {
                    options.onSuccess(res, params);
                }
            },
            onError: (err, params) => {
                message.error(err?.message || 'Something went wrong');
                if (options.onError) {
                    options.onError(err, params);
                }
            },
        }
    );
};

export default useApi;
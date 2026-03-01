import axios from "axios";
import Settings from "../utils/Settings";
import { message, notification } from "antd";
import { getAccessToken } from "./token";

let isRefreshing = false; // Track if a token refresh is in progress
let refreshSubscribers = []; // Queue for pending requests

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

const apiClient = axios.create({
  baseURL: Settings.baseUrl,
  // withCredentials: true, // Allow sending cookies with requests
  timeout: 10000,
});

export const apiRequest = async (
  method = "get",
  endpoint,
  data = null,
  config = {},
) => {
  const res = await apiClient({
    url: endpoint,
    method,
    ...(method.toLowerCase() === "get" ? { params: data } : { data }),
    ...config,
  });

  return res?.data;
};

// apiClient.interceptors.request.use(
//   (config) => {
//     const token = getAccessToken();

//     if (!token) {
//       message.error("Fatal system error ! Invalid token");
//       const controller = new AbortController();
//       controller.abort();
//       config.signal = controller.signal;
//       return config;
//     }

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error),
// );

// apiClient.interceptors.response.use(
//   (response) => response, // Pass through successful responses
//   async (error) => {
//     const originalRequest = error.config;

//     // Skip interceptor logic for the refresh token endpoint
//     if (originalRequest.url.includes("/auth/refreshToken")) {
//       return Promise.reject(error);
//     }

//     // Handle 401 Unauthorized errors
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true; // Mark the request as retried

//       if (!isRefreshing) {
//         isRefreshing = true;
//         try {
//           // Call the refresh token route
//           await apiClient.post("/auth/refreshToken");

//           // Notify all pending requests
//           onRefreshed();
//           isRefreshing = false;

//           // Retry the original request
//           return apiClient(originalRequest);
//         } catch (refreshError) {
//           console.error(refreshError.message);
//           isRefreshing = false;
//           refreshSubscribers = [];
//           // Handle failure (e.g., redirect to login)
//           // window.location.href = "/login";
//           return Promise.reject(refreshError);
//         }
//       }

//       // Wait for the ongoing refresh to complete
//       return new Promise((resolve, reject) => {
//         const timeoutId = setTimeout(() => {
//           reject(new Error("Refresh token timeout"));
//           window.location.href = "/";
//         }, 10000);

//         subscribeTokenRefresh(() => {
//           clearTimeout(timeoutId);
//           resolve(apiClient(originalRequest));
//         });
//       });
//     }

//     // if (error.response?.status !== 401) {
//     //   notification.error({
//     //     message: `Error ${error.response?.status ?? "Unknown"}`,
//     //     description: error.response?.data?.message || "Something went wrong",
//     //   });
//     // }

//     return Promise.reject(error);
//   },
// );

export default apiClient;

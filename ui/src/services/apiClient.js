import axios from "axios";

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

const onRefreshFailed = () => {
  refreshSubscribers = [];
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    console.log(error);
    if (original.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      console.log(error);
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const { data } = await apiClient.post("/auth/refresh");
          sessionStorage.setItem("access_token", data.token);
          onRefreshed();
        } catch {
          onRefreshFailed();
          sessionStorage.removeItem("access_token");
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Refresh timeout"));
        }, 10000);

        subscribeTokenRefresh(() => {
          clearTimeout(timeout);
          original.headers.Authorization = `Bearer ${sessionStorage.getItem("access_token")}`;
          resolve(apiClient(original));
        });
      });
    }

    return Promise.reject(error);
  },
);

export const apiRequest = async (
  method = "get",
  url,
  data = null,
  config = {},
) => {
  const res = await apiClient({
    url,
    method,
    ...(method.toLowerCase() === "get" ? { params: data } : { data }),
    ...config,
  });
  return res?.data;
};

export default apiClient;

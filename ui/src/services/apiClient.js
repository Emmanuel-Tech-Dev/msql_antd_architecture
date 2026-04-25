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

    // Never retry auth endpoints — reject immediately so callers get the
    // error right away without being queued behind the subscriber timeout.
    if (
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        // ── This request is the one that will do the refresh. ──────────────
        // After the refresh, we MUST NOT fall through to the subscriber queue
        // because onRefreshed() will have already fired BEFORE the subscriber
        // is registered, meaning the callback is never invoked and the 10 s
        // timeout always fires — that was the root bug.
        isRefreshing = true;

        try {
          const { data } = await apiClient.post("/auth/refresh");
          const newToken = data.token;
          sessionStorage.setItem("access_token", newToken);

          // Notify any requests that queued up while we were refreshing.
          onRefreshed();

          // Directly retry THIS request with the new token.
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        } catch (refreshError) {
          onRefreshFailed();
          sessionStorage.removeItem("access_token");
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // ── A refresh is already in-flight (concurrent 401). ─────────────────
      // Queue this request to be retried once the in-flight refresh resolves.
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Refresh timeout — no response from /auth/refresh"));
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

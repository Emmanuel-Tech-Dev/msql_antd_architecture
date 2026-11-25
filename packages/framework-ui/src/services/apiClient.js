import axios from "axios";
import { toDataProviderError } from "../core/data/contracts";
import useAuthStore from "../store/authStore";
import { frameworkConfig } from "../core/config/frameworkConfig";

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (resolve, reject) =>
  refreshSubscribers.push({ resolve, reject });

const onRefreshed = () => {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve());
  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
};

const apiClient = axios.create({
  withCredentials: true,
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    config.baseURL ??= frameworkConfig.apiUrl || undefined;
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
    if (!original) return Promise.reject(toDataProviderError(error));

    // Never retry auth endpoints — reject immediately so callers get the
    // error right away without being queued behind the subscriber timeout.
    if (
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/google_oauth") ||
      original.url?.includes("/auth/otp/") ||
      original.url?.includes("/auth/refresh") ||
      original.url?.includes("/auth/logout")
    ) {
      return Promise.reject(toDataProviderError(error));
    }

    // Still on an administrator's temporary password: the server allows
    // nothing until it is replaced, so go straight to choosing a new one.
    if (error.response?.data?.errorCode === "ERR_PASSWORD_CHANGE_REQUIRED") {
      if (!window.location.pathname.startsWith("/change_password")) {
        window.location.assign("/change_password?required=1");
      }
      return Promise.reject(toDataProviderError(error));
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
          useAuthStore.getState().setAccessToken(newToken);

          // Notify any requests that queued up while we were refreshing.
          onRefreshed();

          // Directly retry THIS request with the new token.
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        } catch (refreshError) {
          const normalizedError = toDataProviderError(refreshError);
          onRefreshFailed(normalizedError);
          useAuthStore.getState().clearAuth();
          return Promise.reject(normalizedError);
        } finally {
          isRefreshing = false;
        }
      }

      // ── A refresh is already in-flight (concurrent 401). ─────────────────
      // Queue this request to be retried once the in-flight refresh resolves.
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            toDataProviderError(
              new Error("Refresh timeout — no response from /auth/refresh"),
            ),
          );
        }, 10000);

        subscribeTokenRefresh(
          () => {
            clearTimeout(timeout);
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${sessionStorage.getItem("access_token")}`;
            resolve(apiClient(original));
          },
          (refreshError) => {
            clearTimeout(timeout);
            reject(refreshError);
          },
        );
      });
    }

    return Promise.reject(toDataProviderError(error));
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

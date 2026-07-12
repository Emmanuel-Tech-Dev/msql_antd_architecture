import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import { useResourceStore } from "../../provider/ResourceProvider";
import { firstAccessibleRoute } from "../../navigation/routeResolver";

const PUBLIC_SYSTEM_ROUTES = ["/login", "/404"];
const PROTECTED_SYSTEM_ROUTES = ["/admin/404"];

function normalizePath(path) {
  const normalized = String(path || "/").trim();
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function matchesRoute(registeredPath, currentPath) {
  const registered = normalizePath(registeredPath).split("/");
  const current = normalizePath(currentPath).split("/");
  if (registered.length !== current.length) return false;
  return registered.every(
    (segment, index) => segment.startsWith(":") || segment === current[index],
  );
}

const useRouteGuard = (loginPath = "/login") => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const browserRoutes = useResourceStore((state) => state.browserRoutes);
  const registryReady = useResourceStore((state) => state.isReady);
  const currentPath = normalizePath(location.pathname);
  const isReady = !isAuthenticated || registryReady;

  let isAllowed = false;
  let target = null;

  if (PUBLIC_SYSTEM_ROUTES.includes(currentPath)) {
    isAllowed = true;
  } else if (!isAuthenticated) {
    target = loginPath;
  } else if (PROTECTED_SYSTEM_ROUTES.includes(currentPath)) {
    isAllowed = true;
  } else if (!registryReady) {
    isAllowed = false;
  } else if (currentPath === "/admin") {
    target = firstAccessibleRoute(browserRoutes) ?? "/admin/404";
  } else {
    const assignedRoute = browserRoutes.find((route) =>
      matchesRoute(route.resource_path, currentPath),
    );
    if (assignedRoute) isAllowed = true;
    else target = "/admin/404";
  }

  useEffect(() => {
    if (!isReady || isAllowed || !target || currentPath === target) return;
    navigate(target, {
      replace: true,
      state: target === loginPath ? { from: currentPath } : undefined,
    });
  }, [currentPath, isAllowed, isReady, loginPath, navigate, target]);

  return { isAllowed, isReady, target };
};

export default useRouteGuard;

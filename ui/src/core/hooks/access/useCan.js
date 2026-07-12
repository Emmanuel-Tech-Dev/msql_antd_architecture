import useAuthStore from "../../../store/authStore";
import { checkAccess } from "../../provider/AccessProvider";
import { useResourceStore } from "../../provider/ResourceProvider";

const useCan = (request) => {
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const resources = useResourceStore((state) => state.resources);
  const browserRoutes = useResourceStore((state) => state.browserRoutes);
  const isReady = useResourceStore((state) => state.isReady);

  if (typeof request === "string") {
    const privileged = roles.some((role) => {
      const normalized = String(role?.role_id ?? role).trim().toLowerCase();
      return normalized === "superadmin" || normalized === "dev";
    });
    return isReady && (privileged || permissions.includes(request));
  }

  return checkAccess({
    resource: request?.resource,
    action: request?.action,
    roles,
    permissions,
    resources,
    browserRoutes,
    isReady,
  }).can;
};

export default useCan;

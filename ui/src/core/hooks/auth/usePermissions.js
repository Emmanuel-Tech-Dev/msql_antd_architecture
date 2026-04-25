// src/core/hooks/auth/usePermissions.js

import useAuthStore from "../../../store/authStore";

const usePermissions = () => {
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);
  const resources = useAuthStore((s) => s.resources);
  const user = useAuthStore((s) => s.user);

  return { roles, permissions, resources, user };
};

export default usePermissions;

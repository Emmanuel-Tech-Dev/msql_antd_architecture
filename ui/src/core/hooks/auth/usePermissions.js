// src/core/hooks/auth/usePermissions.js

import useAuthStore from "../../../store/authStore";

const usePermissions = () => {
  const roles = useAuthStore((s) => s.roles);
  const permissions = useAuthStore((s) => s.permissions);

  return { roles, permissions };
};

export default usePermissions;

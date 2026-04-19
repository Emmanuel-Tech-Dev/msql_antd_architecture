// src/core/hooks/access/useCan.js

import { useMemo } from "react";
import { useAccessProvider } from "../../providers/AccessProvider";
import useAuthStore from "../../../store/authStore";

/*
  useCan({ resource: 'admin', action: 'create' })
  → { can: boolean, reason?: string }

  Synchronous — no loading state.
  Re-evaluates when authStore permissions change.
*/
const useCan = (permission) => {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions?.includes(permission) ?? false;
};

export default useCan;

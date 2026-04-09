// src/core/hooks/access/useCan.js

import { useMemo } from "react";
import { useAccessProvider } from "../../providers/AccessProvider";

/*
  useCan({ resource: 'admin', action: 'create' })
  → { can: boolean, reason?: string }

  Synchronous — no loading state.
  Re-evaluates when authStore permissions change.
*/
const useCan = ({ resource, action }) => {
  const accessProvider = useAccessProvider();

  return useMemo(
    () => accessProvider.can({ resource, action }),
    [resource, action, accessProvider],
  );
};

export default useCan;

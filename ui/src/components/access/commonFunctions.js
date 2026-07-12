import { useMemo } from "react";

const accessFunctions = {
  assigned(data, setKey) {
    if (!data?.data?.assigned) return null;
    return new Set(data.data.assigned.map((a) => a?.[setKey]));
  },

  assignedSet() {
    const assigned = accessFunctions.assigned(data, "permission");
  },
};

export default accessFunctions;

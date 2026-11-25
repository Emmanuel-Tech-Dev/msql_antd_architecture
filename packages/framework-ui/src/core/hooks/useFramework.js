// src/core/hooks/useFramework.js

import { useContext } from "react";
import { FrameworkContext } from "../provider/FrameworkContext";

const useFramework = () => {
  const ctx = useContext(FrameworkContext);
  if (!ctx) {
    throw new Error(
      "[Framework] useFramework must be used inside FrameworkProvider",
    );
  }
  return ctx;
};

export default useFramework;

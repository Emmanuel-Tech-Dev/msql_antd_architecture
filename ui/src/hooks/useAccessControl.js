import { useState, useEffect, useMemo, useCallback } from "react";
import useApi from "./useApi";
import useNotification from "./useNotification";
import ValuesStore from "../store/values-store";

/**
 * Custom hook for managing access control (permissions, routes, etc.)
 * Handles all business logic: delta tracking, API calls, cache invalidation
 *
 * @param {Object} config - Hook configuration
 * @param {string} config.role - The role name to manage
 * @param {string} config.fetchEndpoint - GET endpoint (e.g., '/access/permissions/:role_name')
 * @param {string} config.saveEndpoint - POST endpoint (e.g., '/access/permissions/save')
 * @param {string} config.storeKey - ValuesStore key (e.g., 'permissions', 'routes')
 * @param {string} config.assignedKey - Key in assigned rows (e.g., 'permission', 'resource')
 * @param {string} config.entityName - Display name (e.g., 'Permissions', 'Routes')
 * @param {string} config.matchKey - Key in store items to match against (default: assignedKey)
 *
 * @returns {Object} Control object with state and handlers
 */
export function useAccessControl({
  role,
  fetchEndpoint,
  saveEndpoint,
  storeKey,
  assignedKey,
  entityName,
  matchKey = assignedKey, // fallback to assignedKey
}) {
  const { message } = useNotification();
  const valuesStore = ValuesStore();

  // ── Fetch currently assigned items ────────────────────────────────────
  const { data, loading, run } = useApi("get", fetchEndpoint);

  useEffect(() => {
    if (role) {
      run();
    }
  }, [role]);

  // ── Original assigned set (from API) ──────────────────────────────────
  const originalAssigned = useMemo(() => {
    if (!data?.data?.assigned) return null;
    return new Set(data.data.assigned.map((a) => a?.[assignedKey]));
  }, [data, assignedKey]);

  // ── All items from values store ───────────────────────────────────────
  const allItems = useMemo(() => {
    return valuesStore.getValue(storeKey) ?? [];
  }, [valuesStore, storeKey]);

  // ── Delta tracking ────────────────────────────────────────────────────
  const [added, setAdded] = useState(() => new Set());
  const [removed, setRemoved] = useState(() => new Set());

  // ── Current assigned set (original + added - removed) ──────────────────
  const assignedSet = useMemo(() => {
    if (!originalAssigned) return new Set();
    const result = new Set(originalAssigned);
    added.forEach((item) => result.add(item));
    removed.forEach((item) => result.delete(item));
    return result;
  }, [originalAssigned, added, removed]);

  const isDirty = added.size > 0 || removed.size > 0;

  // ── Toggle an item ────────────────────────────────────────────────────
  const handleToggle = useCallback((itemKey, enabled) => {
    if (enabled) {
      setAdded((prev) => new Set([...prev, itemKey]));
      setRemoved((prev) => {
        const s = new Set(prev);
        s.delete(itemKey);
        return s;
      });
    } else {
      setRemoved((prev) => new Set([...prev, itemKey]));
      setAdded((prev) => {
        const s = new Set(prev);
        s.delete(itemKey);
        return s;
      });
    }
  }, []);

  // ── Save hook ─────────────────────────────────────────────────────────
  const { run: runSave, loading: saving } = useApi("post", saveEndpoint, {
    onSuccess: () => {
      setAdded(new Set());
      setRemoved(new Set());
      message.success(`${entityName} updated for ${role}`);
      run(); // refetch to sync
    },
    onError: (err) => {
      message.error(`Failed to save ${entityName.toLowerCase()}`);
      console.error("Save error:", err);
    },
  });

  // ── Reset state ───────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setAdded(new Set());
    setRemoved(new Set());
  }, []);

  // ── Save current state ────────────────────────────────────────────────
  const save = useCallback(() => {
    const payload = {
      role,
      [storeKey]: [...assignedSet],
    };
    runSave(payload);
  }, [role, storeKey, assignedSet, runSave]);

  return {
    // State
    loading,
    saving,
    isDirty,
    assignedSet,
    allItems,

    // Handlers
    handleToggle,
    reset,
    save,

    // Expose imperatively for ref
    isItemEnabled: (itemKey) => assignedSet.has(itemKey),
  };
}

export default useAccessControl;

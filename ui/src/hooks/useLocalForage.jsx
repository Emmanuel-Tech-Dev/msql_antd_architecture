// hooks/useLocalForage.js
import { useState, useCallback, useRef } from 'react';
import localforage from 'localforage';

// ─── Driver presets ───────────────────────────────────────────────────────
export const DRIVERS = {
    INDEXEDDB: localforage.INDEXEDDB,
    LOCALSTORAGE: localforage.LOCALSTORAGE,
    WEBSQL: localforage.WEBSQL,
    // fallback chain — tries each in order
    AUTO: [
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE,
    ],
};

const useLocalForage = (storeConfig = {}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ─── Store instance ───────────────────────────────────────────────────
    const storeRef = useRef(null);

    if (!storeRef.current) {
        storeRef.current = Object.keys(storeConfig).length
            ? localforage.createInstance({
                name: 'app',
                storeName: 'default',
                driver: DRIVERS.AUTO, // ✅ default — falls back automatically
                ...storeConfig,
            })
            : localforage;
    }

    const store = storeRef.current;

    // ─── Run wrapper ──────────────────────────────────────────────────────
    const run = useCallback(async (fn) => {
        setLoading(true);
        setError(null);
        try {
            return await fn();
        } catch (err) {
            setError(err?.message || 'Storage error');
            console.error('useLocalForage error:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // ─── Single CRUD ──────────────────────────────────────────────────────
    const getItem = useCallback((key) =>
        run(() => store.getItem(key)), [run, store]);

    const setItem = useCallback((key, value) =>
        run(() => store.setItem(key, value)), [run, store]);

    const updateItem = useCallback((key, changes) =>
        run(async () => {
            const existing = await store.getItem(key);
            if (existing === null) throw new Error(`Key "${key}" does not exist. Use setItem to create it.`);
            const updated = Array.isArray(existing)
                ? [...existing, ...(Array.isArray(changes) ? changes : [changes])]
                : typeof existing === 'object'
                    ? { ...existing, ...changes }
                    : changes;
            return store.setItem(key, updated);
        }), [run, store]);

    const deleteItem = useCallback((key) =>
        run(() => store.removeItem(key)), [run, store]);

    // ─── Bulk ─────────────────────────────────────────────────────────────
    const getItems = useCallback((keyArray) =>
        run(async () => {
            const entries = await Promise.all(
                keyArray.map(async (k) => [k, await store.getItem(k)])
            );
            return Object.fromEntries(entries);
        }), [run, store]);

    const setItems = useCallback((obj) =>
        run(async () => {
            await Promise.all(Object.entries(obj).map(([k, v]) => store.setItem(k, v)));
            return obj;
        }), [run, store]);

    const updateItems = useCallback((obj) =>
        run(async () => {
            await Promise.all(
                Object.entries(obj).map(async ([k, changes]) => {
                    const existing = await store.getItem(k);
                    if (existing === null) throw new Error(`Key "${k}" does not exist.`);
                    const updated = typeof existing === 'object' && !Array.isArray(existing)
                        ? { ...existing, ...changes }
                        : changes;
                    return store.setItem(k, updated);
                })
            );
            return obj;
        }), [run, store]);

    const deleteItems = useCallback((keyArray) =>
        run(async () => {
            await Promise.all(keyArray.map((k) => store.removeItem(k)));
            return keyArray;
        }), [run, store]);

    const getAll = useCallback(() =>
        run(async () => {
            const result = {};
            await store.iterate((value, key) => { result[key] = value; });
            return result;
        }), [run, store]);

    // ─── Store ops ────────────────────────────────────────────────────────
    const clear = useCallback(() => run(() => store.clear()), [run, store]);
    const keys = useCallback(() => run(() => store.keys()), [run, store]);
    const length = useCallback(() => run(() => store.length()), [run, store]);
    const key = useCallback((index) => run(() => store.key(index)), [run, store]);
    const iterate = useCallback((cb) => run(() => store.iterate(cb)), [run, store]);
    const getDriver = useCallback(() => store.driver(), [store]);

    return {
        loading, error,
        getItem, setItem, updateItem, deleteItem,
        getItems, setItems, updateItems, deleteItems,
        getAll, clear, keys, length, key, iterate,
        getDriver,
        store,
    };
};

export default useLocalForage;


//Usage Guide

/*

// ─── Default store ─────────────────────────────────────────────────────────
const storage = useLocalForage();

// ─── Custom isolated store ─────────────────────────────────────────────────
const userStorage   = useLocalForage({ name: 'app', storeName: 'users' });
const cacheStorage  = useLocalForage({ name: 'app', storeName: 'cache' });
const sessionStorage = useLocalForage({ name: 'app', storeName: 'session' });

// ─── setItem / getItem ─────────────────────────────────────────────────────
await storage.setItem('user', { id: 1, name: 'Emmanuel', role: 'admin' });
const user = await storage.getItem('user');

// ─── updateItem — merges ───────────────────────────────────────────────────
await storage.updateItem('user', { name: 'Kusi' });
// → { id: 1, name: 'Kusi', role: 'admin' }

// ─── deleteItem ────────────────────────────────────────────────────────────
await storage.deleteItem('user');

// ─── Bulk setItems ─────────────────────────────────────────────────────────
await storage.setItems({
    'pref:theme': 'dark',
    'pref:lang': 'en',
    'pref:sidebar': true,
});

// ─── Bulk getItems ─────────────────────────────────────────────────────────
const prefs = await storage.getItems(['pref:theme', 'pref:lang']);
// → { 'pref:theme': 'dark', 'pref:lang': 'en' }

// ─── Bulk updateItems ──────────────────────────────────────────────────────
await storage.updateItems({
    'pref:theme': 'light',
    'pref:lang': 'fr',
});

// ─── Bulk deleteItems ──────────────────────────────────────────────────────
await storage.deleteItems(['pref:theme', 'pref:lang']);

// ─── getAll ────────────────────────────────────────────────────────────────
const all = await storage.getAll();
// → { key1: val1, key2: val2, ... }

// ─── Supports all types ────────────────────────────────────────────────────
await storage.setItem('count', 42);
await storage.setItem('config', { theme: 'dark' });
await storage.setItem('photo', blobData);
await storage.setItem('buffer', arrayBufferData);

// ─── Iterate with early exit ───────────────────────────────────────────────
await storage.iterate((value, key, i) => {
    console.log(key, value);
    if (i === 5) return true; // stop early
});

// ─── Keys / length / key by index ─────────────────────────────────────────
const allKeys  = await storage.keys();
const count    = await storage.length();
const firstKey = await storage.key(0);

// ─── Clear store ───────────────────────────────────────────────────────────
await storage.clear();

// ─── Driver in use ─────────────────────────────────────────────────────────
console.log(storage.getDriver()); // 'asyncStorage' = IndexedDB

// ─── Loading + error ───────────────────────────────────────────────────────
const { loading, error } = storage;
{loading && <Spin />}
{error && <Alert type="error" message={error} />}

// ─── Escape hatch ──────────────────────────────────────────────────────────
storage.store.config({ description: 'my store' });


*/
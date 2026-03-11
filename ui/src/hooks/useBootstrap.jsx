import { useEffect, useCallback, useRef, useState } from 'react';
import useValuesStore from '../store/values-store';
import useSettingsStore from '../store/settings-store';
import useNotification from './useNotification';
import { apiRequest } from '../services/apiClient';
import { FireFilled } from '@ant-design/icons';
import { useLocation } from "react-router-dom"

const getFromLS = (key) => {
    try {
        const val = localStorage.getItem(key);
        if (val === null || val === 'null' || val === undefined) return null;
        return JSON.parse(val);
    } catch { return null; }
};

const isValidValue = (val) =>
    val !== null &&
    val !== undefined &&
    val !== '' &&
    !(Array.isArray(val) && val.length === 0);

const useBootstrap = (options = {}) => {
    const { onSuccess, onError } = options;
    const { message } = useNotification();
    const [loading, setLoading] = useState(true)
    const location = useLocation()


    const store = useValuesStore();
    const settingsStore = useSettingsStore();

    const bootstrapConfigs = Object.values(settingsStore).filter(
        (entry) => entry && typeof entry === 'object' && entry.storeName && entry.url
    );

    // console.log("configs ", bootstrapConfigs)

    const bootstrapKeys = bootstrapConfigs.map((c) => c.storeName);
    // console.log("bootstrap keys from congig ", bootstrapKeys)

    const primaryUrl = bootstrapConfigs[0]?.url ?? '';

    const buildPayload = useCallback(() => ({
        tables: bootstrapConfigs.map((config) => ({
            table: config.table,
            storeName: config.storeName,
            critfdx: config.critfdx ?? [],
            critval: config.critval ?? [],
            fields: config.fields ?? ['*'],
            sql: config.sql ?? null,
        })),
    }), [bootstrapConfigs]);

    const hasRun = useRef(false);

    const hydrateStore = useCallback((data) => {
        for (let key of bootstrapKeys) {
            const val = data?.[key]
            if (val !== undefined && val !== null) {
                store.setValue(key, val);
            }
        }
    }, [store, bootstrapKeys]);

    const fetchBootstrap = useCallback(() => {
        if (["/login", "/init_psd_recovery", "/complete_recover_password", "/"].includes(
            location.pathname
        )) {
            setLoading(false)
            return
        }
        apiRequest('post', primaryUrl, buildPayload())
            .then((res) => {
                const data = res?.data;
                hydrateStore(data);
                if (onSuccess) onSuccess(data);
                setLoading(false)
            })
            .catch((err) => {
                console.error('[Bootstrap] fetch failed:', err);
                message.error('Failed to load app data');
                if (onError) onError(err);
                setLoading(false)
            });
    }, [primaryUrl, buildPayload, hydrateStore, onSuccess, onError, message, location]);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        const allInLocalStorage = bootstrapKeys.every((key) =>
            isValidValue(getFromLS(key))
        );

        if (allInLocalStorage) {
            const restored = {};
            for (let key of bootstrapKeys) {
                const val = getFromLS(key);
                if (val) {
                    store.setValue(key, val);
                    restored[key] = val;
                }
            }
            // bootstrapKeys.forEach((key) => {
            //     const val = getFromLS(key);
            //     if (val) {
            //         store.setValue(key, val);
            //         restored[key] = val;
            //     }
            // });
            if (onSuccess) onSuccess(restored);
            return;
        }





        fetchBootstrap();


    }, []);

    const refetch = useCallback(() => {
        bootstrapKeys.forEach((key) => store.deleteValue(key));
        fetchBootstrap();
    }, [store, fetchBootstrap, bootstrapKeys]);

    const isLoaded = useCallback((key) => {
        return isValidValue(getFromLS(key));
    }, []);

    return {
        refetch,
        isLoaded,
        bootstrapConfigs,
        loading
    };
};

export default useBootstrap;
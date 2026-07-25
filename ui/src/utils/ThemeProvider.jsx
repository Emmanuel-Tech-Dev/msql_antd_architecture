import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import { useLocation } from 'react-router-dom';
import { useStore as useValuesStore } from '../store/values-store';
import { DEFAULT_SIDER_CONFIG, resolveSiderConfig } from '../core/config/siderConfig';
import {
    applyVariables,
    createAdsStyle,
    createLegacyVariables,
    getAppearancePalette,
} from './appearanceTokens';

const ThemeCtx = createContext({
    isDark: false,
    mode: 'light',
    scope: 'public',
    configuredMode: 'light',
    hasPreference: false,
    appearance: DEFAULT_SIDER_CONFIG,
    toggle: () => {},
    clearPreference: () => {},
});

const PUBLIC_APPEARANCE = Object.freeze({
    ...DEFAULT_SIDER_CONFIG,
    application: {
        ...DEFAULT_SIDER_CONFIG.application,
        colorMode: 'light',
        density: 'comfortable',
    },
    content: { ...DEFAULT_SIDER_CONFIG.content },
    header: { ...DEFAULT_SIDER_CONFIG.header },
    colors: { ...DEFAULT_SIDER_CONFIG.colors },
    darkColors: { ...DEFAULT_SIDER_CONFIG.darkColors },
});

const PREFERENCE_KEYS = {
    public: 'theme-preference:public',
    workspace: 'theme-preference:workspace',
};

export function ThemeProvider({ children }) {
    const location = useLocation();
    const scope = location.pathname.startsWith('/admin') ? 'workspace' : 'public';
    const rows = useValuesStore((state) => state.ui_settings);
    const workspaceAppearance = useMemo(() => resolveSiderConfig(rows ?? []), [rows]);
    const scopedAppearance = scope === 'workspace' ? workspaceAppearance : PUBLIC_APPEARANCE;
    const configuredMode = scopedAppearance.application.colorMode;
    const [preferences, setPreferences] = useState(() => ({
        public: localStorage.getItem(PREFERENCE_KEYS.public),
        workspace: localStorage.getItem(PREFERENCE_KEYS.workspace)
            ?? localStorage.getItem('theme-preference'),
    }));
    const [systemDark, setSystemDark] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    const preference = preferences[scope];

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const update = (event) => setSystemDark(event.matches);
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    const followsSystem = preference !== 'light'
        && preference !== 'dark'
        && configuredMode === 'system';
    const mode = preference === 'light' || preference === 'dark'
        ? preference
        : followsSystem
            ? (systemDark ? 'dark' : 'light')
            : configuredMode;
    const isDark = mode === 'dark';
    const appearance = useMemo(() => ({
        ...scopedAppearance,
        colors: getAppearancePalette(scopedAppearance, isDark),
    }), [isDark, scopedAppearance]);

    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;

        body.classList.add('ads-theme', 'ads-v1');
        body.classList.toggle('ads-auto', followsSystem);
        body.classList.toggle('ads-dark', !followsSystem && isDark);
        body.dataset.adsTheme = followsSystem ? 'auto' : mode;

        root.dataset.theme = mode;
        root.dataset.appearanceScope = scope;
        root.dataset.density = scopedAppearance.application.density;
        root.dataset.motion = scopedAppearance.application.motionEnabled ? 'enabled' : 'reduced';
        root.style.colorScheme = isDark ? 'dark' : 'light';

        document.querySelector('meta[name="theme-color"]')?.setAttribute(
            'content',
            getAppearancePalette(scopedAppearance, isDark).contentBg,
        );

        applyVariables(body, createAdsStyle(scopedAppearance, isDark));
        applyVariables(root, createLegacyVariables(scopedAppearance, isDark));
    }, [followsSystem, isDark, mode, scope, scopedAppearance]);

    const toggle = useCallback(() => {
        const next = isDark ? 'light' : 'dark';
        localStorage.setItem(PREFERENCE_KEYS[scope], next);
        setPreferences((current) => ({ ...current, [scope]: next }));
    }, [isDark, scope]);

    const clearPreference = useCallback(() => {
        localStorage.removeItem(PREFERENCE_KEYS[scope]);
        if (scope === 'workspace') localStorage.removeItem('theme-preference');
        setPreferences((current) => ({ ...current, [scope]: null }));
    }, [scope]);

    const componentSize = scopedAppearance.application.density === 'compact'
        ? 'small'
        : scopedAppearance.application.density === 'spacious'
            ? 'large'
            : 'middle';
    const themeConfig = useMemo(() => ({
        zeroRuntime: true,
        token: {
            motion: scopedAppearance.application.motionEnabled,
        },
    }), [scopedAppearance.application.motionEnabled]);

    const contextValue = useMemo(() => ({
        isDark,
        mode,
        scope,
        isWorkspace: scope === 'workspace',
        configuredMode,
        hasPreference: preference === 'light' || preference === 'dark',
        preference,
        followsSystem,
        toggle,
        clearPreference,
        appearance,
    }), [
        appearance,
        clearPreference,
        configuredMode,
        followsSystem,
        isDark,
        mode,
        preference,
        scope,
        toggle,
    ]);

    return (
        <ThemeCtx.Provider value={contextValue}>
            <ConfigProvider componentSize={componentSize} theme={themeConfig}>
                {children}
            </ConfigProvider>
        </ThemeCtx.Provider>
    );
}

export default ThemeCtx;

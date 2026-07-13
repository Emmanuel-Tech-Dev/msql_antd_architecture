import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useLocation } from 'react-router-dom';
import { useStore as useValuesStore } from '../store/values-store';
import { DEFAULT_SIDER_CONFIG, resolveSiderConfig } from '../core/config/siderConfig';

const ThemeCtx = createContext({
    isDark: false,
    mode: 'light',
    scope: 'public',
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
});

const PREFERENCE_KEYS = {
    public: 'theme-preference:public',
    workspace: 'theme-preference:workspace',
};

const CSS_VARIABLES = {
    '--color-accent': 'accent',
    '--color-accent-hover': 'accent',
    '--color-bg-base': 'contentBg',
    '--color-bg-container': 'surfaceBg',
    '--color-bg-elevated': 'elevatedBg',
    '--color-bg-sunken': 'contentBg',
    '--color-border': 'strongBorder',
    '--color-border-subtle': 'border',
    '--color-border-strong': 'strongBorder',
    '--color-text-primary': 'bodyText',
    '--color-text-secondary': 'secondaryText',
    '--color-text-tertiary': 'secondaryText',
    '--color-success': 'success',
    '--color-warning': 'warning',
    '--color-error': 'error',
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
    const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
    const preference = preferences[scope];

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const update = (event) => setSystemDark(event.matches);
        media.addEventListener?.('change', update);
        return () => media.removeEventListener?.('change', update);
    }, []);

    const mode = preference === 'light' || preference === 'dark'
        ? preference
        : configuredMode === 'system'
            ? (systemDark ? 'dark' : 'light')
            : configuredMode;
    const isDark = mode === 'dark';
    const appearance = useMemo(() => {
        if (!isDark) return scopedAppearance;
        return {
            ...scopedAppearance,
            colors: {
                ...scopedAppearance.colors,
                headerBg: '#141210',
                contentBg: '#0e0d0b',
                surfaceBg: '#1c1a17',
                elevatedBg: '#141210',
                bodyText: '#f0ede8',
                secondaryText: '#a89f94',
                border: '#1e1c18',
                strongBorder: '#2e2b26',
            },
        };
    }, [isDark, scopedAppearance]);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset.theme = mode;
        root.dataset.appearanceScope = scope;
        root.dataset.density = appearance.application.density;
        root.dataset.motion = appearance.application.motionEnabled ? 'enabled' : 'reduced';
        Object.entries(CSS_VARIABLES).forEach(([variable, colorKey]) => {
            root.style.setProperty(variable, appearance.colors[colorKey]);
        });
        root.style.setProperty('--font-size-base', `${appearance.application.fontSize}px`);
        root.style.setProperty('--app-radius', `${appearance.application.borderRadius}px`);
        root.style.setProperty('--app-control-height', `${appearance.application.controlHeight}px`);
        root.style.setProperty('--app-content-padding', `${appearance.content.padding}px`);
        root.style.setProperty('--app-content-max-width', `${appearance.content.maxWidth}px`);
    }, [appearance, mode, scope]);

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

    const algorithms = useMemo(() => {
        const selected = [isDark ? theme.darkAlgorithm : theme.defaultAlgorithm];
        if (appearance.application.density === 'compact') selected.push(theme.compactAlgorithm);
        return selected;
    }, [appearance.application.density, isDark]);

    const tableSpacing = useMemo(() => {
        if (appearance.application.density === 'compact') {
            return { block: 9, inline: 12 };
        }
        if (appearance.application.density === 'spacious') {
            return { block: 16, inline: 22 };
        }
        return { block: 13, inline: 18 };
    }, [appearance.application.density]);

    const themeConfig = useMemo(() => ({
        algorithm: algorithms,
        token: {
            colorPrimary: appearance.colors.accent,
            colorLink: appearance.colors.accent,
            colorBgBase: appearance.colors.contentBg,
            colorBgContainer: appearance.colors.surfaceBg,
            colorBgElevated: appearance.colors.elevatedBg,
            colorBgLayout: appearance.colors.contentBg,
            colorBorder: appearance.colors.strongBorder,
            colorBorderSecondary: appearance.colors.border,
            colorText: appearance.colors.bodyText,
            colorTextSecondary: appearance.colors.secondaryText,
            colorSuccess: appearance.colors.success,
            colorWarning: appearance.colors.warning,
            colorError: appearance.colors.error,
            borderRadius: appearance.application.borderRadius,
            controlHeight: appearance.application.controlHeight,
            fontSize: appearance.application.fontSize,
            motion: appearance.application.motionEnabled,
            fontFamily: 'var(--font-body)',
        },
        components: {
            Button: { primaryShadow: 'none' },
            Card: { borderRadiusLG: appearance.application.borderRadius + 2 },
            Layout: {
                bodyBg: appearance.colors.contentBg,
                headerBg: appearance.colors.headerBg,
                siderBg: appearance.colors.siderBg,
            },
            Menu: {
                darkItemBg: appearance.colors.siderBg,
                darkItemSelectedBg: appearance.colors.itemActive,
                darkItemColor: appearance.colors.textPrimary,
                darkItemSelectedColor: appearance.colors.accentText,
            },
            Table: {
                headerBg: appearance.colors.elevatedBg,
                borderColor: appearance.colors.strongBorder,
                cellPaddingBlock: tableSpacing.block,
                cellPaddingInline: tableSpacing.inline,
                cellPaddingBlockMD: tableSpacing.block,
                cellPaddingInlineMD: tableSpacing.inline,
                cellPaddingBlockSM: Math.max(8, tableSpacing.block - 3),
                cellPaddingInlineSM: Math.max(10, tableSpacing.inline - 4),
            },
        },
    }), [appearance, algorithms, tableSpacing]);

    const contextValue = useMemo(
        () => ({
            isDark,
            mode,
            scope,
            isWorkspace: scope === 'workspace',
            configuredMode,
            toggle,
            clearPreference,
            appearance,
        }),
        [appearance, clearPreference, configuredMode, isDark, mode, scope, toggle],
    );

    return (
        <ThemeCtx.Provider value={contextValue}>
            <ConfigProvider
                componentSize={appearance.application.density === 'spacious' ? 'large' : 'middle'}
                theme={themeConfig}
            >
                {children}
            </ConfigProvider>
        </ThemeCtx.Provider>
    );
}

export default ThemeCtx;

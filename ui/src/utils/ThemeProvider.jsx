import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ConfigProvider, theme } from 'antd'

const ThemeCtx = createContext({ isDark: false, toggle: () => { } })

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(
        () => typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
    )

    useEffect(() => {
        const saved = localStorage.getItem('theme') ?? 'light'
        apply(saved === 'dark')
    }, [])

    const apply = useCallback((dark) => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
        localStorage.setItem('theme', dark ? 'dark' : 'light')
        setIsDark(dark)
    }, [])

    const toggle = useCallback(() => apply(!isDark), [isDark, apply])

    return (
        <ThemeCtx.Provider value={{ isDark, toggle }}>
            <ConfigProvider
                wave={{ disabled: true }}
                theme={{
                    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
                    token: {
                        colorPrimary: 'var(--color-accent)',
                        colorLink: 'var(--color-accent)',
                        colorBgBase: 'var(--color-bg-base)',
                        colorBgContainer: 'var(--color-bg-container)',
                        colorBgElevated: 'var(--color-bg-elevated)',
                        colorBgLayout: 'var(--color-bg-base)',
                        colorBgSpotlight: 'var(--color-bg-sunken)',
                        colorBorder: 'var(--color-border)',
                        colorBorderSecondary: 'var(--color-border-subtle)',
                        colorText: 'var(--color-text-primary)',
                        colorTextSecondary: 'var(--color-text-secondary)',
                        colorTextTertiary: 'var(--color-text-tertiary)',
                        colorTextDisabled: 'var(--color-text-disabled)',
                        colorSuccess: 'var(--color-success)',
                        colorWarning: 'var(--color-warning)',
                        colorError: 'var(--color-error)',
                        colorInfo: 'var(--color-info)',
                        fontFamily: 'var(--font-body)',
                        // borderRadius: 4,
                        // borderRadiusLG: 12,
                        // borderRadiusSM: 2,
                    },
                    components: {
                        Checkbox: {
                            colorPrimary: 'var(--color-accent)',
                            colorPrimaryHover: 'var(--color-accent-hover)',
                            colorBgContainer: 'var(--color-bg-container)',
                            colorBorder: 'var(--color-border-strong)',
                        },
                        Radio: {
                            colorPrimary: 'var(--color-accent)',
                            colorPrimaryHover: 'var(--color-accent-hover)',
                            colorBgContainer: 'var(--color-bg-container)',
                            colorBorder: 'var(--color-border-strong)',
                        },
                        Switch: {
                            colorPrimary: 'var(--color-accent)',
                            colorPrimaryHover: 'var(--color-accent-hover)',
                        },
                        Slider: {
                            colorPrimary: 'var(--color-accent)',
                            handleColor: 'var(--color-accent)',
                            handleActiveColor: 'var(--color-accent-hover)',
                            trackBg: 'var(--color-accent)',
                            trackHoverBg: 'var(--color-accent-hover)',
                            railBg: 'var(--color-border)',
                            dotActiveBorderColor: 'var(--color-accent)',
                        },
                        Tree: {
                            colorPrimary: 'var(--color-accent)',
                            colorBgContainer: 'var(--color-bg-container)',
                            nodeSelectedBg: 'var(--color-accent-muted)',
                            nodeHoverBg: 'var(--color-accent-muted)',
                        },
                        // Table: {
                        //     headerBg: 'var(--color-bg-sunken)',
                        //     headerColor: 'var(--color-text-tertiary)',
                        //     rowHoverBg: 'var(--color-accent-light)',
                        //     rowSelectedBg: 'var(--color-accent-light)',
                        //     rowSelectedHoverBg: 'var(--color-accent-light)',
                        //     borderColor: 'var(--color-border)',
                        //     footerBg: 'var(--color-bg-sunken)',
                        // },
                        Select: {
                            optionSelectedBg: 'var(--color-accent-muted)',
                            optionActiveBg: 'var(--color-bg-sunken)',
                            optionSelectedColor: 'var(--color-accent)',
                        },
                        // Input: {
                        //     activeBorderColor: 'var(--color-accent)',
                        //     hoverBorderColor: 'var(--color-border-strong)',
                        //     activeShadow: '0 0 0 3px var(--color-accent-muted)',
                        // },
                        // Button: {
                        //     colorPrimary: 'var(--color-accent)',
                        //     colorPrimaryHover: 'var(--color-accent-hover)',
                        //     primaryShadow: 'none',
                        //     defaultShadow: 'none',
                        // },
                        Tabs: {
                            inkBarColor: 'var(--color-accent)',
                            itemSelectedColor: 'var(--color-accent)',
                            itemHoverColor: 'var(--color-accent-hover)',
                        },
                        Progress: {
                            defaultColor: 'var(--color-accent)',
                            remainingColor: 'var(--color-bg-sunken)',
                        },
                        Pagination: {
                            itemActiveBg: 'var(--color-accent)',
                        },
                        DatePicker: {
                            cellActiveWithRangeBg: 'var(--color-accent-muted)',
                            cellHoverBg: 'var(--color-bg-sunken)',
                        },
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeCtx.Provider>
    )
}

export default ThemeCtx
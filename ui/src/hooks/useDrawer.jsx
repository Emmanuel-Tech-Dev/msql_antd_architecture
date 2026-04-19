import { Drawer } from 'antd';
import { useState, useCallback, useMemo } from 'react';

/**
 * useDrawer
 *
 * staticConfig  → set once at init, structural/behavioral (placement, width, mask etc)
 * dynamic state → changes per open (title, content, extra, footer, loading)
 *
 * New antd features supported:
 * - loading    → shows skeleton while content loads
 * - resizable  → user can drag to resize
 * - destroyOnClose → unmounts content on close
 * - styles     → replaces deprecated bodyStyle/headerStyle
 * - push       → controls parent drawer push behavior
 */
const useDrawer = (staticConfig = {}) => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(null);
    const [content, setContent] = useState(null);
    const [extra, setExtra] = useState(null);
    const [footer, setFooter] = useState(null);
    const [loading, setLoading] = useState(false);

    //  width as state so resize updates it
    const [width, setWidth] = useState(staticConfig.width ?? 378);
    const [height, setHeight] = useState(staticConfig.height ?? 378);

    // ─── Open ─────────────────────────────────────────────────────────────
    const openDrawer = useCallback(({ title, content, extra, footer, loading } = {}) => {
        if (title !== undefined) setTitle(title);
        if (content !== undefined) setContent(content);
        if (extra !== undefined) setExtra(extra);
        if (footer !== undefined) setFooter(footer);
        setLoading(loading ?? false);
        setOpen(true);
    }, []);

    // ─── Close ────────────────────────────────────────────────────────────
    const closeDrawer = useCallback(() => {
        setOpen(false);
        if (staticConfig.resetOnClose) {
            setTitle(null);
            setContent(null);
            setExtra(null);
            setFooter(null);
            setLoading(false);
        }
    }, [staticConfig.resetOnClose]);

    // ─── Dynamic updates ──────────────────────────────────────────────────
    const updateContent = useCallback((content) => setContent(content), []);
    const updateTitle = useCallback((title) => setTitle(title), []);
    const updateExtra = useCallback((extra) => setExtra(extra), []);
    const updateFooter = useCallback((footer) => setFooter(footer), []);

    // ─── Resize handlers ──────────────────────────────────────────────────
    const resizableConfig = useMemo(() => {
        if (!staticConfig.resizable) return false;
        const placement = staticConfig.placement ?? 'right';

        return {
            // ✅ only resize relevant axis based on placement
            minWidth: staticConfig.minWidth ?? 300,
            maxWidth: staticConfig.maxWidth ?? 800,
            minHeight: staticConfig.minHeight ?? 300,
            maxHeight: staticConfig.maxHeight ?? 800,
            onResize: (_, { size }) => {
                if (placement === 'left' || placement === 'right') {
                    setWidth(size.width);
                } else {
                    // top or bottom drawer — resize height
                    setHeight(size.height);
                }
            },
        };
    }, [staticConfig]);

    // ─── JSX ──────────────────────────────────────────────────────────────
    const drawerJSX = useCallback((overrides = {}, localContent) => (
        <Drawer
            // ✅ static
            placement={staticConfig.placement ?? 'right'}
            closable={staticConfig.closable ?? true}
            maskClosable={staticConfig.maskClosable ?? true}
            mask={staticConfig.mask ?? true}
            keyboard={staticConfig.keyboard ?? true}
            zIndex={staticConfig.zIndex ?? 1000}
            size={staticConfig.size}
            push={staticConfig.push}
            destroyOnClose={staticConfig.destroyOnClose ?? false}
            rootClassName={staticConfig.rootClassName}
            rootStyle={staticConfig.rootStyle}
            styles={staticConfig.styles}
            //  resizable — uses state so width/height update on drag
            resizable={resizableConfig}
            width={width}
            // dynamic
            title={title}
            extra={extra}
            footer={footer}
            loading={loading}
            open={open}
            onClose={closeDrawer}
            style={{
                minWidth: staticConfig.minWidth,
                maxWidth: staticConfig.maxWidth
            }}
            {...overrides}
        >
            {localContent || content}
        </Drawer>
    ), [open, title, content, extra, footer, loading, width, height, closeDrawer, staticConfig, resizableConfig]);

    return {
        open,
        loading,
        width,
        height,
        openDrawer,
        closeDrawer,
        updateContent,
        updateTitle,
        updateExtra,
        updateFooter,
        setLoading,
        drawerJSX,
        setOpen,
        setWidth,
        setHeight,
    };
};

export default useDrawer;
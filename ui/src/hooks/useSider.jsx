// src/hooks/useSider.js

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SiderLayout from '../components/SiderLayout';

const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const BREAKPOINT_WIDTHS = {
    xs: 480, sm: 576, md: 768,
    lg: 992, xl: 1200, xxl: 1600,
};

/*
  initConfig  — layout structure, set once at mount, never changes
  liveConfig  — reactive values, update after mount
*/
const useSider = (initConfig = {}, liveConfig = {}) => {

    // ─── initConfig captured in ref — read once, never stale ───────────────
    const initRef = useRef(initConfig);

    const {
        variant = 'sider',
        width = 225,
        collapsedWidth = 80,
        breakpoint = 'lg',
        theme = 'dark',
        collapsible = true,
        defaultCollapsed = false,
        reverseArrow = false,
        headerHeight = 64,
        isGrouped = false,
        groupKey,
        groupVariant = 'dropdown',
        orderKey = 'order',
        bottomKey = 'settings',
        defaultHeader = true,
        defaultFooter = false,
        footerText = `© ${new Date().getFullYear()}`,
        headerStyle,
        siderStyle,
        contentStyle,
        layoutStyle,
        footerStyle,
    } = initRef.current;

    // ─── liveConfig — reactive, flows through normally ──────────────────────
    const {
        items = [],
        headerItems = [],
        appName = 'My App',
        user = { name: 'Admin', email: '' },
        notificationCount = 0,
        onLogout,
        onProfile,
        showSiderProfile = false,
        showSiderLogout = false,
    } = liveConfig;

    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [headerItemsState, setHeaderItemsState] = useState(headerItems);

    const onCollapse = useCallback((value) => setCollapsed(value), []);
    const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

    // keep headerItems in sync with liveConfig
    useEffect(() => {
        if (!headerItems.length) return;
        setHeaderItemsState(headerItems);
    }, [headerItems]);

    // ─── responsive collapse ────────────────────────────────────────────────
    useEffect(() => {
        const bp = BREAKPOINT_WIDTHS[breakpoint] ?? 992;
        const handleResize = debounce(() => {
            setCollapsed(window.innerWidth < bp);
        }, 150);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    // ─── Sort ───────────────────────────────────────────────────────────────
    const sortByOrder = useCallback((data) => (
        [...data].sort((a, b) => (a[orderKey] ?? Infinity) - (b[orderKey] ?? Infinity))
    ), [orderKey]);

    // ─── Group ──────────────────────────────────────────────────────────────
    const groupData = useCallback((data) => {
        if (!isGrouped || !groupKey) return null;

        const groupMap = {};
        const groupOrder = {};
        const ungrouped = [];

        sortByOrder(data).forEach((item) => {
            const val = item[groupKey];
            if (val === undefined || val === null) {
                ungrouped.push(item);
            } else {
                if (!groupMap[val]) {
                    groupMap[val] = [];
                    groupOrder[val] = item[orderKey] ?? Infinity;
                } else {
                    groupOrder[val] = Math.min(groupOrder[val], item[orderKey] ?? Infinity);
                }
                groupMap[val].push(item);
            }
        });

        const sorted = Object.entries(groupMap).sort(
            ([a], [b]) => (groupOrder[a] ?? Infinity) - (groupOrder[b] ?? Infinity)
        );

        return { groupMap: Object.fromEntries(sorted), groupOrder, ungrouped };
    }, [isGrouped, groupKey, sortByOrder, orderKey]);

    // ─── Build single menu item ─────────────────────────────────────────────
    const buildItem = useCallback((item) => ({
        key: item.key || item.path || item.label,
        icon: item.icon,
        label: item.label,
        onClick: () => item.path && navigate(item.path),
    }), [navigate]);

    // ─── Build full sider menu items ────────────────────────────────────────
    const processedSiderItems = useMemo(() => {
        if (!items?.length) return [];

        let result = [];

        if (isGrouped && groupKey) {
            const { groupMap, ungrouped } = groupData(items);
            sortByOrder(ungrouped).forEach((item) => result.push(buildItem(item)));

            Object.entries(groupMap).forEach(([groupName, groupItems]) => {
                if (groupVariant === 'dropdown') {
                    result.push({
                        key: groupName,
                        label: groupName,
                        children: sortByOrder(groupItems).map(buildItem),
                    });
                } else {
                    result.push({
                        type: 'group',
                        key: groupName,
                        label: groupName,
                        children: sortByOrder(groupItems).map(buildItem),
                    });
                }
            });
        } else {
            result = sortByOrder(items).map((item) =>
                item.children?.length
                    ? {
                        key: item.key || item.label,
                        icon: item.icon,
                        label: item.label,
                        children: sortByOrder(item.children).map(buildItem),
                    }
                    : buildItem(item)
            );
        }

        if (bottomKey) {
            const bottomKeys = [].concat(bottomKey);
            const isBottom = (item) =>
                bottomKeys.some((k) => item.key === k || item.label === k);
            const pinned = result.filter(isBottom);
            const rest = result.filter((item) => !isBottom(item));
            return [...rest, ...pinned];
        }

        return result;
    }, [items, isGrouped, groupKey, groupData, groupVariant, buildItem, sortByOrder, bottomKey]);

    // ─── Build header menu items ────────────────────────────────────────────
    const processedHeaderItems = useMemo(() => {
        const source = headerItemsState.length ? headerItemsState : items;
        if (!source?.length) return [];
        return sortByOrder(source).map((item) =>
            item.children?.length
                ? {
                    key: item.key || item.label,
                    icon: item.icon,
                    label: item.label,
                    children: sortByOrder(item.children).map(buildItem),
                }
                : buildItem(item)
        );
    }, [items, headerItemsState, buildItem, sortByOrder]);

    // ─── Active route keys ──────────────────────────────────────────────────
    const selectedKeys = useMemo(() => {
        const keys = [];
        const scan = (list) => list.forEach((item) => {
            if (item.path && location.pathname === item.path) {
                keys.push(item.key || item.path || item.label);
            }
            if (item.children?.length) scan(item.children);
        });
        scan(items);
        return keys;
    }, [items, location.pathname]);

    const openKeys = useMemo(() => {
        const keys = [];
        if (isGrouped && groupKey) {
            const grouped = groupData(items);
            if (grouped?.groupMap) {
                Object.entries(grouped.groupMap).forEach(([groupName, groupItems]) => {
                    if (groupItems.some((item) =>
                        item.path && location.pathname === item.path
                    )) {
                        keys.push(groupName);
                    }
                });
            }
        } else {
            items.forEach((item) => {
                if (item.children?.some((c) =>
                    c.path && location.pathname === c.path
                )) {
                    keys.push(item.key || item.label);
                }
            });
        }
        return keys;
    }, [items, isGrouped, groupKey, groupData, location.pathname]);

    // ─── layoutJSX ──────────────────────────────────────────────────────────
    const layoutJSX = useCallback(({ header, siderHeader, trigger, footer } = {}) => (
        <SiderLayout
            variant={variant}
            collapsed={collapsed}
            collapsedWidth={collapsedWidth}
            collapsible={collapsible}
            breakpoint={breakpoint}
            reverseArrow={reverseArrow}
            theme={theme}
            width={width}
            headerHeight={headerHeight}
            siderStyle={siderStyle}
            headerStyle={headerStyle}
            contentStyle={contentStyle}
            layoutStyle={layoutStyle}
            footerStyle={footerStyle}
            footerText={footerText}
            defaultHeader={defaultHeader}
            defaultFooter={defaultFooter}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onLogout={onLogout}
            onProfile={onProfile}
            showSiderProfile={showSiderProfile}
            showSiderLogout={showSiderLogout}
            processedSiderItems={processedSiderItems}
            processedHeaderItems={processedHeaderItems}
            selectedKeys={selectedKeys}
            openKeys={openKeys}
            onCollapse={onCollapse}
            toggle={toggle}
            siderHeader={siderHeader}
            header={header}
            footer={footer}
            trigger={trigger}
        />
    ), [
        collapsed, processedSiderItems, processedHeaderItems,
        selectedKeys, openKeys, onCollapse, toggle,
        appName, user, notificationCount, onLogout, onProfile,
        showSiderProfile, showSiderLogout,
        variant, collapsedWidth, collapsible, breakpoint, reverseArrow,
        theme, width, headerHeight, siderStyle, headerStyle,
        contentStyle, layoutStyle, footerStyle, footerText,
        defaultHeader, defaultFooter,
    ]);

    return {
        collapsed,
        toggle,
        onCollapse,
        setCollapsed,
        setHeaderItems: setHeaderItemsState,
        layoutJSX,
    };
};

export default useSider;
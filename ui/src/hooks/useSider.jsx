import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Layout, Menu, Typography, theme as antTheme, Avatar, Badge, Button, Dropdown, Space } from 'antd';
import { BellOutlined, DownOutlined, LeftOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useApi from './useApi';

const { Sider, Header, Content, Footer } = Layout;

// ─── debounce utility ─────────────────────────────────────────────────────────
const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const useSider = (staticConfig = {}) => {
    const {
        items: initialItems = [],
        headerItems: initialHeaderItems = [],
        variant = 'sider',
        width = 160,
        collapsedWidth = 80,
        breakpoint = 'lg',
        theme = 'dark',
        collapsible = true,
        defaultCollapsed = false,
        reverseArrow = false,
        fixed = false,
        headerHeight = 64,
        isGrouped = false,
        groupKey,
        groupVariant = 'dropdown',
        orderKey = 'order',
        bottomKey = 'settings',
        defaultHeader = true,
        defaultFooter = true,
        footerText = `My App ${new Date().getFullYear()}`,
        headerStyle,
        siderStyle,
        contentStyle,
        layoutStyle,
        footerStyle,
        showHeaderSider = false,
        url,
        responseKey,
        transformItem,
        appName = 'My App',
        user = { name: 'Admin', email: 'admin@example.com' },
        notificationCount = 0,
        onLogout,
        onProfile,
        showSiderProfile = false,     // shows user profile at bottom of sider
        showSiderLogout = false,
    } = staticConfig;

    const { token } = antTheme.useToken();
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [items, setItems] = useState(initialItems);
    const [headerItems, setHeaderItems] = useState(initialHeaderItems);
    const navigate = useNavigate();
    const location = useLocation();

    const onCollapse = useCallback((value) => setCollapsed(value), []);
    const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

    // ─── FIX 4: debounced resize handler ─────────────────────────────────
    const breakpointWidths = { xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 };

    useEffect(() => {
        const bp = breakpointWidths[breakpoint] ?? 992;

        const handleResize = debounce(() => {
            setCollapsed(window.innerWidth < bp);
        }, 150);

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    // ─── API fetch ────────────────────────────────────────────────────────
    const { loading, run: fetchRoutes } = useApi('get', url || '', {
        manual: true,
        onSuccess: (data) => {
            const res = data?.data;
            const raw = responseKey
                ? res?.[responseKey] ?? data?.[responseKey]
                : res?.result ?? res?.data ?? res ?? [];
            const normalized = Array.isArray(raw)
                ? raw.map((item) => (transformItem ? transformItem(item) : item))
                : [];
            setItems(normalized);
        },
    });

    useEffect(() => {
        if (url) fetchRoutes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    const setStaticItems = useCallback((data) => setItems(data), []);

    // ─── Sort by order field ──────────────────────────────────────────────
    const sortByOrder = useCallback((data) => {
        return [...data].sort((a, b) => {
            const aOrder = a[orderKey] ?? Infinity;
            const bOrder = b[orderKey] ?? Infinity;
            return aOrder - bOrder;
        });
    }, [orderKey]);

    // ─── Group data ───────────────────────────────────────────────────────
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

        const sortedGroupEntries = Object.entries(groupMap).sort(
            ([aName], [bName]) => (groupOrder[aName] ?? Infinity) - (groupOrder[bName] ?? Infinity)
        );

        return { groupMap: Object.fromEntries(sortedGroupEntries), groupOrder, ungrouped };
    }, [isGrouped, groupKey, sortByOrder, orderKey]);

    // ─── Build single item ────────────────────────────────────────────────
    const buildItem = useCallback((item) => ({
        key: item.key || item.path || item.label,
        icon: item.icon,
        label: item.label,
        onClick: () => item.path && navigate(item.path),
    }), [navigate]);

    // ─── Build sider menu items ───────────────────────────────────────────
    const buildSiderMenuItems = useCallback((data) => {
        if (!data?.length) return [];

        let result = [];

        if (isGrouped && groupKey) {
            const { groupMap, ungrouped } = groupData(data);
            sortByOrder(ungrouped).forEach((item) => result.push(buildItem(item)));
            Object.entries(groupMap).forEach(([groupName, groupItems]) => {
                if (groupVariant === 'dropdown') {
                    result.push({ key: groupName, label: groupName, children: sortByOrder(groupItems).map(buildItem) });
                } else {
                    result.push({ type: 'group', key: groupName, label: groupName, children: sortByOrder(groupItems).map(buildItem) });
                }
            });
        } else {
            result = sortByOrder(data).map((item) =>
                item.children?.length
                    ? { key: item.key || item.label, icon: item.icon, label: item.label, children: sortByOrder(item.children).map(buildItem) }
                    : buildItem(item)
            );
        }

        if (bottomKey) {
            const bottomKeys = [].concat(bottomKey);
            const isBottom = (item) => bottomKeys.some(
                (k) => item.key === k || item.path === k || item.label === k
            );
            const pinned = result.filter(isBottom);
            const rest = result.filter((item) => !isBottom(item));
            return [...rest, ...pinned];
        }

        return result;
    }, [isGrouped, groupKey, groupData, groupVariant, buildItem, sortByOrder, bottomKey]);

    // ─── Build header menu items (always flat) ────────────────────────────
    const buildHeaderMenuItems = useCallback((data) => {
        if (!data?.length) return [];
        return sortByOrder(data).map((item) =>
            item.children?.length
                ? { key: item.key || item.label, icon: item.icon, label: item.label, children: sortByOrder(item.children).map(buildItem) }
                : buildItem(item)
        );
    }, [buildItem, sortByOrder]);

    // ─── FIX 2: memoize processed menu items — no re-sort/re-group on every render
    const processedSiderItems = useMemo(
        () => buildSiderMenuItems(items),
        [items, buildSiderMenuItems]
    );

    const processedHeaderItems = useMemo(
        () => buildHeaderMenuItems(headerItems.length ? headerItems : items),
        [items, headerItems, buildHeaderMenuItems]
    );

    // ─── FIX 3: memoize selected + open keys — no tree scan on every render
    const selectedKeys = useMemo(() => {
        const keys = [];
        const scan = (list) => list.forEach((item) => {
            if (item.path && location.pathname === item.path) keys.push(item.key || item.path || item.label);
            if (item.children?.length) scan(item.children);
        });
        scan(items);
        return keys;
    }, [items, location.pathname]);

    const openKeys = useMemo(() => {
        const keys = [];
        if (isGrouped && groupKey) {
            const grouped = groupData(items);
            grouped?.groupMap && Object.entries(grouped.groupMap).forEach(([groupName, groupItems]) => {
                if (groupItems.some((item) => item.path && location.pathname === item.path)) keys.push(groupName);
            });
        } else {
            items.forEach((item) => {
                if (item.children?.some((c) => c.path && location.pathname === c.path)) keys.push(item.key || item.label);
            });
        }
        return keys;
    }, [items, isGrouped, groupKey, groupData, location.pathname]);

    // ─── getSelectedKeys / getOpenKeys kept for header menu (flat, no grouping)
    const getSelectedKeysFromData = useCallback((data) => {
        const keys = [];
        const scan = (list) => list.forEach((item) => {
            if (item.path && location.pathname === item.path) keys.push(item.key || item.path || item.label);
            if (item.children?.length) scan(item.children);
        });
        scan(data);
        return keys;
    }, [location.pathname]);

    // ─── Render sider menu ────────────────────────────────────────────────
    // uses memoized processedSiderItems, selectedKeys, openKeys — no recalculation
    const renderSiderMenu = useCallback(() => (
        <Menu
            theme={theme}
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={openKeys}
            items={processedSiderItems}
            style={{ marginTop: 16, overflowX: 'hidden', width: '100%' }}
        />
    ), [theme, processedSiderItems, selectedKeys, openKeys]);

    // ─── Render header menu ───────────────────────────────────────────────
    // uses memoized processedHeaderItems
    const renderHeaderMenu = useCallback(() => (
        <Menu
            theme={theme}
            mode="horizontal"
            selectedKeys={getSelectedKeysFromData(headerItems.length ? headerItems : items)}
            items={processedHeaderItems}
            style={{ flex: 1, minWidth: 0 }}
        />
    ), [theme, processedHeaderItems, headerItems, items, getSelectedKeysFromData]);

    // ─── Shared sider node ────────────────────────────────────────────────
    const renderSider = useCallback(({ siderHeader, trigger } = {}) => {
        const isDark = theme === 'dark';
        const textColor = isDark ? '#fff' : token.colorText;

        const bottomSection = (showSiderProfile || showSiderLogout) && (
            <div style={{
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : token.colorBorderSecondary}`,
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
            }}>
                {showSiderProfile && (
                    <div
                        onClick={() => onProfile ? onProfile() : navigate('/profile')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: token.borderRadius,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : token.colorBgTextHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Avatar size="small" style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        {!collapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, overflow: 'hidden' }}>
                                <Typography.Text strong style={{ fontSize: 13, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.name}
                                </Typography.Text>
                                <Typography.Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.45)' : token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.email}
                                </Typography.Text>
                            </div>
                        )}
                    </div>
                )}
                {showSiderLogout && (
                    <div
                        onClick={() => onLogout ? onLogout() : navigate('/')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: token.borderRadius,
                            cursor: 'pointer',
                            color: token.colorError,
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,77,79,0.12)' : token.colorErrorBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogoutOutlined style={{ fontSize: 14, flexShrink: 0 }} />
                        {!collapsed && (
                            <Typography.Text style={{ fontSize: 13, color: token.colorError }}>
                                Logout
                            </Typography.Text>
                        )}
                    </div>
                )}
            </div>
        );

        return (
            <Sider
                width={width}
                collapsed={collapsed}
                collapsedWidth={collapsedWidth}
                collapsible={collapsible}
                breakpoint={breakpoint}
                reverseArrow={reverseArrow}
                theme={theme}
                trigger={trigger !== undefined ? trigger : undefined}
                onCollapse={onCollapse}
                style={{
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflowX: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    ...siderStyle,
                }}
            >
                {/* sider needs flex column layout to push bottom section down */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden' }}>
                    {siderHeader && (
                        <div style={{ height: headerHeight, display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                            {siderHeader}
                        </div>
                    )}
                    {/* menu takes all available space */}
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                        {renderSiderMenu()}
                    </div>
                    {/* bottom section pinned to bovttom */}
                    {bottomSection}
                </div>
            </Sider>
        );
    }, [
        collapsed, collapsedWidth, collapsible, breakpoint, reverseArrow, theme,
        onCollapse, siderStyle, headerHeight, width, renderSiderMenu,
        showSiderProfile, showSiderLogout, user, onProfile, onLogout,
        navigate, token,
    ]);

    // ─── FIX 5: collapsed isolated — renderDefaultHeader only rebuilds when
    //            non-layout things change, not on every resize tick
    const collapseIcon = collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />;

    const renderDefaultHeader = useCallback(() => {
        const profileItems = [
            {
                key: 'profile',
                icon: <UserOutlined />,
                label: 'Profile',
                onClick: () => onProfile ? onProfile() : navigate('/profile'),
            },
            { type: 'divider' },
            {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: 'Logout',
                danger: true,
                onClick: () => onLogout ? onLogout() : navigate('/'),
            },
        ];

        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button
                        type="text"
                        icon={collapseIcon}
                        onClick={toggle}
                        style={{ fontSize: 16, color: theme === 'dark' ? '#fff' : token.colorText }}
                    />
                    <Typography.Text strong style={{ fontSize: 16, color: theme === 'dark' ? '#fff' : token.colorText || "#000" }}>
                        {appName}
                    </Typography.Text>
                </div>
                <Space size={8} align="center">
                    <Badge count={notificationCount} size="small">
                        <Button
                            type="text"
                            icon={<BellOutlined />}
                            style={{ color: theme === 'dark' ? '#fff' : token.colorText }}
                        />
                    </Badge>
                    <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: token.borderRadius }}>
                            <Avatar style={{ backgroundColor: token.colorPrimary }}>
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            {!collapsed && (
                                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                    <Typography.Text strong style={{ fontSize: 13, color: theme === 'dark' ? '#fff' : token.colorText }}>
                                        {user?.name}
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 11, color: theme === 'dark' ? '#feb' : token.colorText }}>
                                        {user?.email}
                                    </Typography.Text>
                                </div>
                            )}
                            <DownOutlined style={{ fontSize: 10, color: theme === 'dark' ? '#fff' : token.colorText }} />
                        </div>
                    </Dropdown>
                </Space>
            </div>
        );
        // ✅ FIX 5: collapseIcon (derived from collapsed) replaces collapsed in deps
        //    renderDefaultHeader now only rebuilds when these actually change
    }, [collapseIcon, toggle, theme, token, appName, user, notificationCount,
        onProfile, onLogout, navigate, collapsed]);

    // ─── FIX 1: memoize static JSX nodes — stops layoutJSX from always being stale
    const defaultHeaderContent = useMemo(() => (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: '100%' }}>
            <Typography.Text style={{ color: theme === 'dark' ? '#fff' : token.colorText }}>
                {appName}
            </Typography.Text>
        </div>
    ), [theme, token.colorText, appName]);

    const defaultFooterNode = useMemo(() => (
        <Footer style={{ textAlign: 'center', ...footerStyle }}>
            {footerText}
        </Footer>
    ), [footerText, footerStyle]);

    // ─── Layout JSX ───────────────────────────────────────────────────────
    const layoutJSX = useCallback(({ header, siderHeader, trigger, footer } = {}) => {
        const resolvedHeader = header ?? (defaultHeader ? defaultHeaderContent : null);
        const resolvedFooter = footer ?? (defaultFooter ? defaultFooterNode : null);
        const bgContainer = token.colorBgContainer;
        const borderRadius = token.borderRadiusLG;

        if (variant === 'none') {
            return (
                <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                    {renderSider({ siderHeader, trigger })}
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        <Content style={{ margin: '10px', padding: '10px', minHeight: '100vh', ...contentStyle }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            );
        }
        if (variant === 'default') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                        {renderSider({ siderHeader, trigger })}
                        <Layout style={{ flex: 1, minWidth: 0 }}>
                            <Header style={{
                                padding: 0,
                                height: headerHeight,
                                lineHeight: `${headerHeight}px`,
                                position: 'sticky',
                                top: 0,
                                zIndex: 99,
                                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                backgroundColor: theme === 'dark' ? '#001529' : token.colorBgContainer,
                                ...headerStyle,
                            }}>
                                {header ?? renderDefaultHeader()}
                            </Header>
                            <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                                <Outlet />
                            </Content>
                            {resolvedFooter}
                        </Layout>
                    </Layout>
                </Layout>
            );
        }
        if (variant === 'basic') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', ...headerStyle }}>
                        {resolvedHeader}
                    </Header>
                    <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            );
        }

        if (variant === 'header-content-footer') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Header style={{ display: 'flex', alignItems: 'center', ...headerStyle }}>
                        <div style={{ width: 120, height: 31, background: 'rgba(255,255,255,0.2)', margin: '0 24px 0 0', borderRadius: 6 }} />
                        {renderHeaderMenu()}
                        {header}
                    </Header>
                    <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                        <Outlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            );
        }

        if (variant === 'header-sider') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Header style={{ display: 'flex', alignItems: 'center', ...headerStyle }}>
                        <div style={{
                            width: 120,
                            height: 31,
                            background: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                            margin: '0 24px 0 0',
                            borderRadius: 6,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Typography.Text strong style={{ color: token.textColor, fontSize: 14 }}>
                                {appName}
                            </Typography.Text>
                        </div>

                        {renderHeaderMenu()}

                    </Header>
                    <div style={{ padding: '0 48px' }}>
                        <Layout style={{ padding: '24px 0', borderRadius }}>
                            {showHeaderSider && <Sider style={{ background: bgContainer }} width={200}>
                                {renderSiderMenu()}
                            </Sider>}
                            <Content style={{ padding: '10px 24px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                                <Outlet />
                            </Content>
                        </Layout>
                    </div>
                    {resolvedFooter}
                </Layout>
            );
        }

        if (variant === 'header-sider-2') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', ...headerStyle }}>
                        {siderHeader}
                        {renderHeaderMenu()}
                        {header}
                    </Header>
                    <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                        {renderSider({ trigger })}
                        <Layout style={{ flex: 1, minWidth: 0, padding: '0 24px 24px' }}>
                            <Content style={{ padding: 24, margin: 0, minHeight: 280, ...contentStyle }}>
                                <Outlet />
                            </Content>
                        </Layout>
                    </Layout>
                    {resolvedFooter}
                </Layout>
            );
        }

        if (variant === 'sider') {
            return (
                <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                    {renderSider({ siderHeader, trigger })}
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        {resolvedHeader && (
                            <Header style={{ padding: 0, height: headerHeight, lineHeight: `${headerHeight}px`, position: 'sticky', top: 0, zIndex: 99, ...headerStyle }}>
                                {resolvedHeader}
                            </Header>
                        )}
                        <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            );
        }

        if (variant === 'custom-trigger') {
            return (
                <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                    <Sider
                        trigger={null}
                        collapsible
                        collapsed={collapsed}
                        theme={theme}
                        width={width}
                        collapsedWidth={collapsedWidth}
                        style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden', flexShrink: 0, ...siderStyle }}
                    >
                        {siderHeader && (
                            <div style={{ height: headerHeight, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                {siderHeader}
                            </div>
                        )}
                        {renderSiderMenu()}
                    </Sider>
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        <Header style={{ padding: 0, background: bgContainer, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 99, ...headerStyle }}>
                            <span onClick={toggle} style={{ fontSize: 18, padding: '0 24px', cursor: 'pointer', lineHeight: `${headerHeight}px` }}>
                                {collapsed ? <RightOutlined /> : <LeftOutlined />}
                            </span>
                            {header}
                        </Header>
                        <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            );
        }

        if (variant === 'responsive') {
            return (
                <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                    <Sider
                        breakpoint={breakpoint}
                        collapsedWidth={0}
                        collapsed={collapsed}
                        onCollapse={onCollapse}
                        theme={theme}
                        width={width}
                        style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden', flexShrink: 0, ...siderStyle }}
                    >
                        {siderHeader && (
                            <div style={{ height: headerHeight, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                {siderHeader}
                            </div>
                        )}
                        {renderSiderMenu()}
                    </Sider>
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        {resolvedHeader && (
                            <Header style={{ padding: 0, height: headerHeight, position: 'sticky', top: 0, zIndex: 99, ...headerStyle }}>
                                {resolvedHeader}
                            </Header>
                        )}
                        <Content style={{ margin: '10px', padding: '10px', minHeight: 'calc(100vh - 112px)', ...contentStyle }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            );
        }

        if (variant === 'fixed-header') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Header style={{ position: 'fixed', top: 0, zIndex: 99, width: '100%', display: 'flex', alignItems: 'center', ...headerStyle }}>
                        <div style={{ width: 120, height: 31, background: 'rgba(255,255,255,0.2)', margin: '0 24px 0 0', borderRadius: 6 }} />
                        {renderHeaderMenu()}
                        {header}
                    </Header>
                    <Content style={{ padding: '0 48px', marginTop: headerHeight, ...contentStyle }}>
                        <div style={{ padding: 24, minHeight: 380, background: bgContainer, borderRadius }}>
                            <Outlet />
                        </div>
                    </Content>
                    {resolvedFooter}
                </Layout>
            );
        }

        if (variant === 'fixed-sider') {
            return (
                <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                    <Sider
                        style={{ overflow: 'auto', height: '100vh', position: 'fixed', insetInlineStart: 0, top: 0, bottom: 0, scrollbarWidth: 'thin', ...siderStyle }}
                        theme={theme}
                        width={width}
                        collapsedWidth={collapsedWidth}
                        collapsed={collapsed}
                        collapsible={collapsible}
                        onCollapse={onCollapse}
                    >
                        {siderHeader && (
                            <div style={{ height: headerHeight, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                {siderHeader}
                            </div>
                        )}
                        {renderSiderMenu()}
                    </Sider>
                    <Layout style={{ marginInlineStart: collapsed ? collapsedWidth : width, transition: 'margin-inline-start 0.2s' }}>
                        {resolvedHeader && (
                            <Header style={{ padding: 0, height: headerHeight, position: 'sticky', top: 0, zIndex: 99, ...headerStyle }}>
                                {resolvedHeader}
                            </Header>
                        )}
                        <Content style={{ margin: '24px 16px 0', overflow: 'initial', padding: 24, ...contentStyle }}>
                            <Outlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            );
        }

        return null;
    }, [
        variant, collapsed, collapsedWidth, width,
        headerHeight, theme, token, toggle, onCollapse,
        siderStyle, headerStyle, contentStyle, layoutStyle,
        defaultHeader, defaultFooter, defaultHeaderContent, defaultFooterNode,
        renderSiderMenu, renderHeaderMenu, renderSider, renderDefaultHeader,
    ]);

    return {
        collapsed,
        loading,
        items,
        headerItems,
        setStaticItems,
        setHeaderItems,
        setCollapsed,
        toggle,
        onCollapse,
        layoutJSX,
    };
};

export default useSider;
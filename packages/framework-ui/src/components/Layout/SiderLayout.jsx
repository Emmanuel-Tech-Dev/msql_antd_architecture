// src/components/Layout/SiderLayout.jsx
//
// Variants
//   'default'   — sidebar left + sticky header above content  (original)
//   'sider'     — sidebar left + sticky header beside sidebar  (original)
//   'none'      — sidebar only, no top header                  (original)
//   'icon-rail' — collapsed-only 56px icon rail, tooltip labels, no text
//   'floating'  — sidebar floats inside the page with gap + border-radius
//   'top'       — no sidebar, full-width horizontal top nav bar
//
// Color theming
//   Pass `colors` from SIDER_INIT in AppLayout to override any surface:
//   {
//     siderBg        — sidebar background
//     headerBg       — top header background
//     contentBg      — page content area background
//     accent         — active item highlight + avatar background
//     accentText     — text on accent background
//     textPrimary    — main text
//     textMuted      — secondary / muted text
//     border         — divider / border color
//     itemHover      — nav item hover background
//     itemActive     — nav item active background
//   }

import {
    Layout, Menu, Typography, theme as antTheme,
    Avatar, Badge, Button, Dropdown, Space, Tooltip,
} from 'antd';
import { Suspense, useEffect, useState } from 'react';
import {
    BellOutlined, DownOutlined, LogoutOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, NotificationOutlined, ShopOutlined, UserOutlined,
} from '@ant-design/icons';
import { SIDER_SCROLLBAR_CLASS, WORKSPACE_CONTENT_CLASS } from './layoutTailwind';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { PageLoading } from '../feedback/AppLoading';
import './SiderLayout.css';
import utils from '../../utils/function_utils';

const { Sider, Header, Content, Footer } = Layout;

// ─── Default color tokens per theme ──────────────────────────────────────────

function resolveColors(theme, token, overrides = {}) {
    // The antd theme algorithm already resolves light or dark tokens.
    const defaults = {
        siderBg: token.colorBgContainer,
        headerBg: token.colorBgContainer,
        contentBg: token.colorBgLayout,
        accent: token.colorPrimary,
        accentText: token.colorTextLightSolid,
        textPrimary: token.colorText,
        textMuted: token.colorTextSecondary,
        border: token.colorBorderSecondary,
        itemHover: token.colorBgTextHover,
        itemActive: token.colorPrimaryBg,
    };

    return { ...defaults, ...overrides };
}

function getSiderScrollbarStyle(colors, style = {}) {
    return {
        '--app-sider-scrollbar-bg': colors.siderBg,
        '--app-sider-scrollbar-tone': colors.textMuted,
        ...style,
    };
}

function UserAvatar({ user, ...props }) {
    return (
        <Avatar src={user?.avatar || undefined} {...props}>
            {utils.initials(user?.name)}
        </Avatar>
    );
}

// Pages load their code on first visit; only the page area waits for it,
// so the sidebar and header stay in place.
function PageOutlet() {
    return (
        <Suspense fallback={<PageLoading />}>
            <Outlet />
        </Suspense>
    );
}

// ─── SiderMenu ────────────────────────────────────────────────────────────────

function SiderMenu({ className, theme, tooltip, processedSiderItems, selectedKeys, openKeys, onMenuClick }) {
    const [menuOpenKeys, setMenuOpenKeys] = useState(openKeys);

    useEffect(() => {
        setMenuOpenKeys(openKeys);
    }, [openKeys]);

    return (
        <Menu
            className={className}
            theme={theme}
            tooltip={tooltip}
            mode="inline"
            selectedKeys={selectedKeys}
            openKeys={menuOpenKeys}
            onOpenChange={setMenuOpenKeys}
            onClick={onMenuClick}
            items={processedSiderItems}
            style={{
                marginTop: 2,
                overflowX: 'hidden',
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: 12,
            }}
        />
    );
}

function BusinessProfile({
    collapsed, colors, user, businessRole,
    showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    const handleProfile = () => onProfile ? onProfile() : navigate('/profile');
    const handleLogout = () => onLogout ? onLogout() : navigate('/');
    const secondaryIdentity = user?.email || user?.customId || user?.registrationNumber || 'Account';
    const profileItems = [
        ...(showSiderProfile
            ? [{ key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: handleProfile }]
            : []),
        ...(showSiderProfile && showSiderLogout ? [{ type: 'divider' }] : []),
        ...(showSiderLogout
            ? [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true, onClick: handleLogout }]
            : []),
    ];

    const profile = (
        <button
            aria-label="Open account menu"
            className={`business-sider__profile${collapsed ? ' is-collapsed' : ''}`}
            type="button"
        >
            <Badge dot color={colors.success} offset={[-3, 30]}>
                <UserAvatar
                    user={user}
                    size={36}
                    style={{ background: colors.accent, color: colors.accentText }}
                />
            </Badge>
            {!collapsed && (
                <>
                    <span className="business-sider__profile-copy">
                        <strong>{user?.name || 'Guest User'}</strong>
                        <small>{businessRole || secondaryIdentity}</small>
                    </span>
                    <DownOutlined className="business-sider__profile-chevron" />
                </>
            )}
        </button>
    );

    return (
        <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="topRight">
            {collapsed ? (
                <Tooltip
                    classNames={{ root: 'business-sider__tooltip' }}
                    title={user?.name || 'Account'}
                    placement="right"
                >
                    {profile}
                </Tooltip>
            ) : profile}
        </Dropdown>
    );
}

// ─── SiderBottomSection ───────────────────────────────────────────────────────

function SiderBottomSection({
    collapsed, colors, token,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    if (!showSiderProfile && !showSiderLogout) return null;

    return (
        <div style={{
            borderTop: `1px solid ${colors.border}`,
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
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
                        transition: 'background 0.18s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.itemHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <UserAvatar
                        user={user}
                        size={30}
                        style={{ backgroundColor: colors.accent, color: colors.accentText, flexShrink: 0 }}
                    />
                    {!collapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, overflow: 'hidden', minWidth: 0 }}>
                            <Typography.Text style={{
                                fontSize: 13, fontWeight: 500,
                                color: colors.textPrimary,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {user?.name}
                            </Typography.Text>
                            <Typography.Text style={{
                                fontSize: 11, color: colors.textMuted,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
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
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        borderRadius: token.borderRadius,
                        cursor: 'pointer',
                        color: token.colorError,
                        transition: 'background 0.18s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = token.colorErrorBg}
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
}

// ─── SiderNode (shared by default / sider / none / floating) ─────────────────

function SiderNode({
    collapsed, collapsedWidth, collapsible, breakpoint,
    reverseArrow, theme, width, headerHeight, siderStyle,
    onCollapse, siderHeader, trigger, token, colors,
    processedSiderItems, selectedKeys, openKeys,
    onMenuClick,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
}) {
    return (
        <Sider
            width={width}
            collapsed={collapsed}
            collapsedWidth={collapsedWidth}
            collapsible={collapsible}
            breakpoint={breakpoint}
            reverseArrow={reverseArrow}
            theme={theme}
            trigger={trigger !== undefined ? trigger : null}
            onCollapse={onCollapse}
            style={{
                position: 'sticky',
                top: 0,
                height: '100vh',
                overflowX: 'hidden',
                flexShrink: 0,
                backgroundColor: colors.siderBg,
                ...siderStyle,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden' }}>
                {siderHeader && (
                    <div style={{
                        height: headerHeight,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        padding: '0 4px',
                    }}>
                        {siderHeader}
                    </div>
                )}
                <div
                    className={SIDER_SCROLLBAR_CLASS}
                    style={getSiderScrollbarStyle(colors, { flex: 1, overflowY: 'auto', overflowX: 'hidden' })}
                >
                    <SiderMenu
                        theme={theme}
                        processedSiderItems={processedSiderItems}
                        selectedKeys={selectedKeys}
                        openKeys={openKeys}
                        onMenuClick={onMenuClick}
                    />
                </div>
                <SiderBottomSection
                    collapsed={collapsed}
                    colors={colors}
                    token={token}
                    user={user}
                    showSiderProfile={showSiderProfile}
                    showSiderLogout={showSiderLogout}
                    onProfile={onProfile}
                    onLogout={onLogout}
                    navigate={navigate}
                />
            </div>
        </Sider>
    );
}

// ─── DefaultHeader ────────────────────────────────────────────────────────────

function DefaultHeader({
    collapsed, toggle, colors, token,
    appName, user, notificationCount,
    onProfile, onLogout, navigate,
}) {
    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => onProfile ? onProfile() : navigate('/profile') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: () => onLogout ? onLogout() : navigate('/') },
    ];

    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px', height: '100%',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={toggle}
                    style={{ fontSize: 16, color: colors.textPrimary }}
                />
                <Typography.Text style={{ fontSize: 16, fontWeight: 500, color: colors.textPrimary }}>
                    {appName}
                </Typography.Text>
            </div>
            <Space size={8} align="center">
                <Badge count={notificationCount} size="small">
                    <Button type="text" icon={<BellOutlined />} style={{ color: colors.textPrimary }} />
                </Badge>
                <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight">
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', padding: '4px 8px',
                        borderRadius: token.borderRadius,
                    }}>
                        <UserAvatar user={user} style={{ backgroundColor: colors.accent, color: colors.accentText }} />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <Typography.Text style={{ fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>
                                {user?.name}
                            </Typography.Text>
                            <Typography.Text style={{ fontSize: 11, color: colors.textMuted }}>
                                {user?.email}
                            </Typography.Text>
                        </div>
                        <DownOutlined style={{ fontSize: 10, color: colors.textMuted }} />
                    </div>
                </Dropdown>
            </Space>
        </div>
    );
}



function SiderProfile({
    collapsed,
    colors,
    user,
    onProfile,
    onLogout,
    navigate,
}) {
    const handleProfile = () =>
        onProfile ? onProfile() : navigate('/profile');

    const handleLogout = () =>
        onLogout ? onLogout() : navigate('/');

    const profileItems = [
        ...(collapsed
            ? [
                {
                    key: 'user-info',
                    disabled: true,
                    label: (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '8px 4px',
                                // minWidth: 220,
                            }}
                        >
                            <UserAvatar
                                user={user}
                                size={42}
                                style={{
                                    // background: colors.accent,
                                    // color: colors.accentText,
                                    flexShrink: 0,
                                }}
                            />

                            <div style={{ overflow: 'hidden' }}>
                                <Typography.Text

                                    strong
                                    style={{
                                        display: 'block',
                                        // color: colors.textPrimary,
                                    }}
                                >
                                    {user?.name || 'Guest User'}
                                </Typography.Text>

                                <Typography.Text
                                    style={{
                                        display: 'block',
                                        fontSize: 12,
                                        // color: colors.textMuted,
                                    }}
                                >
                                    {user?.email || 'No email'}
                                </Typography.Text>
                            </div>
                        </div>
                    ),
                },
                { type: 'divider' },
            ]
            : []),

        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
            onClick: handleProfile,
        },
        {
            key: 'notifications',
            icon: <BellOutlined />,
            label: 'Notifications',
            onClick: handleProfile,
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            danger: true,
            onClick: handleLogout,
        },
    ];

    return (
        <Dropdown
            menu={{ items: profileItems }}
            trigger={['click']}
            placement="topRight"
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: 18,
                    transition: 'all 0.25s ease',
                    background:
                        colors.itemHover,
                    border: `1px solid ${colors.border}`,
                }}
            >
                <Badge
                    dot
                    color={colors.success}
                    offset={[-3, 30]}
                >
                    <UserAvatar
                        user={user}
                        size={35}
                        style={{
                            background: colors.accent,
                            color: colors.accentText,
                            flexShrink: 0,
                        }}
                    />
                </Badge>

                {!collapsed && (
                    <>
                        <div
                            style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <Typography.Text
                                strong
                                style={{
                                    display: 'block',
                                    color: colors.textPrimary,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {user?.name || 'Guest User'}
                            </Typography.Text>

                            <Typography.Text
                                style={{
                                    display: 'block',
                                    fontSize: 12,
                                    color: colors.textMuted,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {user?.email || 'No email'}
                            </Typography.Text>
                        </div>

                        <DownOutlined
                            style={{
                                fontSize: 12,
                                color: colors.textMuted,
                            }}
                        />
                    </>
                )}
            </div>
        </Dropdown>
    );
}

// ─── V4: Icon Rail ────────────────────────────────────────────────────────────
// 56px icon-only sidebar. All labels shown as Ant Design Tooltips on hover.
// Perfect for dense UIs where screen space matters.

function IconRailLayout({
    colors, token, processedSiderItems, selectedKeys,
    siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
    user, showSiderProfile,
    onProfile, onLogout, navigate,
    header, defaultHeader, footer, defaultFooter,
    footerText, footerStyle, appName, notificationCount,
    toggle,
}) {
    const railWidth = 56;

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={true}
            toggle={toggle}
            colors={colors}
            token={token}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onProfile={onProfile}
            onLogout={onLogout}
            navigate={navigate}
        />
        : null
    );

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
            {/* Icon rail — always collapsed, no Ant Design Sider, pure div */}
            <div style={{
                width: railWidth,
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                height: '100vh',
                backgroundColor: colors.siderBg,
                borderRight: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden',
                ...siderStyle,
            }}>
                {/* Brand / logo area */}
                {siderHeader && (
                    <div style={{
                        height: headerHeight,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderBottom: `1px solid ${colors.border}`,
                    }}>
                        {siderHeader}
                    </div>
                )}

                {/* Rail items */}
                <div
                    className={SIDER_SCROLLBAR_CLASS}
                    style={getSiderScrollbarStyle(colors, { flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', padding: '6px 0' })}
                >
                    {processedSiderItems.map((item) => {
                        // Skip group headers in rail mode — flatten them
                        if (item.type === 'group') {
                            return item.children?.map((child) => (
                                <RailIcon
                                    key={child.key}
                                    item={child}
                                    isActive={selectedKeys.includes(child.key)}
                                    colors={colors}
                                    token={token}
                                />
                            ));
                        }
                        // Dropdown group — show group icon with sub-items in tooltip
                        if (item.children?.length) {
                            return item.children.map((child) => (
                                <RailIcon
                                    key={child.key}
                                    item={child}
                                    isActive={selectedKeys.includes(child.key)}
                                    colors={colors}
                                    token={token}
                                />
                            ));
                        }
                        return (
                            <RailIcon
                                key={item.key}
                                item={item}
                                isActive={selectedKeys.includes(item.key)}
                                colors={colors}
                                token={token}
                            />
                        );
                    })}
                </div>

                {/* User avatar at bottom */}
                {showSiderProfile && (
                    <div style={{
                        padding: '10px 0',
                        borderTop: `1px solid ${colors.border}`,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Tooltip title={user?.name} placement="right">
                            <UserAvatar
                                user={user}
                                size={32}
                                onClick={() => onProfile ? onProfile() : navigate('/profile')}
                                style={{
                                    backgroundColor: colors.accent,
                                    color: colors.accentText,
                                    cursor: 'pointer',
                                }}
                            />
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Main content */}
            <Layout style={{ flex: 1, minWidth: 0 }}>
                {resolvedHeader && (
                    <Header style={{
                        padding: 0,
                        height: headerHeight,
                        lineHeight: `${headerHeight}px`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 99,
                        backgroundColor: colors.headerBg,
                        borderBottom: `1px solid ${colors.border}`,
                    }}>
                        {resolvedHeader}
                    </Header>
                )}
                <Content style={{
                    margin: '10px auto',
                    // padding: '10px',
                    minHeight: 'calc(100vh - 112px)',
                    backgroundColor: colors.contentBg,
                    ...contentStyle,
                }}>
                    <PageOutlet />
                </Content>
                {resolvedFooter}
            </Layout>
        </Layout>
    );
}

// Rail icon with tooltip
function RailIcon({ item, isActive, colors, token }) {
    return (
        <Tooltip title={item.label} placement="right">
            <div
                onClick={item.onClick}
                style={{
                    width: 36,
                    height: 36,
                    margin: '2px auto',
                    borderRadius: token.borderRadiusSM,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: isActive ? colors.itemActive : 'transparent',
                    color: isActive ? colors.accent : colors.textMuted,
                    transition: 'all 0.15s',
                    fontSize: 16,
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = colors.itemHover;
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
            >
                {item.icon}
            </div>
        </Tooltip>
    );
}

// ─── V5: Floating sider ───────────────────────────────────────────────────────
// Sidebar is a rounded card floating inside the page with margin on all sides.
// Gives a modern "detached" feel. Background should be slightly different from
// the page to create depth.

function FloatingLayout({
    colors, token, processedSiderItems, selectedKeys, openKeys,
    onMenuClick,
    theme, collapsed, collapsedWidth, width,
    siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
    user, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate,
    header, defaultHeader, footer, defaultFooter,
    footerText, footerStyle, appName, notificationCount,
    toggle,
}) {
    const GAP = 12; // gap between floating card and edges

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            colors={colors}
            token={token}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onProfile={onProfile}
            onLogout={onLogout}
            navigate={navigate}
        />
        : null
    );

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    const siderWidth = collapsed ? collapsedWidth : width;

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: colors.contentBg, ...layoutStyle }}>
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {/* Floating sidebar card */}
                <div style={{
                    position: 'sticky',
                    top: GAP,
                    height: `calc(100vh - ${GAP * 2}px)`,
                    width: siderWidth,
                    flexShrink: 0,
                    margin: `${GAP}px 0 ${GAP}px ${GAP}px`,
                    borderRadius: 12,
                    backgroundColor: colors.siderBg,
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'var(--ads-shadow-md)',
                    zIndex: 10,
                    ...siderStyle,
                }}>
                    {siderHeader && (
                        <div style={{
                            height: headerHeight,
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            padding: '0 4px',
                            borderBottom: `1px solid ${colors.border}`,
                        }}>
                            {siderHeader}
                        </div>
                    )}
                    <div
                        className={SIDER_SCROLLBAR_CLASS}
                        style={getSiderScrollbarStyle(colors, { flex: 1, overflowY: 'auto', overflowX: 'hidden' })}
                    >
                        <SiderMenu
                            theme={theme}
                            processedSiderItems={processedSiderItems}
                            selectedKeys={selectedKeys}
                            openKeys={openKeys}
                            onMenuClick={onMenuClick}
                        />
                    </div>
                    <SiderBottomSection
                        collapsed={collapsed}
                        colors={colors}
                        token={token}
                        user={user}
                        showSiderProfile={showSiderProfile}
                        showSiderLogout={showSiderLogout}
                        onProfile={onProfile}
                        onLogout={onLogout}
                        navigate={navigate}
                    />
                </div>

                {/* Main content */}
                <Layout style={{ flex: 1, minWidth: 0, backgroundColor: 'transparent' }}>
                    {resolvedHeader && (
                        <Header style={{
                            padding: 0,
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 99,
                            backgroundColor: colors.headerBg,
                            borderBottom: `1px solid ${colors.border}`,
                        }}>
                            {resolvedHeader}
                        </Header>
                    )}
                    <Content style={{
                        margin: '10px auto',
                        // padding: '10px',
                        minHeight: 'calc(100vh - 112px)',
                        ...contentStyle,
                    }}>
                        <PageOutlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </div>
        </Layout>
    );
}

// ─── V6: Top nav ──────────────────────────────────────────────────────────────
// No sidebar at all. Horizontal navigation bar at the top.
// Best for apps with 6 or fewer top-level routes.
// All menu items rendered as horizontal nav links.

function TopNavLayout({
    colors, token, processedSiderItems, selectedKeys,
    contentStyle, layoutStyle, headerHeight, headerStyle,
    user, onProfile, onLogout, navigate,
    notificationCount, appName,
    footer, defaultFooter, footerText, footerStyle,
}) {
    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => onProfile ? onProfile() : navigate('/profile') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: () => onLogout ? onLogout() : navigate('/') },
    ];

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    return (
        <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
            <Header style={{
                padding: '0 20px',
                height: headerHeight,
                lineHeight: `${headerHeight}px`,
                position: 'sticky',
                top: 0,
                zIndex: 99,
                backgroundColor: colors.headerBg,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                ...headerStyle,
            }}>
                {/* Brand */}
                <Typography.Text style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.textPrimary,
                    marginRight: 20,
                    whiteSpace: 'nowrap',
                }}>
                    {appName}
                </Typography.Text>

                {/* Nav items — flatten groups */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
                    {processedSiderItems.flatMap((item) =>
                        item.children?.length
                            ? item.children
                            : [item]
                    ).map((item) => {
                        const isActive = selectedKeys.includes(item.key);
                        return (
                            <div
                                key={item.key}
                                onClick={item.onClick}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '5px 11px',
                                    borderRadius: token.borderRadius,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: isActive ? 500 : 400,
                                    color: isActive ? colors.accent : colors.textMuted,
                                    background: isActive ? colors.itemActive : 'transparent',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = colors.itemHover;
                                        e.currentTarget.style.color = colors.textPrimary;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = colors.textMuted;
                                    }
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{item.icon}</span>
                                {item.label}
                            </div>
                        );
                    })}
                </div>

                {/* Right side */}
                <Space size={8} align="center">
                    <Badge count={notificationCount} size="small">
                        <Button type="text" icon={<BellOutlined />} style={{ color: colors.textPrimary }} />
                    </Badge>
                    <Dropdown menu={{ items: profileItems }} trigger={['click']} placement="bottomRight">
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            cursor: 'pointer', padding: '4px 8px',
                            borderRadius: token.borderRadius,
                        }}>
                            <UserAvatar user={user} style={{ backgroundColor: colors.accent, color: colors.accentText }} />
                            <DownOutlined style={{ fontSize: 10, color: colors.textMuted }} />
                        </div>
                    </Dropdown>
                </Space>
            </Header>

            <Content style={{
                margin: '10px auto',
                // padding: '10px',
                minHeight: 'calc(100vh - 112px)',
                ...contentStyle,
            }}>
                <PageOutlet />
            </Content>
            {resolvedFooter}
        </Layout>
    );
}

// ─── Main SiderLayout export ──────────────────────────────────────────────────

function BusinessLayout({
    colors, processedSiderItems, processedBottomItems, selectedKeys, openKeys,
    collapsed, collapsedWidth, width, breakpoint, reverseArrow,
    headerHeight, siderHeader, siderStyle, headerStyle, contentStyle, layoutStyle,
    user, businessName, businessRole, showSiderProfile, showSiderLogout,
    onProfile, onLogout, navigate, header, defaultHeader,
    footer, defaultFooter, footerText, footerStyle, appName,
    notificationCount, toggle, onCollapse,
}) {
    // The sidebar's colours come from the theme palette, so the menu follows
    // the app's light or dark mode rather than a fixed sider theme.
    const { isDark } = useTheme();
    const menuTheme = isDark ? 'dark' : 'light';
    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            colors={colors}
            token={{ borderRadius: 8 }}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onProfile={onProfile}
            onLogout={onLogout}
            navigate={navigate}
        />
        : null
    );
    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );
    const sidebarVariables = {
        '--business-sider-bg': colors.siderBg,
        '--business-sider-border': colors.border,
        '--business-sider-text': colors.textPrimary,
        '--business-sider-muted': colors.textMuted,
        '--business-sider-hover': colors.itemHover,
        '--business-sider-active': colors.itemActive,
        '--business-sider-accent': colors.accent,
        '--business-sider-accent-text': colors.accentText,
    };

    return (
        <Layout
            className="business-shell"
            style={{ minHeight: '100vh', background: colors.contentBg, ...layoutStyle }}
        >
            <Sider
                className="business-sider"
                width={width}
                collapsed={collapsed}
                collapsedWidth={collapsedWidth}
                collapsible={false}
                breakpoint={breakpoint}
                reverseArrow={reverseArrow}
                theme={menuTheme}
                trigger={null}
                onCollapse={onCollapse}
                style={{ ...sidebarVariables, ...siderStyle }}
            >
                <div className="business-sider__inner">
                    <div className="business-sider__brand" style={{ minHeight: headerHeight }}>
                        {siderHeader}
                    </div>

                    <Tooltip
                        classNames={{ root: 'business-sider__tooltip' }}
                        title={collapsed ? businessName : null}
                        placement="right"
                    >
                        <div className={`business-sider__workspace${collapsed ? ' is-collapsed' : ''}`}>
                            <span className="business-sider__workspace-icon" aria-hidden="true">
                                <ShopOutlined />
                            </span>
                            {!collapsed && (
                                <span className="business-sider__workspace-copy">
                                    <small>Business</small>
                                    <strong>{businessName}</strong>
                                </span>
                            )}
                        </div>
                    </Tooltip>

                    {!collapsed && <div className="business-sider__section-label">Workspace</div>}
                    <nav
                        aria-label="Primary navigation"
                        className={`${SIDER_SCROLLBAR_CLASS} business-sider__navigation`}
                        style={getSiderScrollbarStyle(colors)}
                    >
                        <SiderMenu
                            className="business-sider__menu"
                            theme={menuTheme}
                            tooltip={{
                                                                classNames: { root: 'business-sider__tooltip' },
                            }}
                            processedSiderItems={processedSiderItems}
                            selectedKeys={selectedKeys}
                            openKeys={openKeys}
                        />
                    </nav>

                    {processedBottomItems?.length > 0 && (
                        <div className="business-sider__pinned">
                            <SiderMenu
                                className="business-sider__menu business-sider__menu--pinned"
                                theme={menuTheme}
                                tooltip={{
                                                                        classNames: { root: 'business-sider__tooltip' },
                                }}
                                processedSiderItems={processedBottomItems}
                                selectedKeys={selectedKeys}
                                openKeys={[]}
                            />
                        </div>
                    )}

                    <div className="business-sider__account">
                        {(showSiderProfile || showSiderLogout) && (
                            <BusinessProfile
                                collapsed={collapsed}
                                colors={colors}
                                user={user}
                                businessRole={businessRole}
                                showSiderProfile={showSiderProfile}
                                showSiderLogout={showSiderLogout}
                                onProfile={onProfile}
                                onLogout={onLogout}
                                navigate={navigate}
                            />
                        )}
                        <Button
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            block
                            className="business-sider__collapse"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={toggle}
                            size="middle"
                            type="text"
                        >
                            {!collapsed && 'Collapse sidebar'}
                        </Button>
                    </div>
                </div>
            </Sider>

            <Layout className="business-shell__workspace" style={{ minWidth: 0 }}>
                {resolvedHeader && (
                    <Header
                        className="business-shell__header"
                        style={{
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            backgroundColor: colors.headerBg,
                            borderBottomColor: colors.border,
                            ...headerStyle,
                        }}
                    >
                        {resolvedHeader}
                    </Header>
                )}
                <Content
                    className={`${WORKSPACE_CONTENT_CLASS} business-shell__content`}
                    style={{ backgroundColor: colors.contentBg, ...contentStyle }}
                >
                    <PageOutlet />
                </Content>
                {resolvedFooter}
            </Layout>
        </Layout>
    );
}

export default function SiderLayout({
    variant, collapsed, collapsedWidth, collapsible, breakpoint,
    reverseArrow, theme, width, headerHeight,
    siderStyle, headerStyle, contentStyle, layoutStyle, footerStyle,
    footerText, appName, user, businessName, businessRole, notificationCount,
    onLogout, onProfile, showSiderProfile, showSiderLogout,
    defaultHeader, defaultFooter,
    processedSiderItems, processedBottomItems,
    selectedKeys, openKeys,
    onCollapse, toggle, onMenuClick, siderHeader, header, footer, trigger,
    // New: color overrides passed from SIDER_INIT via AppLayout
    colors: colorOverrides,
}) {
    const { token } = antTheme.useToken();
    const navigate = useNavigate();

    // Resolve final color set — defaults per theme, then SIDER_INIT overrides
    const colors = resolveColors(theme, token, colorOverrides);

    const sharedSiderProps = {
        collapsed, collapsedWidth, collapsible, breakpoint,
        reverseArrow, theme, width, headerHeight, siderStyle,
        onCollapse, siderHeader, trigger, token, colors,
        processedSiderItems, selectedKeys, openKeys, onMenuClick,
        user, showSiderProfile, showSiderLogout,
        onProfile, onLogout, navigate,
    };

    const sharedLayoutProps = {
        colors, token, processedSiderItems, processedBottomItems, selectedKeys, openKeys, onMenuClick,
        theme, collapsed, collapsedWidth, width,
        siderHeader, headerHeight, siderStyle, contentStyle, layoutStyle,
        user, businessName, businessRole, showSiderProfile, showSiderLogout,
        onProfile, onLogout, navigate,
        header, defaultHeader, footer, defaultFooter,
        footerText, footerStyle, appName, notificationCount,
        breakpoint, reverseArrow, onCollapse, collapsible, toggle,
    };

    //  console.log('SiderLayout props:', { sharedLayoutProps, sharedSiderProps });

    if (variant === 'business') {
        return <BusinessLayout {...sharedLayoutProps} />;
    }

    const resolvedHeader = header ?? (defaultHeader
        ? <DefaultHeader
            collapsed={collapsed}
            toggle={toggle}
            colors={colors}
            token={token}
            appName={appName}
            user={user}
            notificationCount={notificationCount}
            onProfile={onProfile}
            onLogout={onLogout}
            navigate={navigate}
        />
        : null
    );

    const resolvedFooter = footer ?? (defaultFooter
        ? <Footer style={{ textAlign: 'center', ...footerStyle }}>{footerText}</Footer>
        : null
    );

    // ── icon-rail ──────────────────────────────────────────────────────────
    if (variant === 'icon-rail') {
        return <IconRailLayout {...sharedLayoutProps} />;
    }

    // ── floating ───────────────────────────────────────────────────────────
    if (variant === 'floating') {
        return <FloatingLayout {...sharedLayoutProps} />;
    }

    // ── top ────────────────────────────────────────────────────────────────
    if (variant === 'top') {
        return (
            <TopNavLayout
                colors={colors}
                token={token}
                processedSiderItems={processedSiderItems}
                selectedKeys={selectedKeys}
                contentStyle={contentStyle}
                layoutStyle={layoutStyle}
                headerHeight={headerHeight}
                headerStyle={headerStyle}
                user={user}
                onProfile={onProfile}
                onLogout={onLogout}
                navigate={navigate}
                notificationCount={notificationCount}
                appName={appName}
                footer={footer}
                defaultFooter={defaultFooter}
                footerText={footerText}
                footerStyle={footerStyle}
            />
        );
    }

    // ── none ───────────────────────────────────────────────────────────────
    if (variant === 'none') {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                <SiderNode {...sharedSiderProps} />
                <Layout style={{ flex: 1, minWidth: 0 }}>
                    <Content style={{
                        margin: '10px auto', // padding: '10px',
                        minHeight: '100vh',
                        backgroundColor: colors.contentBg,
                        ...contentStyle,
                    }}>
                        <PageOutlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── sider ──────────────────────────────────────────────────────────────
    if (variant === 'sider') {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row', ...layoutStyle }}>
                <SiderNode {...sharedSiderProps} />
                <Layout style={{ flex: 1, minWidth: 0 }}>
                    {resolvedHeader && (
                        <Header style={{
                            padding: 0,
                            height: headerHeight,
                            lineHeight: `${headerHeight}px`,
                            position: 'sticky',
                            top: 0,
                            zIndex: 99,
                            backgroundColor: colors.headerBg,
                            borderBottom: `1px solid ${colors.border}`,
                            ...headerStyle,
                        }}>
                            {resolvedHeader}
                        </Header>
                    )}
                    <Content style={{
                        margin: '10px auto', // padding: '10px',
                        minHeight: 'calc(100vh - 112px)',
                        backgroundColor: colors.contentBg,
                        ...contentStyle,
                    }}>
                        <PageOutlet />
                    </Content>
                    {resolvedFooter}
                </Layout>
            </Layout>
        );
    }

    // ── default ────────────────────────────────────────────────────────────
    if (variant === 'default') {
        return (
            <Layout style={{ minHeight: '100vh', ...layoutStyle }}>
                <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                    <SiderNode {...sharedSiderProps} />
                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        {resolvedHeader && (
                            <Header style={{
                                padding: 0,
                                height: headerHeight,
                                lineHeight: `${headerHeight}px`,
                                position: 'sticky',
                                top: 0,
                                zIndex: 99,
                                backgroundColor: colors.headerBg,
                                borderBottom: `1px solid ${colors.border}`,
                                ...headerStyle,
                            }}>
                                {resolvedHeader}
                            </Header>
                        )}
                        <Content style={{
                            margin: '10px auto',
                            // padding: '10px',
                            minHeight: 'calc(100vh - 112px)',
                            backgroundColor: colors.contentBg,
                            ...contentStyle,
                        }}>
                            <PageOutlet />
                        </Content>
                        {resolvedFooter}
                    </Layout>
                </Layout>
            </Layout>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // NEW VARIANT: "premium"
    // Add this inside SiderLayout BEFORE the default variant check
    // ─────────────────────────────────────────────────────────────

    if (variant === 'premium') {
        //    console.log('Rendering Premium SiderLayout with props:', { showSiderProfile, showSiderLogout, user, appName, notificationCount });
        return (
            <Layout
                style={{
                    minHeight: '100vh',
                    // background: colors.contentBg,
                    ...layoutStyle,
                }}
            >
                <Layout style={{ display: 'flex', flexDirection: 'row' }}>
                    <Sider
                        width={width}
                        collapsed={collapsed}
                        collapsedWidth={collapsedWidth}
                        collapsible={false}
                        theme={theme}
                        style={{
                            position: 'sticky',
                            top: 0,
                            height: '100vh',
                            overflow: 'hidden',
                            background: colors.siderBg,
                            borderRight: `1px solid ${colors.border}`,
                            // boxShadow:
                            //     theme === 'dark'
                            //         ? '8px 0 30px rgba(0,0,0,0.35)'
                            //         : '8px 0 30px rgba(15,23,42,0.08)',
                            ...siderStyle,
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Brand Header */}
                            <div
                                style={{
                                    height: headerHeight,
                                    padding: collapsed ? '0 12px' : '0 18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: collapsed
                                        ? 'center'
                                        : 'space-between',
                                    borderBottom: `1px solid ${colors.border}`,
                                    flexShrink: 0,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {siderHeader}
                                </div>


                            </div>

                            {/* Menu */}
                            <div
                                className={SIDER_SCROLLBAR_CLASS}
                                style={getSiderScrollbarStyle(colors, {
                                    flex: 1,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    padding: '12px 8px',
                                })}
                            >
                                <SiderMenu
                                    theme={theme}
                                    processedSiderItems={processedSiderItems}
                                    selectedKeys={selectedKeys}
                                    openKeys={openKeys}
                                    onMenuClick={onMenuClick}
                                />
                            </div>

                            {/* Bottom Profile + Logout */}
                            <div
                                style={{
                                    padding: 12,
                                    borderTop: `1px solid ${colors.border}`,
                                    background: colors.itemHover,
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                {/* User Card */}
                                {showSiderProfile && (
                                    <SiderProfile
                                        collapsed={collapsed}
                                        toggle={toggle}
                                        colors={colors}
                                        token={token}
                                        appName={appName}
                                        user={user}
                                        notificationCount={notificationCount}
                                        onProfile={onProfile}
                                        onLogout={onLogout}
                                        navigate={navigate}
                                    />
                                )}

                                {/* Logout Button */}
                                {/* {showSiderLogout && (
                                    <Button
                                        danger
                                        block
                                        icon={<LogoutOutlined />}
                                        onClick={() =>
                                            onLogout
                                                ? onLogout()
                                                : navigate('/')
                                        }
                                        style={{
                                            height: 42,
                                            borderRadius: 14,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {!collapsed && 'Logout'}
                                    </Button>
                                )} */}


                                <Button
                                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                    type="text"
                                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                    onClick={toggle}
                                    style={{
                                        color: colors.textMuted,
                                        borderRadius: 10,
                                        textAlign: 'center',
                                        width: '100%',
                                        marginTop: 12,

                                    }}
                                />

                            </div>
                        </div>
                    </Sider>

                    <Layout style={{ flex: 1, minWidth: 0 }}>
                        {resolvedHeader && (
                            <Header
                                style={{
                                    padding: 0,
                                    height: headerHeight,
                                    lineHeight: `${headerHeight}px`,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 99,
                                    backgroundColor: colors.headerBg,
                                    borderBottom: `1px solid ${colors.border}`,
                                    ...headerStyle,
                                }}
                            >
                                {resolvedHeader}
                            </Header>
                        )}

                        <Content
                            className={WORKSPACE_CONTENT_CLASS}
                            style={{
                                margin: '10px auto',
                                // padding: '16px',
                                minHeight: 'calc(100vh - 112px)',
                                backgroundColor: colors.contentBg,
                                borderRadius: 18,
                                ...contentStyle,
                            }}
                        >
                            <PageOutlet />
                        </Content>

                        {resolvedFooter}
                    </Layout>
                </Layout>
            </Layout>
        );
    }

    return null;
}

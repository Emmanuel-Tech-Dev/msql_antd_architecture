// src/components/AppLayout.jsx

import {
    DashboardOutlined, UserOutlined, SettingOutlined,
    FileOutlined, TeamOutlined, SafetyOutlined,
    KeyOutlined, ApiOutlined, ToolOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import useSider from '../../hooks/useSider';
import { Avatar, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { useBrowserRoutes, useResourcesReady } from '../../core/provider/ResourceProvider';
import useAuthStore from '../../store/authStore';
import { useMemo } from 'react';
import { Spin } from 'antd';
import useRouteGuard from '../../core/hooks/access/useRouteGuard';

const ICON_MAP = {
    DashboardOutlined: <DashboardOutlined />,
    UserOutlined: <UserOutlined />,
    SettingOutlined: <SettingOutlined />,
    FileOutlined: <FileOutlined />,
    TeamOutlined: <TeamOutlined />,
    SafetyOutlined: <SafetyOutlined />,
    KeyOutlined: <KeyOutlined />,
    ApiOutlined: <ApiOutlined />,
    ToolOutlined: <ToolOutlined />,
    AppstoreOutlined: <AppstoreOutlined />,
};

const resolveIcon = (iconString) => ICON_MAP[iconString] ?? <AppstoreOutlined />;

// initConfig — layout structure decisions, never change after mount
const SIDER_INIT = {
    variant: 'default', //none , default, sider, top
    width: 220,
    collapsedWidth: 80,
    breakpoint: 'lg',
    theme: 'dark',
    isGrouped: true,
    groupKey: 'category',
    groupVariant: 'dropdown',
    bottomKey: '/admin/settings/system_logs',
    defaultHeader: true,
    defaultFooter: false,
    showSiderProfile: true,
    showSiderLogout: true,
};

export default function AppLayout() {
    // useRouteGuard handles checking permissions and bootstrapping state
    const { isAllowed, isReady } = useRouteGuard('/login');

    const navigate = useNavigate();

    const browserRoutes = useBrowserRoutes();
    const user = useAuthStore((s) => s.user);

    const items = useMemo(() =>
        browserRoutes.map((route) => ({
            key: route.resource_path,
            label: route.resource,
            icon: resolveIcon(route.icon),
            path: route.resource_path,
            order: route.order ?? 0,
            category: route.category ?? null,
        })),
        [browserRoutes]
    );

    // liveConfig — reactive values that change after mount
    const sider = useSider(SIDER_INIT, {
        items,
        appName: 'Admin Panel',
        user: {
            name: user?.name ?? 'Admin',
            email: user?.email ?? '',
        },
        notificationCount: 0,
        onLogout: () => navigate('/login'),
        onProfile: () => navigate('/profile'),
    });

    // NOW we can return early after all hooks are declared
    if (!isAllowed || !isReady) return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: '#f5f5f5',
        }}>
            <Spin size="large" tip="Securing session..." />
        </div>
    );



    const siderHeader = (
        <div style={{
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
        }}>
            {sider.collapsed
                ? <Avatar style={{ background: '#1677ff', flexShrink: 0 }}>A</Avatar>
                : <Typography.Text strong style={{ color: '#fff', fontSize: 15 }}>
                    Admin Panel
                </Typography.Text>
            }
            <div style={{ marginLeft: 'auto' }}>
                <ThemeToggle />
            </div>
        </div>
    );

    return sider.layoutJSX({ siderHeader, trigger: null });
}
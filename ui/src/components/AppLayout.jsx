// src/components/AppLayout.jsx

import {
    DashboardOutlined,
    UserOutlined,
    SettingOutlined,
    FileOutlined,
    TeamOutlined,
    SafetyOutlined,
    KeyOutlined,
    ApiOutlined,
    ToolOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import useSider from '../hooks/useSider';
import { Avatar, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useBrowserRoutes } from '../core/provider/ResourceProvider';
import useAuthStore from '../store/authStore';
import { useMemo } from 'react';

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

const resolveIcon = (iconString) =>
    ICON_MAP[iconString] ?? <AppstoreOutlined />;

export default function AppLayout({ AppReload }) {
    const navigate = useNavigate();
    const browserRoutes = useBrowserRoutes();
    const user = useAuthStore((s) => s.user);

    // transform admin_resources BROWSER_ROUTE rows into useSider item shape
    const items = useMemo(() =>
        browserRoutes.map((route) => ({
            key: route.resource_path,
            label: route.resource,
            icon: resolveIcon(route.icon),
            path: route.resource_path,
            order: route.order ?? 0,
            // category maps to groupKey in useSider
            category: route.category ?? null,
        })),
        [browserRoutes]
    );


    console.log("Sider items:", items);

    const sider = useSider({
        variant: 'none',
        width: 225,
        items,
        isGrouped: true,
        groupKey: 'category',
        groupVariant: 'dropdown',
        appName: 'Admin Panel',
        showSiderProfile: true,
        showSiderLogout: true,
        user: {
            name: user?.name ?? 'Admin',
            email: user?.email ?? '',
        },
        notificationCount: 0,
        onLogout: () => { navigate('/login'); },
        onProfile: () => navigate('/profile'),
    });

    const siderHeader = (
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {sider.collapsed
                ? <Avatar style={{ background: '#1677ff' }}>A</Avatar>
                : <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>MyApp</Typography.Text>
            }
            <ThemeToggle />
        </div>
    );

    return sider.layoutJSX({ siderHeader, trigger: null });
}
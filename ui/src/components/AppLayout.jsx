
import {
    DashboardOutlined, UserOutlined,
    SettingOutlined, FileOutlined, TeamOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import useSider from '../hooks/useSider';
import { Avatar, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const items = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined />, path: '/dashboard', order: 1 },
    { key: 'users', label: 'Users', icon: <TeamOutlined />, path: '/users', order: 1, group: 'Management' },
    { key: 'roles', label: 'Roles', icon: <UserOutlined />, path: '/roles', order: 2, group: 'Management' },
    { key: 'sales', label: 'Sales', icon: <FileOutlined />, path: '/sales', order: 1, group: 'Reports' },
    { key: 'settings', label: 'Settings', icon: <SettingOutlined />, path: '/settings', order: 2 },
];

export default function AppLayout({ AppReload }) {
    const navigate = useNavigate()
    const sider = useSider({
        variant: 'none',
        items,
        isGrouped: false,
        groupKey: 'group',
        groupVariant: 'dropdown',
        appName: 'Admin Panel',
        showSiderProfile: true,   // shows avatar + name + email at bottom
        showSiderLogout: true,
        user: { name: 'Emmanuel', email: 'emmanuel@example.com' },
        notificationCount: 5,
        onLogout: () => { console.log("logged out"); navigate('/login'); },
        onProfile: () => navigate('/profile'),

        // headerStyle: {
        //     background: "#fff",
        //     color: "#000"
        // }
        // contentStyle: {
        //     // margin: "100px 0"
        // }
    });
    const siderHeader = (
        <div style={{ padding: '0 16px' }}>
            {sider.collapsed
                ? <Avatar style={{ background: '#1677ff' }}>A</Avatar>
                : <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>MyApp</Typography.Text>
            }
            {/* <Button onClick={() => AppReload()} /> */}
        </div>
    );

    // const header = (
    //     <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#001529' }}>
    //         <Button
    //             type="text"
    //             icon={sider.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    //             onClick={sider.toggle}
    //             style={{ color: '#fff', fontSize: 16 }}
    //         />
    //     </div>
    // );

    return sider.layoutJSX({ siderHeader, trigger: null });
}
//How grouping works

// items = [
//     { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },        // no group → ungrouped → renders as basic item
//     { key: 'users', label: 'Users', path: '/users', group: 'User Management' },  // grouped
//     { key: 'roles', label: 'Roles', path: '/roles', group: 'User Management' },  // grouped
//     { key: 'settings', label: 'Settings', path: '/settings' },        // no group → ungrouped → renders as basic item
// ]

// isGrouped: true, groupKey: 'group', groupVariant: 'dropdown'

// result menu:
// Dashboard          ← ungrouped, basic item
//   User Management    ← dropdown group
// Users
// Roles
// Settings           ← ungrouped, basic item
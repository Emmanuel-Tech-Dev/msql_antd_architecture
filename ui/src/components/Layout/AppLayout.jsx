import { useCallback, useMemo } from "react";
import { Avatar, Button, Spin, Tag, Tooltip, Typography } from "antd";
import { BookOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useBrowserRoutes, useNavigationRoutes } from "../../core/provider/ResourceProvider";
import useRouteGuard from "../../core/hooks/access/useRouteGuard";
import useLogout from "../../core/hooks/auth/useLogout";
import useAuthStore from "../../store/authStore";
import useIcons from "../../hooks/useIcons";
import useNotification from "../../hooks/useNotification";
import useSider from "../../hooks/useSider";
import { useTheme } from "../../hooks/useTheme";
import "./AppLayout.css";

function SecureSessionFallback() {
  return (
    <div className="secure-session">
      {/* <div className="secure-session__mark">B</div> */}
      <Spin size="small" />
      <div>
        <Typography.Text strong>Preparing your workspace</Typography.Text>
        <Typography.Text type="secondary">Verifying access and loading assigned routes.</Typography.Text>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { isAllowed, isReady } = useRouteGuard("/login");
  const { message } = useNotification();
  const { resolveIcon } = useIcons();
  const navigate = useNavigate();
  const location = useLocation();
  const browserRoutes = useBrowserRoutes();
  const navigationRoutes = useNavigationRoutes();
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const { appearance: siderConfig } = useTheme();
  const shellConfig = useMemo(() => ({
    ...siderConfig,
    headerStyle: siderConfig.header.sticky
      ? { position: "sticky", top: 0, zIndex: 20 }
      : undefined,
    contentStyle: {
      margin: "10px auto",
      maxWidth: siderConfig.content.maxWidth,
      padding: siderConfig.content.padding,
      width: "calc(100% - 24px)",
      borderRadius: siderConfig.application.borderRadius,
    },
  }), [siderConfig]);

  const { mutate: logout } = useLogout({
    mutationOptions: {
      onSuccess: () => {
        message.success("Logged out successfully");
        navigate("/login", { replace: true });
      },
      onError: (error) => {
        message.error(error?.message || "Failed to logout. Please try again.");
        navigate("/login", { replace: true });
      },
    },
  });

  const navItems = useMemo(
    () =>
      navigationRoutes
        .map((route) => ({
          key: route.resource_path,
          label: route.resource,
          icon: resolveIcon(route.icon),
          path: route.resource_path,
          order: route.order ?? route.display_order ?? 0,
          category: route.category ?? null,
        })),
    [navigationRoutes, resolveIcon],
  );

  const currentRoute = useMemo(
    () => browserRoutes.find((route) => route.resource_path === location.pathname),
    [browserRoutes, location.pathname],
  );
  const activeRole = String(roles[0]?.role_id ?? roles[0] ?? "Member");

  const handleLogout = useCallback(() => logout(), [logout]);
  const handleProfile = useCallback(() => navigate("/admin/profile"), [navigate]);

  const sider = useSider(shellConfig, {
    items: navItems,
    appName: siderConfig.brand.name,
    user: {
      name: user?.name ?? "Admin",
      email: user?.email ?? "",
      avatar: user?.avatar ?? user?.profile_picture ?? null,
    },
    notificationCount: 0,
    showSiderProfile: true,
    showSiderLogout: true,
    onLogout: handleLogout,
    onProfile: handleProfile,
  });

  const siderHeader = (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 10,
        minWidth: 0,
        width: "100%",
      }}
    >
      <Avatar
        shape="square"
        className="workspace-brand__mark"
        style={{ background: siderConfig.colors.accent, color: siderConfig.colors.accentText }}
      >
        {siderConfig.brand.mark}
      </Avatar>
      {!sider.collapsed ? (
        <div style={{ minWidth: 0 }}>
          <Typography.Text className="workspace-brand__name" style={{ color: siderConfig.colors.textPrimary }} strong>
            {siderConfig.brand.name}
          </Typography.Text>
          <Typography.Text className="workspace-brand__caption" style={{ color: siderConfig.colors.textMuted }}>
            {siderConfig.brand.caption}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );

  if (!isAllowed || !isReady) return <SecureSessionFallback />;

  const workspaceHeader = (
    <div className="workspace-header">
      <div className="workspace-header__context">
        <Typography.Text className="workspace-header__eyebrow">
          {currentRoute?.category ?? "WORKSPACE"}
        </Typography.Text>
        <Typography.Text className="workspace-header__title" strong>
          {currentRoute?.resource ?? "Overview"}
        </Typography.Text>
      </div>
      <div className="workspace-header__status">
        <Button
          className="workspace-header__docs"
          icon={<BookOutlined />}
          onClick={() => navigate('/docs')}
        >
          Documentation
        </Button>
        {siderConfig.header.showSystemStatus && <span className="workspace-header__live"><i /> System live</span>}
        {siderConfig.header.showRole && <Tag bordered={false}>{activeRole}</Tag>}
        {siderConfig.collapsible && !["top", "none"].includes(siderConfig.variant) && (
          <Tooltip title={sider.collapsed ? "Expand navigation" : "Collapse navigation"}>
            <Button
              className="workspace-header__collapse"
              type="text"
              icon={sider.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={sider.collapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={sider.toggle}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );

  return sider.layoutJSX({
    siderHeader,
    // header: workspaceHeader,
    trigger: null,
  });
}

import { useCallback, useMemo } from "react";
import { Avatar, Spin, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useNavigationRoutes } from "../../core/provider/ResourceProvider";
import useRouteGuard from "../../core/hooks/access/useRouteGuard";
import useLogout from "../../core/hooks/auth/useLogout";
import useAuthStore from "../../store/authStore";
import useIcons from "../../hooks/useIcons";
import useNotification from "../../hooks/useNotification";
import useSider from "../../hooks/useSider";
import { useTheme } from "../../hooks/useTheme";

function SecureSessionFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3.5 bg-[var(--color-bg-base)] bg-[linear-gradient(rgba(26,23,20,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(26,23,20,0.035)_1px,transparent_1px)] text-[var(--color-text-primary)] [background-size:32px_32px] [&>div:last-child>span]:block [&>div:last-child>span:last-child]:mt-0.5 [&>div:last-child>span:last-child]:text-xs">
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
  const navigationRoutes = useNavigationRoutes();
  const user = useAuthStore((state) => state.user);
  const { appearance: siderConfig } = useTheme();
  const shellConfig = useMemo(() => ({
    ...siderConfig,
    headerStyle: siderConfig?.header?.sticky
      ? { position: "sticky", top: 0, zIndex: 20 }
      : undefined,
    contentStyle: {
      margin: "10px auto",
      maxWidth: siderConfig?.content.maxWidth,
      padding: siderConfig?.content.padding,
      width: "calc(100% - 24px)",
      borderRadius: siderConfig?.application.borderRadius,
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

  const handleLogout = useCallback(() => logout(), [logout]);
  const handleProfile = useCallback(() => navigate("/admin/profile"), [navigate]);

  const sider = useSider(shellConfig, {
    items: navItems,
    appName: siderConfig?.brand.name,
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
        className="shrink-0 !rounded-[var(--ads-radius-md)] !font-[var(--font-display)] !font-extrabold !text-[var(--ads-text-inverse)]"
        style={{ background: siderConfig?.colors.accent, color: siderConfig?.colors.accentText }}
      >
        {siderConfig?.brand.mark}
      </Avatar>
      {!sider?.collapsed ? (
        <div style={{ minWidth: 0 }}>
          <Typography.Text className="block !font-[var(--font-display)] !text-[15px] !leading-[1.1]" style={{ color: siderConfig?.colors.textPrimary }} strong>
            {siderConfig?.brand.name}
          </Typography.Text>
          <Typography.Text className="mt-[3px] block !font-mono !text-[9px] uppercase tracking-[0.08em]" style={{ color: siderConfig?.colors.textMuted }}>
            {siderConfig?.brand.caption}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );

  if (!isAllowed || !isReady) return <SecureSessionFallback />;

  return sider.layoutJSX({
    siderHeader,
    trigger: null,
  });
}

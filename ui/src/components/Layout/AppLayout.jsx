import { useCallback, useMemo } from "react";
import { Avatar, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useNavigationRoutes } from "../../core/provider/ResourceProvider";
import useRouteGuard from "../../core/hooks/access/useRouteGuard";
import useLogout from "../../core/hooks/auth/useLogout";
import useAuthStore from "../../store/authStore";
import useIcons from "../../hooks/useIcons";
import useNotification from "../../hooks/useNotification";
import useSider from "../../hooks/useSider";
import { useTheme } from "../../hooks/useTheme";
import useScrollToTop from "../../hooks/useScrolToTop";
import AppLoading from "../feedback/AppLoading";

export default function AppLayout() {
  const { isAllowed, isReady } = useRouteGuard("/login");
  const { message } = useNotification();
  const { resolveIcon } = useIcons();
  const navigate = useNavigate();
  useScrollToTop();
  const navigationRoutes = useNavigationRoutes();
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const { appearance: siderConfig } = useTheme();
  const businessName = user?.business?.name
    ?? user?.business_name
    ?? user?.organization_name
    ?? "Business";

  const primaryRole = roles?.[0];
  const businessRole = typeof primaryRole === "string"
    ? primaryRole
    : primaryRole?.role_name ?? primaryRole?.name ?? "";

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
      customId: user?.custom_id ?? "",
      registrationNumber: user?.registration_number ?? "",
      avatar: user?.avatar ?? user?.profile_picture ?? null,
    },
    businessName,
    businessRole,
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
        className="shrink-0 rounded-(--ads-radius-md)! !font-[var(--font-display)] !font-extrabold !text-[var(--ads-text-inverse)]"
        style={{ background: siderConfig?.colors.accent, color: siderConfig?.colors.accentText }}
      >
        {siderConfig?.brand.mark}
      </Avatar>
      {!sider?.collapsed ? (
        <div style={{ minWidth: 0 }}>
          <Typography.Text className="block !font-[var(--font-display)] !text-[15px] !leading-[1.1]" style={{ color: siderConfig?.colors.textPrimary }} strong>
            {siderConfig?.brand.name}
          </Typography.Text>
          <Typography.Text className="mt-[3px] block !font-mono !text-[length:var(--ads-font-size-caption)] uppercase tracking-[0.08em]" style={{ color: siderConfig?.colors.textMuted }}>
            {siderConfig?.brand.caption}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );

  if (!isAllowed || !isReady) return <AppLoading />;

  return sider.layoutJSX({
    siderHeader,
    trigger: null,
  });
}

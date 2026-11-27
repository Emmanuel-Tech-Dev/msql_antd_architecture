import "react-skeletonify/dist/index.css";

import { lazy, Suspense, useMemo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SkeletonProvider } from "react-skeletonify";
import { ThemeProvider } from "./utils/ThemeProvider.jsx";
import FrameworkProvider from "./core/provider/FrameworkProvider.jsx";
import mysqlOrmProvider from "./core/provider/mysqlOrmProvider.js";
import mysqlOrmAuthProvider from "./core/provider/mysqlOrmAuthProvider.js";
import SocketProvider from "./core/realtime/SocketProvider.jsx";
import { configureFramework } from "./core/config/frameworkConfig";
import { setWorkspaceAreas } from "./core/navigation/routeResolver";

const AppLayout = lazy(() => import("./components/Layout/AppLayout"));
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const OtpRequest = lazy(() => import("./pages/auth/OtpRequest"));
const OtpVerify = lazy(() => import("./pages/auth/OtpVerify"));
const ChangePassword = lazy(() => import("./pages/auth/ChangePassword"));
const NotFound404 = lazy(() => import("./components/feedback/NotFound404"));
const Users = lazy(() => import("./pages/admin/Users"));
const UserStatistics = lazy(() => import("./pages/admin/UserStatistics"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Permissions = lazy(() => import("./pages/admin/Permissions"));
const Resources = lazy(() => import("./pages/admin/Resources"));
const SystemLogs = lazy(() => import("./pages/settings/SystemLogs"));
const DatabaseBackup = lazy(() => import("./pages/settings/DatabaseBackup"));
const AppearanceSettings = lazy(() => import("./pages/settings/AppearanceSettings"));
const DataModel = lazy(() => import("./pages/settings/dataModel/DataModel"));
const ProfileSettings = lazy(() => import("./pages/settings/ProfileSettings"));
const Documentation = lazy(() => import("./pages/docs/Documentation"));

// Users and Roles ship with the framework; a project adds its own resources after them.
const FRAMEWORK_RESOURCES = [
  {
    name: "admin",
    label: "Users",
    permissions: { list: "read:admin", create: "create:admin", edit: "update:admin", delete: "delete:admin" },
    meta: { mysql: { tableConfig: { searchable: ["name", "email"] } } },
  },
  {
    name: "admin_roles",
    label: "Roles",
    permissions: { list: "read:admin_roles", create: "create:admin_roles", edit: "update:admin_roles", delete: "delete:admin_roles" },
    meta: {},
  },
];

const NO_RESOURCES = [];
const NO_AREAS = {};
const SKELETON = { animation: "animation-1", borderRadius: "8px", animationSpeed: 2 };

// The whole framework app: providers, sign-in pages, the /admin layout and its pages.
// `routes` are the project's pages inside /admin; `publicRoutes` sit outside sign-in.
// `areas` adds more signed-in areas with the same layout: { finance: <Route …/> } serves /finance/….
export default function FrameworkApp({
  config = {},
  resources = NO_RESOURCES,
  routes = null,
  publicRoutes = null,
  areas = NO_AREAS,
  dataProvider,
  authProvider,
}) {
  configureFramework(config);
  setWorkspaceAreas(Object.keys(areas));
  const data = useMemo(() => dataProvider ?? mysqlOrmProvider(config.apiUrl), [config.apiUrl, dataProvider]);
  const auth = useMemo(() => authProvider ?? mysqlOrmAuthProvider(), [authProvider]);
  const allResources = useMemo(() => [...FRAMEWORK_RESOURCES, ...resources], [resources]);

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <BrowserRouter>
        <ThemeProvider>
          <AntdApp>
            <FrameworkProvider dataProvider={data} authProvider={auth} resources={allResources}>
              <SocketProvider>
                <SkeletonProvider config={SKELETON}>
                  <Suspense fallback={<div className="flex min-h-40 items-center justify-center">Loading…</div>}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/login" replace />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/docs" element={<Documentation />} />
                      <Route path="/init_psd_recovery" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<Navigate to="/reset_password" replace />} />
                      <Route path="/reset_password" element={<ResetPassword />} />
                      <Route path="/otp_request" element={<OtpRequest />} />
                      <Route path="/verify_otp" element={<OtpVerify />} />
                      <Route path="/change-password" element={<Navigate to="/change_password" replace />} />
                      <Route path="/change_password" element={<ChangePassword />} />
                      <Route path="/auth/otp/request-login/*" element={<Navigate to="/otp_request" replace />} />
                      <Route path="/auth/otp/verify-login/*" element={<Navigate to="/verify_otp" replace />} />
                      {publicRoutes}

                      <Route path="/admin" element={<AppLayout />}>
                        {routes}
                        <Route path="management/users" element={<Users />} />
                        <Route path="management/user-statistics" element={<UserStatistics />} />
                        <Route path="management/roles&permissions" element={<Roles />} />
                        <Route path="management/permissions" element={<Permissions />} />
                        <Route path="management/resources" element={<Resources />} />
                        <Route path="settings/system_logs" element={<SystemLogs />} />
                        <Route path="settings/database_backup" element={<DatabaseBackup />} />
                        <Route path="settings/appearance" element={<AppearanceSettings />} />
                        <Route path="settings/data-model" element={<DataModel />} />
                        <Route path="profile" element={<ProfileSettings />} />
                        <Route path="404" element={<NotFound404 />} />
                        <Route path="*" element={<NotFound404 />} />
                      </Route>

                      {Object.entries(areas).map(([name, areaRoutes]) => (
                        <Route key={name} path={`/${name}`} element={<AppLayout />}>
                          {areaRoutes}
                          <Route path="*" element={<NotFound404 />} />
                        </Route>
                      ))}

                      <Route path="/404" element={<NotFound404 />} />
                      <Route path="*" element={<NotFound404 />} />
                    </Routes>
                  </Suspense>
                </SkeletonProvider>
              </SocketProvider>
            </FrameworkProvider>
          </AntdApp>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

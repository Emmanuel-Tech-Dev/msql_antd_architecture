// components/UsersTable.jsx
import "react-skeletonify/dist/index.css";

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SkeletonProvider } from 'react-skeletonify';
import TestFramework from "./pages/admin/Test";

const AppLayout = lazy(() => import("./components/Layout/AppLayout"));
const Test = lazy(() => import("./pages/Test"));
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


export default function App() {

  return (
    <>
      <SkeletonProvider
        config={{
          animation: "animation-1",
          borderRadius: "8px",
          animationSpeed: 2,
        }}
      >
        <Suspense fallback={<div className="flex min-h-40 items-center justify-center">Loading…</div>}>
          <Routes>
            {/* Auth Routes */}

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
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              // <ProtectedRoute>
              //   <DropdownSidebarLayout />
              // </ProtectedRoute>

              <AppLayout />



            }>
              <Route index element={<Test />} />
              <Route path="home" element={<Test />} />
              <Route path="testing" element={<TestFramework />} />
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

            <Route path="/404" element={<NotFound404 />} />
            <Route path="*" element={<NotFound404 />} />
          </Routes>
        </Suspense>

      </SkeletonProvider>
    </>
  );
}

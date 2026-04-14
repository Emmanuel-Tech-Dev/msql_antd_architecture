// components/UsersTable.jsx

import { useEffect } from "react";
import useTableApi from "./hooks/useTableApi";
import { Button, Calendar, Input, Space, Spin, Table } from "antd";
import { useState } from "react";
import CustomTable from "./components/CustomTable";
import useDelete from "./hooks/useDelete";
import { DeleteOutlined } from "@ant-design/icons";
import useApi from "./hooks/useApi";
import useCalendar from "./hooks/useCalender";
import useDrawer from "./hooks/useDrawer";
import useModal from "./hooks/useModal";
import useLocalForage, { DRIVERS } from "./hooks/useLocalForage";
import useMasonry from "./hooks/useMasonary";
import './index.css'
import AppLayout from "./components/Layout/AppLayout";
import { Navigate, Route, Router, Routes } from "react-router-dom";
import Test from "./pages/Test";
import Test2 from "./pages/Test2";
import { Analytics } from "./pages/Analytics/Analytics";
import useBootstrap from "./hooks/useBootstrap";
import { AnalyticsHospital } from "./pages/Analytics/AnalyticsHospital";
import { AnalyticsSchool } from "./pages/Analytics/AnalyticsSchool";
import { AnalyticsEcommerce } from "./pages/Analytics/AnalyticsEcommerce";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import OtpRequest from "./pages/auth/OtpRequest";
import OtpVerify from "./pages/auth/OtpVerify";
import NotFound from "./pages/NotFound";
import Users from "./pages/admin/Users";
import Roles from "./pages/admin/Roles";
//import RoleAssignments from "./pages/admin/RoleAssignment";
import Permissions from "./pages/admin/Permissions";
import Resources from "./pages/admin/Resources";
import SystemLogs from "./pages/settings/SystemLogs";





export default function App() {

  return (
    <>
      <Routes>
        {/* Auth Routes */}

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/init_psd_recovery" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<Navigate to="/reset_password" replace />} />
        <Route path="/reset_password" element={<ResetPassword />} />
        <Route path="/otp_request" element={<OtpRequest />} />
        <Route path="/verify_otp" element={<OtpVerify />} />
        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          // <ProtectedRoute>
          //   <DropdownSidebarLayout />
          // </ProtectedRoute>

          <AppLayout />



        }>
          <Route index element={<Test />} />
          <Route path="home" element={<Test />} />
          <Route path="test" element={<Analytics />} />
          <Route path="test1" element={<AnalyticsHospital />} />
          <Route path="test2" element={<AnalyticsSchool />} />
          <Route path="test3" element={<AnalyticsEcommerce />} />
          <Route path="management/users" element={<Users />} />
          <Route path="management/roles" element={<Roles />} />
          <Route path="management/permissions" element={<Permissions />} />
          <Route path="management/resources" element={<Resources />} />
          <Route path="settings/system_logs" element={<SystemLogs />} />
          <Route path="404" element={<NotFound />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="404" replace />} />
      </Routes>
    </>
  );
}
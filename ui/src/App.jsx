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
import AppLayout from "./components/AppLayout";
import { Navigate, Route, Router, Routes } from "react-router-dom";
import Test from "./pages/Test";
import Test2 from "./pages/Test2";
import { Analytics } from "./pages/Analytics/Analytics";
import useBootstrap from "./hooks/useBootstrap";
import { AnalyticsHospital } from "./pages/Analytics/AnalyticsHospital";
import { AnalyticsSchool } from "./pages/Analytics/AnalyticsSchool";
import { AnalyticsEcommerce } from "./pages/Analytics/AnalyticsEcommerce";


const result = [
  {
    id: 9,
    custom_id: "REG20251223388396",
    name: "Root User",
    email: "emmanuelkusi345@gmail.com",
    phone_no: null,
    role: "admin",
    status: "active",
    created_at: "2025-12-23T10:00:00.000Z",
  },
  {
    id: 11,
    custom_id: "REG20251223215723",
    name: "John Doe",
    email: "johndoe@gmail.com",
    phone_no: "0241234567",
    role: "user",
    status: "active",
    created_at: "2025-12-23T11:00:00.000Z",
  },
  {
    id: 13,
    custom_id: "REG20251224123456",
    name: "Jane Smith",
    email: "janesmith@gmail.com",
    phone_no: "0551234567",
    role: "user",
    status: "inactive",
    created_at: "2025-12-24T09:00:00.000Z",
  },
  {
    id: 14,
    custom_id: "REG20251231542539",
    name: "testme",
    email: "emmanuelkusi3@gmail.com",
    phone_no: null,
    role: "user",
    status: "active",
    created_at: "2025-12-31T08:00:00.000Z",
  },
]




export default function App() {

  const { loading, refetch } = useBootstrap({
    onSuccess: (data) => {
      console.log('[Bootstrap] ready:', data);
    },
    onError: (err) => {
      console.error('[Bootstrap] failed:', err);
    },
  })


  if (loading) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}>
      <Spin size="large" description="Loading..." />
    </div>
  );


  return (
    <>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="login" replace />} />
        <Route path="/login" element={<Test />} />
        {/* <Route path="/create_account" element={<SignUp />} />
        <Route path="/reset_password" element={<RequestResetLink />} />
        <Route path="/verify_password/:resetToken" element={<VerifyResetToken />} />
        <Route path="/otp_request" element={<RequestOtp />} />
        <Route path="/verify_otp" element={<VerifyOtp />} /> */}

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          // <ProtectedRoute>
          //   <DropdownSidebarLayout />
          // </ProtectedRoute>
          <AppLayout AppReload={refetch} />



        }>
          <Route index element={<Test />} />
          <Route path="home" element={<Test />} />
          <Route path="test" element={<Analytics />} />
          <Route path="test1" element={<AnalyticsHospital />} />
          <Route path="test2" element={<AnalyticsSchool />} />
          <Route path="test3" element={<AnalyticsEcommerce />} />
          {/* <Route path='campaign' element={} /> */}
          {/* Settings sub-routes */}
          {/* <Route path="settings">
            <Route index element={<Navigate to="api_settings" replace />} />
            <Route path="api_settings" element={<SystemSettings />} />
            <Route path="system_logs" element={<LogsOverview />} />
            <Route path="system_logs/report" element={<Logs />} />
          </Route>

          {/* User Management sub-routes */}
          {/* <Route path="management" element={<UserManagementLayout />}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<Roles />} />
            <Route path="resources" element={<Resources />} />
            <Route path="permissions" element={<Permission />} />
          </Route> */}

          {/* <Route path="project" >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Projects />} />
            <Route path="details/:projectId" element={<ProjectDetails />} />
          </Route>
          <Route path="department" >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Department />} />
            {/* <Route path="details/:projectId" element={<ProjectDetails />} />
          </Route>

          <Route path="campaign" >
            <Route index element={<Campaign />} />
            <Route path="category" element={<Category />} />
            <Route path="info/:id" element={<CampaignInfo />} />
          </Route>
          <Route path="staff" >
            <Route index element={<Staff />} />
            {/* <Route path="category" element={<Category />} />
                  <Route path="info/:id" element={<CampaignInfo />} /> *
          </Route>

          <Route path="volunteer" >
            <Route index element={<Volunteer />} />
            {/* <Route path="category" element={<Category />} />
                  <Route path="info/:id" element={<CampaignInfo />} /> 
          </Route>*/}
        </Route>

        {/* <Route path='*' element={<NotFound url={"/"} />} /> */}
      </Routes>
    </>
  );
}
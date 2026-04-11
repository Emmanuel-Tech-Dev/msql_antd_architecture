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
import { useResourcesReady } from "./core/provider/ResourceProvider";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";






export default function App() {



  // const isReady = useResourcesReady();

  // if (!isReady) return (
  //   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
  //     <Spin size="large" description="System Getting Ready..." />
  //   </div>
  // );







  return (
    <>
      <Routes>
        {/* Auth Routes */}

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/init_psd_recovery" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
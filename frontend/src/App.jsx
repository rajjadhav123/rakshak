import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PoliceHome from './pages/PoliceHome.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import CreateCase from './pages/CreateCase.jsx';
import EmergencyReport from './pages/EmergencyReport.jsx';
import Notifications from './pages/Notifications.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import StatsDashboard from './pages/StatsDashboard.jsx';
import MyAssignments from './pages/MyAssignments.jsx';
import MyCases from './pages/MyCases.jsx';
import PlatformAdmin from './pages/PlatformAdmin.jsx';
import OfficerActivity from './pages/OfficerActivity.jsx';
import MyMessages from './pages/MyMessages.jsx';
import FaceEnrollment from './pages/FaceEnrollment.jsx';
import FaceEnrollmentReview from './pages/FaceEnrollmentReview.jsx';
import FaceEnrollmentOffline from './pages/FaceEnrollmentOffline.jsx';
import Search from './pages/Search.jsx';
import NearbyCases from './pages/NearbyCases.jsx';
import MyReports from './pages/MyReports.jsx';
import SafetyHelp from './pages/SafetyHelp.jsx';
import MyMissingPerson from './pages/MyMissingPerson.jsx';
import { CAN_CREATE_CASE, CAN_MANAGE_USERS, ADMIN_ROLES, PLATFORM_ADMIN_ROLES, NGO_ROLES, MY_CASES_ROLES, ROLES } from './roles.js';

function RoleGate({ allow, children }) {
  const { user } = useAuth();
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <p style={{ color: '#8593ad', padding: 40 }}>Loading Rakshak…</p>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/cases/new" element={<RoleGate allow={CAN_CREATE_CASE}><CreateCase /></RoleGate>} />
        <Route path="/emergency" element={<RoleGate allow={[ROLES.FAMILY]}><EmergencyReport /></RoleGate>} />
        <Route path="/my-cases" element={<RoleGate allow={MY_CASES_ROLES}><MyCases /></RoleGate>} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/dashboard" element={<RoleGate allow={ADMIN_ROLES}><StatsDashboard /></RoleGate>} />
        <Route path="/admin/users" element={<RoleGate allow={CAN_MANAGE_USERS}><AdminUsers /></RoleGate>} />
        <Route path="/my-assignments" element={<RoleGate allow={NGO_ROLES}><MyAssignments /></RoleGate>} />
        <Route path="/platform-admin" element={<RoleGate allow={PLATFORM_ADMIN_ROLES}><PlatformAdmin /></RoleGate>} />
        <Route path="/officer-activity" element={<RoleGate allow={[ROLES.DISTRICT_CONTROL]}><OfficerActivity /></RoleGate>} />
        <Route path="/my-messages" element={<RoleGate allow={[ROLES.POLICE_ADMIN]}><MyMessages /></RoleGate>} />
        <Route path="/face-enrollment" element={<RoleGate allow={[ROLES.POLICE_ADMIN]}><FaceEnrollment /></RoleGate>} />
        <Route path="/face-enrollment-review" element={<RoleGate allow={[ROLES.DISTRICT_CONTROL]}><FaceEnrollmentReview /></RoleGate>} />
        <Route path="/face-enrollment-offline" element={<RoleGate allow={[ROLES.DISTRICT_CONTROL]}><FaceEnrollmentOffline /></RoleGate>} />
        <Route path="/search" element={<Search />} />
        <Route path="/nearby-cases" element={<NearbyCases />} />
        <Route path="/my-reports" element={<RoleGate allow={[ROLES.CITIZEN, ROLES.FAMILY]}><MyReports /></RoleGate>} />
        <Route path="/safety-help" element={<SafetyHelp />} />
        <Route path="/my-missing-person" element={<RoleGate allow={[ROLES.FAMILY]}><MyMissingPerson /></RoleGate>} />
        <Route path="/police-home" element={<RoleGate allow={[ROLES.POLICE_ADMIN]}><PoliceHome /></RoleGate>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

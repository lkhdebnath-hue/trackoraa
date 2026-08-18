import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box, CircularProgress } from '@mui/material';
import { ThemeModeProvider } from './theme/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Announcements = lazy(() => import('./pages/Announcements'));
const LiveTracking = lazy(() => import('./pages/LiveTracking'));
const Habits = lazy(() => import('./pages/Habits'));
const Goals = lazy(() => import('./pages/Goals'));
const CalendarView = lazy(() => import('./pages/Calendar'));
import { useAuthStore } from './store/authStore';

// Protected Route Guard specifically checks roles
const RoleGate: React.FC<{ children: React.ReactElement; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  const adminRoles = ['super_admin', 'principal'];

  return (
    <ThemeModeProvider>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
          <Routes>
            {/* Public Auth Endpoint */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Grid */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              
              <Route
                path="users"
                element={
                  <RoleGate allowedRoles={adminRoles}>
                    <UserManagement />
                  </RoleGate>
                }
              />
              
              <Route path="tasks" element={<TaskManagement />} />
              
              <Route
                path="logs"
                element={
                  <RoleGate allowedRoles={adminRoles}>
                    <AuditLogs />
                  </RoleGate>
                }
              />
              
              <Route
                path="reports"
                element={
                  <RoleGate allowedRoles={adminRoles}>
                    <Reports />
                  </RoleGate>
                }
              />
              
              <Route
                path="announcements"
                element={
                  <RoleGate allowedRoles={adminRoles}>
                    <Announcements />
                  </RoleGate>
                }
              />
              
              <Route
                path="tracking"
                element={
                  <RoleGate allowedRoles={adminRoles}>
                    <LiveTracking />
                  </RoleGate>
                }
              />
              
              <Route path="habits" element={<Habits />} />
              <Route path="goals" element={<Goals />} />
              <Route path="calendar" element={<CalendarView />} />
              
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Page Fallbacks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeModeProvider>
  );
};

export default App;

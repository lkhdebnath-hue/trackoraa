import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/authStore';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Route Guard: Redirect to Login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: { xs: '100%', md: `calc(100% - 260px)` } }}>
        <Navbar handleDrawerToggle={handleDrawerToggle} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
export default DashboardLayout;

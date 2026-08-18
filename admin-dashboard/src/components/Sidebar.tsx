import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  ReceiptLong as LogIcon,
  BarChart as ReportIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Campaign as CampaignIcon,
  Map as MapIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

const DRAWER_WIDTH = 260;

export const Sidebar: React.FC<{ mobileOpen?: boolean; handleDrawerToggle?: () => void }> = ({ mobileOpen, handleDrawerToggle }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const menuItems = [
    { type: 'header', text: 'Personal Portal' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Calendar', icon: <AccessTimeIcon />, path: '/calendar' },
    { text: 'Task Board', icon: <AssignmentIcon />, path: '/tasks' },
    { text: 'Habits', icon: <AssignmentIcon />, path: '/habits' },
    { text: 'Goals', icon: <AssignmentIcon />, path: '/goals' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    
    { type: 'header', text: 'Administration', roles: ['super_admin', 'principal'] },
    { text: 'User Management', icon: <PeopleIcon />, path: '/users', roles: ['super_admin', 'principal'] },
    { text: 'Live GPS Tracking', icon: <MapIcon />, path: '/tracking', roles: ['super_admin', 'principal'] },
    { text: 'Announcements', icon: <CampaignIcon />, path: '/announcements', roles: ['super_admin', 'principal'] },
    { text: 'Audit Logs', icon: <LogIcon />, path: '/logs', roles: ['super_admin', 'principal'] },
    { text: 'Reports', icon: <ReportIcon />, path: '/reports', roles: ['super_admin', 'principal'] },
  ];

  const filteredItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  const drawerContent = (
    <>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo.png" alt="Trackora Logo" style={{ width: '64px', marginBottom: '12px', borderRadius: '12px' }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em' }}>
          TRACKORA
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {user?.role && ['super_admin', 'principal'].includes(user.role) ? 'Admin Platform' : 'User Portal'}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'divider', mx: 2 }} />

      <Box sx={{ overflow: 'auto', flexGrow: 1, px: 2, py: 2 }}>
        <List disablePadding>
          {filteredItems.map((item, index) => {
            if (item.type === 'header') {
              return (
                <Typography key={`header-${index}`} variant="overline" sx={{ px: 3, mt: 2, mb: 1, display: 'block', color: 'text.disabled', fontWeight: 800, letterSpacing: '0.1em' }}>
                  {item.text}
                </Typography>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={NavLink}
                  to={item.path!}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    mx: 1,
                    backgroundColor: isActive ? (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' : 'transparent',
                    color: isActive ? 'text.primary' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      color: 'text.primary',
                      '& .MuiListItemIcon-root': { color: 'text.primary' },
                    },
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: isActive ? 'text.primary' : 'text.disabled',
                      }}
                    >
                    {item.icon && React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: 20 } })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: 3,
            py: 1.2,
            px: 2,
            color: '#f43f5e',
            '&:hover': {
              backgroundColor: 'rgba(244, 63, 94, 0.05)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: '#f43f5e' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{ fontSize: '0.925rem', fontWeight: 600 }}
          />
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH, 
            background: (theme) => theme.palette.mode === 'dark' ? '#131418' : '#fcfcfc' 
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH, 
            background: (theme) => theme.palette.mode === 'dark' ? '#131418' : '#fcfcfc' 
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
export default Sidebar;

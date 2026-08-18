import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Box, Typography, Avatar, Chip, IconButton, Badge, Popover, Divider } from '@mui/material';
import { 
  Circle as CircleIcon, 
  Notifications as NotificationsIcon,
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  SettingsBrightness as SystemIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useThemeMode } from '../theme/ThemeContext';
import { api } from '../services/api';

export const Navbar: React.FC<{ handleDrawerToggle?: () => void }> = ({ handleDrawerToggle }) => {
  const { user, accessToken } = useAuthStore();
  const { mode, setMode } = useThemeMode();
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken || accessToken === 'mock_token') return;

    // Connect to Socket.IO using absolute URL proxy path
    const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : undefined;
    const socket: Socket = io(backendUrl as string, {
      auth: { token: accessToken },
      reconnection: false, // Prevent reconnect spam when backend is down
    });

    socket.on('online_users_count', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/announcements');
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    if (accessToken && accessToken !== 'mock_token') {
      fetchNotifs();
    }
  }, [accessToken]);

  const cycleTheme = () => {
    if (mode === 'dark') setMode('light');
    else if (mode === 'light') setMode('system');
    else setMode('dark');
  };

  const getThemeIcon = () => {
    if (mode === 'dark') return <DarkIcon />;
    if (mode === 'light') return <LightIcon />;
    return <SystemIcon />;
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        background: (theme) => theme.palette.mode === 'dark' ? 'rgba(19, 20, 24, 0.8)' : 'rgba(252, 252, 252, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {handleDrawerToggle && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
            Overview
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Online Count Indicator */}
          <Chip
            icon={<CircleIcon sx={{ fontSize: '10px !important', color: '#10b981 !important' }} />}
            label={`${onlineCount} Online`}
            variant="outlined"
            sx={{
              borderColor: 'rgba(16, 185, 129, 0.2)',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              color: '#10b981',
              fontWeight: 700,
              fontSize: '0.8rem',
              borderRadius: 2,
            }}
          />

          {/* Theme Mode Toggle */}
          <IconButton onClick={cycleTheme} sx={{ color: 'text.secondary' }}>
            {getThemeIcon()}
          </IconButton>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'text.secondary' }}>
            <Badge badgeContent={notifications.length} color="error" max={99}>
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { mt: 1, borderRadius: 3, width: 320, maxHeight: 400, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)' } }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Notifications</Typography>
            </Box>
            <Box sx={{ p: 0 }}>
              {notifications.length === 0 ? (
                <Typography variant="body2" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  No new notifications
                </Typography>
              ) : (
                (Array.isArray(notifications) ? notifications : []).slice(0, 5).map((notif, i) => (
                  <React.Fragment key={notif._id}>
                    <Box sx={{ p: 2, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {notif.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.primary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {notif.content}
                      </Typography>
                    </Box>
                    {i < Math.min(notifications.length, 5) - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </Box>
          </Popover>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {user?.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 600 }}>
                {user?.role.toUpperCase()} • {user?.department}
              </Typography>
            </Box>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                fontWeight: 700,
                color: '#ffffff',
                border: (theme) => `2px solid ${theme.palette.divider}`,
              }}
            >
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
export default Navbar;

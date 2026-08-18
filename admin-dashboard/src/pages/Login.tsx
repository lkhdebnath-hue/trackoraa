import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Box, Card, TextField, Button, Typography, Alert, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff, LockOutlined as LockIcon, PersonOutline as UserIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { setAuth, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to home page
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { username, password });
      
      const { accessToken, refreshToken, user } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
          : 'radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          p: 5,
          borderRadius: 4,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${theme.palette.divider}`,
          background: isDark
            ? 'rgba(17, 24, 39, 0.6)'
            : 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <img src="/logo.png" alt="Trackora Logo" style={{ width: '80px', marginBottom: '16px', borderRadius: '12px' }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 850,
              mb: 1,
              background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Trackora Login
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Enter your administrative credentials to continue
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <UserIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              },
            }}
          />

          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Password"
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'text.secondary' }}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              },
              mb: 4,
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              borderRadius: 3,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
          </Button>
        </form>
      </Card>
    </Box>
  );
};
export default Login;

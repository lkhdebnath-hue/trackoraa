import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Divider, Avatar, TextField, Button, Switch, FormControlLabel, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useThemeMode } from '../theme/ThemeContext';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const { mode, setMode } = useThemeMode();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('English');

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon fontSize="large" color="primary" /> Platform Settings
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Manage your account profile, preferences, and privacy.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Profile Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Account Profile
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 700 }}>
                  {user?.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{user?.username}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{user?.role}</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField label="Username" defaultValue={user?.username} fullWidth disabled />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Email" defaultValue="user@example.com" fullWidth disabled />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="outlined" color="primary">Change Password</Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Preferences & Notifications
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Appearance</Typography>
                <FormControlLabel
                  control={<Switch checked={mode === 'dark'} onChange={() => setMode(mode === 'dark' ? 'light' : 'dark')} />}
                  label="Dark Mode"
                />
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Regional</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select value={timezone} label="Timezone" onChange={(e) => setTimezone(e.target.value)}>
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="EST">EST</MenuItem>
                        <MenuItem value="PST">PST</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                        <MenuItem value="English">English</MenuItem>
                        <MenuItem value="Spanish">Spanish</MenuItem>
                        <MenuItem value="French">French</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Notifications</Typography>
                <FormControlLabel
                  control={<Switch checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />}
                  label="Push Notifications"
                />
                <br />
                <FormControlLabel
                  control={<Switch checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />}
                  label="Email Alerts"
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'error.main' }}>Danger Zone</Typography>
                <Button variant="outlined" color="error" sx={{ mr: 2 }}>Export Data</Button>
                <Button variant="contained" color="error">Delete Account</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default Settings;

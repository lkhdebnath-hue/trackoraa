import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Grid, Card, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, Button,
  FormControlLabel, Checkbox, Divider, Chip, CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { Navigation as DirectionsIcon, Refresh as RefreshIcon, History as HistoryIcon } from '@mui/icons-material';
import { api } from '../services/api';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const LiveTracking: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTaskHistory, setSelectedTaskHistory] = useState<string>('');
  const [historyStats, setHistoryStats] = useState<{ duration: number; distance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState('');

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const fetchLiveLocations = async () => {
    try {
      const res = await api.get('/location/live');
      setLocations(res.data);
      updateMapMarkers(res.data);
    } catch (err) {
      console.error('Failed to fetch live locations:', err);
      setError('Failed to fetch real-time telemetry.');
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  // Fetch initial telemetry and tasks data on mount
  useEffect(() => {
    const initData = async () => {
      try {
        await Promise.all([fetchLiveLocations(), fetchTasks()]);
      } catch (err) {
        console.error('Error loading initial telemetry data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Initialize Leaflet Map once loading is complete and container is rendered in DOM
  useEffect(() => {
    if (loading) return;

    if (!L) return;

    if (!mapRef.current) {
      mapRef.current = L.map('tracking-map').setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      // Render initial markers if any locations are loaded
      if (locations.length > 0) {
        updateMapMarkers(locations);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]);

  // Auto Refresh Interval
  useEffect(() => {
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLiveLocations();
      }, 10000); // 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const updateMapMarkers = (data: any[]) => {

    if (!L || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear old route history polyline if drawing active tracking
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
      setHistoryStats(null);
    }

    if (data.length === 0) return;

    const bounds: any[] = [];

    data.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const marker = L.marker([loc.latitude, loc.longitude])
        .addTo(mapRef.current)
        .bindPopup(`
          <div style="color: #0f172a; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
            <h4 style="margin: 0 0 4px 0; font-weight: 800; font-size: 14px;">${loc.username}</h4>
            <p style="margin: 0 0 2px 0; font-size: 11px;">Dept: <b>${loc.department}</b></p>
            <p style="margin: 0 0 2px 0; font-size: 11px;">Task: <b>${loc.taskTitle}</b></p>
            <p style="margin: 0 0 2px 0; font-size: 11px;">Status: <b>${loc.status}</b></p>
            <p style="margin: 0 0 4px 0; font-size: 11px;">Accuracy: <b>${loc.accuracy.toFixed(1)}m</b></p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 4px 0;"/>
            <span style="font-size: 10px; color: #64748b;">Last Updated: ${new Date(loc.updatedAt).toLocaleTimeString()}</span>
          </div>
        `);

      markersRef.current.push(marker);
      bounds.push([loc.latitude, loc.longitude]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { maxZoom: 15, padding: [40, 40] });
    }
  };

  const handleFocusUser = (lat: number, lon: number) => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 16);
    }
  };

  const handleOpenDirections = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  const handleLoadHistory = async () => {
    if (!selectedTaskHistory) return;

    if (!L || !mapRef.current) return;

    try {
      setHistoryLoading(true);
      setError('');

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      const res = await api.get(`/location/history/${selectedTaskHistory}`);
      
      if (res.data.length === 0) {
        setError('No route history found for this task.');
        setHistoryStats(null);
        return;
      }

      const history = res.data[0]; // Get the first record
      const route = history.route;

      if (!route || route.length === 0) {
        setError('No GPS coordinate trail logged for this task.');
        setHistoryStats(null);
        return;
      }

      const latlngs = route.map((pt: any) => [pt.latitude, pt.longitude]);

      // Draw polyline
      polylineRef.current = L.polyline(latlngs, {
        color: '#6366f1',
        weight: 5,
        opacity: 0.85,
      }).addTo(mapRef.current);

      // Start Marker (Green)
      const startMarker = L.circleMarker(latlngs[0], {
        radius: 8,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.9,
      })
        .addTo(mapRef.current)
        .bindPopup('<b>🟢 Starting Point</b>');
      markersRef.current.push(startMarker);

      // End Marker (Red)
      if (latlngs.length > 1) {
        const endMarker = L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 8,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.9,
        })
          .addTo(mapRef.current)
          .bindPopup('<b>🔴 Last Active Point</b>');
        markersRef.current.push(endMarker);
      }

      // Zoom map to fit polyline path
      mapRef.current.fitBounds(latlngs, { padding: [50, 50] });

      setHistoryStats({
        duration: history.duration,
        distance: history.distance,
      });
      setAutoRefresh(false); // Stop auto-refresh while viewing history
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to fetch route history log.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Working': return 'success';
      case 'On Site': return 'info';
      case 'Travelling': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            🛰️ Live GPS Telemetry
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Monitor active staff locations, traveling routes, and tasks audit logs
          </Typography>
        </Box>
        <FormControlLabel
          control={<Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
          label="Auto-Refresh (10s)"
          sx={{ color: 'text.secondary' }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Left Side: Active Staff & History tools */}
        <Grid item xs={12} md={4}>
          {/* Section: Active Tracking List */}
          <Card sx={{ 
            p: 3, mb: 3,
            animation: 'fadeInUp 0.4s ease-out forwards',
            opacity: 0,
            transform: 'translateY(10px)',
            '@keyframes fadeInUp': {
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon className={autoRefresh ? 'spin' : ''} /> Active Sharing Staff ({locations.length})
            </Typography>
            <Divider sx={{ borderColor: 'divider', mb: 2 }} />

            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {locations.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                  No staff members are currently sharing location.
                </Typography>
              ) : (
                locations.map((loc, idx) => (
                  <ListItem
                    key={loc.userId}
                    sx={{
                      px: 2,
                      py: 1.5,
                      mb: 1,
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s forwards`,
                      opacity: 0,
                      transform: 'translateY(10px)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.05)',
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, fontSize: '1rem', width: 36, height: 36 }}>{loc.username?.charAt(0).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{loc.username}</Typography>
                          <Chip label={loc.status} size="small" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', bgcolor: getStatusColor(loc.status) === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: getStatusColor(loc.status) === 'success' ? '#10b981' : '#f59e0b' }} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5, color: 'text.secondary' }}>
                          <Typography variant="caption" display="block" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Task: <b>{loc.taskTitle}</b></Typography>
                          <Typography variant="caption" display="block">GPS Accuracy: <b>{loc.accuracy.toFixed(1)}m</b></Typography>
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                            <Button size="small" variant="contained" color="primary" onClick={() => handleFocusUser(loc.latitude, loc.longitude)} sx={{ py: 0.5, px: 2 }}>
                              Focus
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<DirectionsIcon fontSize="small"/>} onClick={() => handleOpenDirections(loc.latitude, loc.longitude)} sx={{ py: 0.5 }}>
                              Directions
                            </Button>
                          </Box>
                        </Box>
                      }
                      primaryTypographyProps={{ color: 'text.primary' }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Card>

          {/* Section: Task Route History */}
          <Card sx={{ 
            p: 3,
            animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
            opacity: 0,
            transform: 'translateY(10px)',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon /> Task History Audit
            </Typography>
            <Divider sx={{ borderColor: 'divider', mb: 2 }} />

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Task to Audit</InputLabel>
              <Select
                value={selectedTaskHistory}
                label="Select Task to Audit"
                onChange={(e) => setSelectedTaskHistory(e.target.value)}
              >
                {tasks.map((task) => (
                  <MenuItem key={task._id} value={task._id}>
                    {task.title} ({task.status})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              disabled={!selectedTaskHistory || historyLoading}
              onClick={handleLoadHistory}
              sx={{ fontWeight: 700, py: 1 }}
            >
              {historyLoading ? 'Loading history...' : 'Load GPS Breadcrumbs'}
            </Button>

            {historyStats && (
              <Box sx={{ mt: 2.5, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                  📏 History Telemetry Stats
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Total Duration: <b>{historyStats.duration} minutes</b>
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Estimated Distance: <b>{(historyStats.distance / 1000).toFixed(2)} km</b>
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Right Side: Map Display */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 1, height: '100%', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <Box
              id="tracking-map"
              sx={{
                height: 520,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#0c0f1d',
                zIndex: 1,
              }}
            />
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default LiveTracking;

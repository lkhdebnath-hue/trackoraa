import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, CircularProgress, Alert, Avatar, Divider, List, ListItem, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LocationOn as LocationIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const SCHOOL_LAT = 28.6139; // Center point
const SCHOOL_LON = 77.209;
const GEOFENCE_RADIUS_METERS = 200;

export const Attendance: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCurrentLocation();
    fetchAttendanceHistory();
  }, []);

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCurrentCoords({ lat, lon });
        const dist = calculateHaversineDistance(lat, lon, SCHOOL_LAT, SCHOOL_LON);
        setDistance(Math.round(dist));
      },
      (err) => {
        console.error(err);
        setError('Failed to get location. Please allow location access.');
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchAttendanceHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/attendance?userId=${user?.id}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setHistory(list);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = list.find((r: any) => r.date === todayStr);
      setActiveRecord(todayRecord || null);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClockInOut = async () => {
    if (!currentCoords) {
      setError('Cannot determine location. Please allow GPS access.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      latitude: currentCoords.lat,
      longitude: currentCoords.lon,
      address: 'Web Checkin Location',
    };

    const isClockOut = !!activeRecord;

    try {
      if (isClockOut) {
        await api.post('/attendance/clock-out', payload);
        setSuccess('Clocked out successfully.');
      } else {
        const res = await api.post('/attendance/clock-in', payload);
        const { outsideGeofence, distanceFromCenterMeters } = res.data;
        if (outsideGeofence) {
          setError(`Geofence Warning: Checked in ${distanceFromCenterMeters}m outside the campus boundary. Your attendance is flagged.`);
        } else {
          setSuccess('Clocked in successfully inside geofence.');
        }
      }
      fetchAttendanceHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const isOutside = distance !== null && distance > GEOFENCE_RADIUS_METERS;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
          Attendance Tracking
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Manage your daily check-ins with GPS verification.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
          <Avatar sx={{ bgcolor: isOutside ? 'error.light' : 'success.light', color: isOutside ? 'error.main' : 'success.main', mr: 2 }}>
            <LocationIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Campus Geofencing</Typography>
            {distance !== null ? (
              <Typography variant="body2" sx={{ color: isOutside ? 'error.main' : 'success.main', fontWeight: 600 }}>
                {isOutside ? `${distance}m outside boundary (Flagged)` : `${distance}m from center (Verified)`}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Resolving GPS coordinates...</Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, mb: 4, bgcolor: 'background.paper', borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Button
          variant="contained"
          disabled={!!(activeRecord && activeRecord.clockOut) || loading}
          onClick={handleClockInOut}
          sx={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            fontSize: '1.5rem',
            fontWeight: 800,
            bgcolor: activeRecord ? (activeRecord.clockOut ? 'grey.500' : 'error.main') : 'primary.main',
            '&:hover': {
              bgcolor: activeRecord ? (activeRecord.clockOut ? 'grey.600' : 'error.dark') : 'primary.dark',
            },
            boxShadow: theme.palette.mode === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(99,102,241,0.3)',
          }}
        >
          {loading ? <CircularProgress size={40} color="inherit" /> : (
            activeRecord ? (activeRecord.clockOut ? 'Completed' : 'Clock Out') : 'Clock In'
          )}
        </Button>
        {activeRecord && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Clock In: <span style={{ color: theme.palette.text.primary }}>{new Date(activeRecord.clockIn).toLocaleTimeString()}</span>
            </Typography>
            {activeRecord.clockOut && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                Clock Out: <span style={{ color: theme.palette.text.primary }}>{new Date(activeRecord.clockOut).toLocaleTimeString()}</span>
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Attendance History</Typography>
      <Divider sx={{ mb: 2 }} />
      {historyLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : history.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>No historical records found.</Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {history.map((record) => (
            <Card key={record._id} sx={{ mb: 1.5, borderRadius: 2 }}>
              <ListItem sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {new Date(record.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    In: {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    {record.clockOut ? `| Out: ${new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </Typography>
                </Box>
                <Chip 
                  label={record.status.toUpperCase()} 
                  size="small" 
                  color={record.status === 'present' ? 'success' : 'warning'} 
                  sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                />
              </ListItem>
            </Card>
          ))}
        </List>
      )}
    </Box>
  );
};

export default Attendance;

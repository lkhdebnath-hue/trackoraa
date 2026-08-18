import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, Card, Avatar, ActivityIndicator, Divider, useTheme } from 'react-native-paper';
import * as Location from 'expo-location';
import { MapPin, Navigation, Compass } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { api } from '../../services/api';

const SCHOOL_LAT = 28.6139; // Center point
const SCHOOL_LON = 77.209;
const GEOFENCE_RADIUS_METERS = 200;

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const { addOfflineAction, offlineQueue } = useSyncStore();

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  // Status states
  const [activeRecord, setActiveRecord] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status === 'granted') {
        fetchCurrentLocation();
      }
    })();
    fetchAttendanceHistory();
  }, []);

  const fetchCurrentLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      setCurrentCoords({ lat, lon });

      // Compute distance using Haversine formula
      const dist = calculateHaversineDistance(lat, lon, SCHOOL_LAT, SCHOOL_LON);
      setDistance(Math.round(dist));
    } catch (err) {
      console.error('Failed to query GPS location:', err);
    }
  };

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth radius in meters
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

  const fetchAttendanceHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/attendance?userId=${user?.id}`);
      const list = res.data;
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

  const getClockBtnStyle = () => {
    const isClockedIn = !!activeRecord;
    const isClockedOut = !!(activeRecord && activeRecord.clockOut);

    if (isClockedOut) {
      return {
        backgroundColor: theme.colors.surfaceVariant,
        ...Platform.select({
          web: { boxShadow: 'none' },
          default: { shadowOpacity: 0, elevation: 0 }
        })
      };
    }

    const color = isClockedIn ? theme.colors.error : theme.colors.primary;
    return {
      backgroundColor: color,
      ...Platform.select({
        web: { boxShadow: `0px 10px 15px ${color}4d` },
        default: { shadowColor: color }
      })
    };
  };

  const handleClockInOut = async () => {
    if (!locationPermission) {
      Alert.alert('GPS Required', 'Please enable Location services to verify campus presence.');
      return;
    }

    setLoading(true);
    await fetchCurrentLocation(); // Update GPS values

    if (!currentCoords) {
      Alert.alert('GPS Error', 'Could not lock GPS location. Please try again.');
      setLoading(false);
      return;
    }

    const payload = {
      latitude: currentCoords.lat,
      longitude: currentCoords.lon,
      address: 'Mobile Checkin Location',
    };

    const isClockOut = !!activeRecord;

    // Detect offline state
    try {
      if (isClockOut) {
        await api.post('/attendance/clock-out', payload);
        Alert.alert('Success', 'Clocked out successfully.');
      } else {
        const res = await api.post('/attendance/clock-in', payload);
        const { outsideGeofence, distanceFromCenterMeters } = res.data;
        if (outsideGeofence) {
          Alert.alert(
            'Geofence Warning',
            `You checked in ${distanceFromCenterMeters}m outside the campus boundary. Your attendance is flagged.`
          );
        } else {
          Alert.alert('Success', 'Clocked in successfully inside geofence.');
        }
      }
      fetchAttendanceHistory();
    } catch (err: any) {
      // Offline fallback: Queue action
      if (!err.response) {
        addOfflineAction(isClockOut ? 'CLOCK_OUT' : 'CLOCK_IN', payload);
        Alert.alert(
          'Offline Mode Active',
          `No network detected. Your ${isClockOut ? 'Clock Out' : 'Clock In'} action has been queued and will synchronize automatically once you are back online.`
        );
        // Optimistic UI updates
        const todayStr = new Date().toISOString().split('T')[0];
        if (isClockOut) {
          setActiveRecord((prev: any) => ({ ...prev, clockOut: new Date() }));
        } else {
          setActiveRecord({
            date: todayStr,
            clockIn: new Date(),
            status: 'present',
            gpsClockIn: payload,
          });
        }
      } else {
        Alert.alert('Action Failed', err.response?.data?.message || 'Verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();
  const styles = makeStyles(theme);
  const isOutside = distance !== null && distance > GEOFENCE_RADIUS_METERS;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Geofence verification HUD card */}
      <Card style={[styles.hudCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Card.Content style={styles.hudContent}>
          <Avatar.Icon
            size={44}
            icon={() => <MapPin color={isOutside ? theme.colors.error : theme.colors.secondary} size={24} />}
            style={[styles.hudIcon, { backgroundColor: isOutside ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}
          />
          <View style={styles.hudTextSection}>
            <Text style={[styles.hudTitle, { color: theme.colors.onSurface }]}>Campus Geofencing</Text>
            {distance !== null ? (
              <Text style={[styles.hudSubtitle, isOutside ? { color: theme.colors.error } : { color: theme.colors.secondary }]}>
                {isOutside ? `${distance}m outside boundary (Flagged)` : `${distance}m from center (Verified)`}
              </Text>
            ) : (
              <Text style={[styles.hudSubtitle, { color: theme.colors.onSurfaceVariant }]}>Resolving GPS coordinates...</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Main Clock button */}
      <View style={styles.clockArea}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <Button
            mode="contained"
            onPress={handleClockInOut}
            disabled={!!(activeRecord && activeRecord.clockOut)}
            style={[
              styles.clockBtn,
              getClockBtnStyle(),
            ]}
            labelStyle={styles.clockBtnLabel}
          >
            {activeRecord
              ? activeRecord.clockOut
                ? 'Work Day Completed'
                : 'Clock Out'
              : 'Clock In'}
          </Button>
        )}

        {/* Current status detail */}
        {activeRecord && (
          <View style={styles.timeLogs}>
            <Text style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant }]}>
              Clock In: <Text style={[styles.timeValue, { color: theme.colors.onSurface }]}>{new Date(activeRecord.clockIn).toLocaleTimeString()}</Text>
            </Text>
            {activeRecord.clockOut && (
              <Text style={[styles.timeLabel, { color: theme.colors.onSurfaceVariant }]}>
                Clock Out: <Text style={[styles.timeValue, { color: theme.colors.onSurface }]}>{new Date(activeRecord.clockOut).toLocaleTimeString()}</Text>
              </Text>
            )}
          </View>
        )}
      </View>

      <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

      {/* Attendance History */}
      <Text style={[styles.sectionHeader, { color: theme.colors.onBackground }]}>Attendance History</Text>
      {historyLoading && history.length === 0 ? (
        <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />
      ) : history.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No historical records found.</Text>
      ) : (
        history.map((record) => (
          <Card key={record._id} style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Card.Content style={styles.historyContent}>
              <View>
                <Text style={[styles.historyDate, { color: theme.colors.onSurface }]}>{new Date(record.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                <Text style={[styles.historyTimes, { color: theme.colors.onSurfaceVariant }]}>
                  In: {new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  {record.clockOut ? `| Out: ${new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </Text>
              </View>
              <View style={[styles.statusBadge, record.status === 'present' ? styles.presentBadge : styles.lateBadge]}>
                <Text style={[styles.statusText, record.status === 'present' ? styles.presentText : styles.lateText]}>
                  {record.status.toUpperCase()}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  hudCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    marginBottom: 24,
  },
  hudContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hudIcon: {
    marginRight: 16,
  },
  hudTextSection: {
    flex: 1,
  },
  hudTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  hudSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '600',
  },
  outsideText: {
    color: theme.colors.error,
  },
  insideText: {
    color: theme.colors.secondary,
  },
  clockArea: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  clockBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 15px rgba(99, 102, 241, 0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
      }
    })
  },
  clockInBtnBg: {
    backgroundColor: theme.colors.primary,
  },
  clockOutBtnBg: {
    backgroundColor: theme.colors.error,
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 15px rgba(245, 158, 11, 0.3)',
      },
      default: {
        shadowColor: theme.colors.error,
      }
    })
  },
  disabledBtn: {
    backgroundColor: '#334155',
    ...Platform.select({
      web: {
        boxShadow: 'none',
      },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      }
    })
  },
  clockBtnLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  timeLogs: {
    marginTop: 24,
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  timeValue: {
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: theme.colors.outline,
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
  },
  historyCard: {
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  historyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  historyTimes: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  lateBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  presentText: {
    color: theme.colors.secondary,
  },
  lateText: {
    color: theme.colors.error,
  },
});
export {};

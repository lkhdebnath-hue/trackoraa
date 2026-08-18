import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Checkbox, Divider, ActivityIndicator, List, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Tag, ShieldAlert, CheckSquare, Users, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { api } from '../../services/api';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { addOfflineAction } = useSyncStore();

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Location Sharing States
  const [isSharing, setIsSharing] = useState(false);
  const [sharingType, setSharingType] = useState('task_continuous');
  const [currentStatus, setCurrentStatus] = useState('Travelling');
  const [currentCoords, setCurrentCoords] = useState<any | null>(null);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      console.error('Error fetching task details:', err);
      Alert.alert('Error', 'Failed to retrieve task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    if (!task) return;

    // Optimistic UI updates
    const updatedSubtasks = task.subtasks.map((s: any) =>
      s._id === subtaskId ? { ...s, isCompleted } : s
    );
    setTask({ ...task, subtasks: updatedSubtasks });

    try {
      await api.patch(`/tasks/${task._id}/subtasks/${subtaskId}`, { isCompleted });
    } catch (err) {
      // Offline fallback: Queue action
      addOfflineAction('TOGGLE_SUBTASK', { taskId: task._id, subtaskId, isCompleted });
    }
  };

  const handleStatusUpdate = async (nextStatus: string) => {
    setActionLoading(true);
    const payload = {
      status: nextStatus,
      notes: `Status updated to ${nextStatus} by ${user?.username}`,
    };

    try {
      await api.patch(`/tasks/${id}/status`, payload);
      
      // Auto-revoke location sharing on complete/review
      if (nextStatus === 'completed' || nextStatus === 'needs_review') {
        if (isSharing) {
          await api.post('/location/stop').catch(() => {});
          setIsSharing(false);
          setCurrentCoords(null);
        }
      }

      Alert.alert('Success', `Task status updated to ${nextStatus}.`);
      fetchTaskDetails();
    } catch (err: any) {
      // Offline fallback: Queue action
      if (!err.response) {
        addOfflineAction('UPDATE_TASK_STATUS', { id, status: nextStatus, notes: payload.notes });
        // Optimistic UI update
        setTask((prev: any) => ({ ...prev, status: nextStatus }));
        Alert.alert(
          'Offline Mode Active',
          'Status update has been queued locally and will sync once internet connection is restored.'
        );
      } else {
        Alert.alert('Failed', err.response?.data?.message || 'Failed to update status.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const startLocationSharing = async (type: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS permission is required to share your location.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy } = pos.coords;

      setCurrentCoords({
        latitude,
        longitude,
        accuracy,
        timestamp: pos.timestamp,
      });

      await api.post('/location/share', {
        taskId: id,
        latitude,
        longitude,
        accuracy,
        status: currentStatus,
        sharingType: type,
      });

      setSharingType(type);
      setIsSharing(true);

      if (type === 'once') {
        Alert.alert('Success', 'One-time location shared.');
        setIsSharing(false);
        return;
      }

      Alert.alert('Sharing Started', `Real-time location sharing is active: ${type}`);
    } catch (err: any) {
      console.error('Location sharing error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to start location sharing.');
    }
  };

  const stopLocationSharing = async () => {
    try {
      await api.post('/location/stop');
      setIsSharing(false);
      setCurrentCoords(null);
      Alert.alert('Revoked', 'Location sharing revoked.');
    } catch (err) {
      console.error('Failed to revoke sharing:', err);
      Alert.alert('Error', 'Failed to stop location sharing.');
    }
  };

  // Continuous location update watcher
  useEffect(() => {
    let interval: any = null;

    if (isSharing) {
      interval = setInterval(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude, accuracy } = pos.coords;

          setCurrentCoords({
            latitude,
            longitude,
            accuracy,
            timestamp: pos.timestamp,
          });

          await api.post('/location/share', {
            taskId: id,
            latitude,
            longitude,
            accuracy,
            status: currentStatus,
            sharingType,
          });
        } catch (err) {
          console.error('Periodic location update failed:', err);
        }
      }, 15000); // 15 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSharing, currentStatus, sharingType]);

  const theme = useTheme();
  const styles = makeStyles(theme);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Task not found.</Text>
      </View>
    );
  }

  const renderActionButtons = () => {
    if (actionLoading) {
      return <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 16 }} />;
    }

    switch (task.status) {
      case 'pending':
        return (
          <Button
            mode="contained"
            onPress={() => handleStatusUpdate('accepted')}
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.btnLabel}
          >
            Accept Task
          </Button>
        );
      case 'accepted':
        return (
          <Button
            mode="contained"
            onPress={() => handleStatusUpdate('in_progress')}
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.btnLabel}
          >
            Start Work
          </Button>
        );
      case 'in_progress':
        return (
          <View style={styles.actionBtnRow}>
            <Button
              mode="outlined"
              onPress={() => handleStatusUpdate('paused')}
              style={[styles.halfBtn, { borderColor: '#f59e0b' }]}
              textColor="#f59e0b"
            >
              Pause
            </Button>
            <Button
              mode="contained"
              onPress={() => handleStatusUpdate('completed')}
              style={[styles.halfBtn, { backgroundColor: '#10b981' }]}
              textColor="#ffffff"
            >
              Submit
            </Button>
          </View>
        );
      case 'paused':
        return (
          <Button
            mode="contained"
            onPress={() => handleStatusUpdate('in_progress')}
            style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
            labelStyle={styles.btnLabel}
          >
            Resume Work
          </Button>
        );
      case 'needs_review':
        return (
          <Text style={[styles.reviewBanner, { color: '#f59e0b' }]}>
            Awaiting Manager/Creator approval...
          </Text>
        );
      case 'completed':
        return (
          <Text style={[styles.completedBanner, { color: '#10b981' }]}>
            Task Completed!
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Top Active Sharing indicator banner */}
      {isSharing && (
        <View style={styles.topSharingBanner}>
          <Text style={styles.topSharingBannerText}>
            ⚠️ GPS Location Sharing is Currently Active
          </Text>
        </View>
      )}

      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll}>
        {/* Category and priority details */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={[styles.category, { color: theme.colors.primary }]}>{task.category}</Text>
              <ChipPriority priority={task.priority} />
            </View>

            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{task.title}</Text>
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>{task.description}</Text>

            <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

            <View style={styles.metaRow}>
              <Clock color={theme.colors.onSurfaceVariant} size={16} />
              <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}>
                Due: {new Date(task.dueDate).toLocaleDateString()} • Est: {task.estimatedTime} Min
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Task Collaboration Workspace entry point */}
        {task.assignees && task.assignees.length > 1 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Users color={theme.colors.primary} size={18} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Collaboration Workspace</Text>
              </View>
              <Divider style={[styles.divider, { marginVertical: 8, backgroundColor: theme.colors.outline }]} />
              <Text style={[styles.collabDescription, { color: theme.colors.onSurfaceVariant }]}>
                This task is shared with {task.assignees.length} members. Enter the workspace to chat, search logs, and share files.
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  if (task.chatGroupId) {
                    router.push(`/chat/${task.chatGroupId}`);
                  } else {
                    Alert.alert('Unavailable', 'Collaboration workspace is not initialized.');
                  }
                }}
                style={[styles.collabBtn, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.btnLabel}
              >
                Enter Shared Discussion
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Optional Location Tracking controls */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content>
            <View style={styles.sectionHeaderRow}>
              <MapPin color={isSharing ? '#10b981' : theme.colors.onSurfaceVariant} size={18} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Location Tracking Controls</Text>
              {isSharing && (
                <View style={styles.sharingPulseContainer}>
                  <View style={styles.sharingPulse} />
                  <Text style={styles.sharingActiveText}>SHARING ACTIVE</Text>
                </View>
              )}
            </View>
            <Divider style={[styles.divider, { marginVertical: 8, backgroundColor: theme.colors.outline }]} />

            {isSharing && currentCoords ? (
              <View style={styles.locationDetails}>
                <Text style={[styles.locationDetailText, { color: theme.colors.onSurfaceVariant }]}>
                  Latitude: <Text style={{ color: theme.colors.onSurface }}>{currentCoords.latitude.toFixed(6)}</Text>
                </Text>
                <Text style={[styles.locationDetailText, { color: theme.colors.onSurfaceVariant }]}>
                  Longitude: <Text style={{ color: theme.colors.onSurface }}>{currentCoords.longitude.toFixed(6)}</Text>
                </Text>
                <Text style={[styles.locationDetailText, { color: theme.colors.onSurfaceVariant }]}>
                  Accuracy: <Text style={{ color: theme.colors.onSurface }}>{currentCoords.accuracy.toFixed(1)}m</Text>
                </Text>
                <Text style={[styles.locationDetailText, { color: theme.colors.onSurfaceVariant }]}>
                  Last Sent: <Text style={{ color: theme.colors.onSurface }}>{new Date(currentCoords.timestamp).toLocaleTimeString()}</Text>
                </Text>

                <View style={styles.statusSelectContainer}>
                  <Text style={[styles.statusLabel, { color: theme.colors.onSurface }]}>Change Tracker Status:</Text>
                  <View style={styles.statusRow}>
                    {['Travelling', 'On Site', 'Working'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.statusOption, { borderColor: theme.colors.outline }, currentStatus === st && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                        onPress={() => setCurrentStatus(st)}
                      >
                        <Text style={[styles.statusOptionText, { color: theme.colors.onSurfaceVariant }, currentStatus === st && { color: '#ffffff', fontWeight: '800' }]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Button mode="contained" onPress={stopLocationSharing} style={[styles.stopBtn, { backgroundColor: theme.colors.error }]} labelStyle={styles.btnLabel}>
                  Revoke Location Access
                </Button>
              </View>
            ) : (
              <View style={styles.startSharingSection}>
                <Text style={[styles.sharingHint, { color: theme.colors.onSurfaceVariant }]}>
                  Location tracking is fully optional. If enabled, your route history will be linked securely to this task for audit purposes.
                </Text>
                <View style={styles.shareModeGrid}>
                  <Button mode="outlined" style={[styles.shareGridBtn, { borderColor: theme.colors.primary }]} onPress={() => startLocationSharing('once')} labelStyle={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                    One-Time Share
                  </Button>
                  <Button mode="outlined" style={[styles.shareGridBtn, { borderColor: theme.colors.primary }]} onPress={() => startLocationSharing('15mins')} labelStyle={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                    Share for 15 Min
                  </Button>
                  <Button mode="outlined" style={[styles.shareGridBtn, { borderColor: theme.colors.primary }]} onPress={() => startLocationSharing('30mins')} labelStyle={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                    Share for 30 Min
                  </Button>
                  <Button mode="outlined" style={[styles.shareGridBtn, { borderColor: theme.colors.primary }]} onPress={() => startLocationSharing('task_continuous')} labelStyle={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                    Share During Task
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Checklist items */}
        {task.subtasks && task.subtasks.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                <CheckSquare color={theme.colors.primary} size={18} style={{ marginRight: 8 }} /> Checklist Items
              </Text>
              <Divider style={[styles.divider, { marginVertical: 8, backgroundColor: theme.colors.outline }]} />

              {task.subtasks.map((sub: any) => (
                <View key={sub._id} style={styles.checkboxRow}>
                  <Checkbox
                    status={sub.isCompleted ? 'checked' : 'unchecked'}
                    onPress={() => handleToggleSubtask(sub._id, !sub.isCompleted)}
                    color={theme.colors.primary}
                    uncheckedColor={theme.colors.onSurfaceVariant}
                  />
                  <Text style={[styles.checkboxLabel, { color: theme.colors.onSurface }, sub.isCompleted && [styles.checkboxLabelChecked, { color: '#64748b' }]]}>
                    {sub.title}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Dynamic Action triggers */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Task Workflow Controls</Text>
            <Divider style={[styles.divider, { marginVertical: 8, backgroundColor: theme.colors.outline }]} />
            {renderActionButtons()}
          </Card.Content>
        </Card>

        {/* History Log timeline list */}
        {task.history && task.history.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>History Timeline</Text>
              <Divider style={[styles.divider, { marginVertical: 8, backgroundColor: theme.colors.outline }]} />
              
              {task.history.map((log: any, index: number) => (
                <List.Item
                  key={index}
                  title={log.notes || `Updated to ${log.status}`}
                  description={`By ${log.updatedBy?.username || 'Unknown'} • ${new Date(log.updatedAt).toLocaleDateString()}`}
                  left={(props) => <List.Icon {...props} icon="history" color={theme.colors.onSurfaceVariant} />}
                  titleStyle={{ color: theme.colors.onSurface, fontSize: 13, fontWeight: '600' }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
                  style={{ paddingVertical: 4 }}
                />
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function ChipPriority({ priority }: { priority: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const getColors = () => {
    switch (priority) {
      case 'critical': return { bg: 'rgba(244, 63, 94, 0.1)', fg: theme.colors.error };
      case 'high': return { bg: 'rgba(245, 158, 11, 0.1)', fg: '#f59e0b' };
      case 'medium': return { bg: 'rgba(99, 102, 241, 0.1)', fg: theme.colors.primary };
      default: return { bg: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', fg: theme.colors.onSurfaceVariant };
    }
  };
  const colors = getColors();
  return (
    <View style={[styles.priorityBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.priorityText, { color: colors.fg }]}>{priority.toUpperCase()}</Text>
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: theme.colors.outline,
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  collabDescription: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: '500',
  },
  collabBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 4,
  },
  sharingPulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  sharingPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.secondary,
  },
  sharingActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.secondary,
  },
  locationDetails: {
    gap: 6,
  },
  locationDetailText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  whiteText: {
    color: theme.colors.onSurface,
  },
  statusSelectContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.outline,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: theme.colors.primary,
  },
  statusOptionText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '700',
  },
  statusOptionTextActive: {
    color: theme.colors.primary,
  },
  stopBtn: {
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 4,
  },
  startSharingSection: {
    gap: 12,
  },
  sharingHint: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
    fontWeight: '500',
  },
  shareModeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareGridBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
  },
  shareGridBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  topSharingBanner: {
    backgroundColor: theme.colors.error,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSharingBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.onSurfaceVariant,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
  },
  checkboxLabelChecked: {
    textDecorationLine: 'line-through',
    color: theme.colors.onSurfaceVariant,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
  },
  actionBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
  },
  btnLabel: {
    fontWeight: '800',
    fontSize: 15,
  },
  reviewBanner: {
    color: theme.colors.error,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
  },
  completedBanner: {
    color: theme.colors.secondary,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
  },
});

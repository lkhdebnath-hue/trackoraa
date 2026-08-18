import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Play, CheckCircle, FileWarning, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, late: 0 });
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [clockedIn, setClockedIn] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Query Tasks, Attendance & Announcements concurrently
      const [tasksRes, attendanceRes, announcementsRes] = await Promise.all([
        api.get(`/tasks?assignee=${user?.id}`),
        api.get(`/attendance?userId=${user?.id}&date=${todayStr}`),
        api.get('/announcements'),
      ]);

      const tasks = tasksRes.data;
      const total = tasks.length;
      const completed = tasks.filter((t: any) => t.status === 'completed').length;
      const pending = tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled').length;

      const now = new Date();
      const late = tasks.filter((t: any) => {
        return new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'cancelled';
      }).length;

      setStats({ total, completed, pending, late });

      // Filter tasks due today or pending
      const todayFilter = tasks.filter((t: any) => t.status !== 'completed').slice(0, 3);
      setTodayTasks(todayFilter);

      // Check if user clocked in today
      const attendance = attendanceRes.data;
      setClockedIn(attendance.length > 0);

      // Set Announcements
      setAnnouncements(announcementsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen to Socket.IO for real-time task updates and announcements
    const token = useAuthStore.getState().accessToken;
    if (token) {
      const socket = getSocket(token);

      socket.on('announcement_created', (announcement: any) => {
        if (announcement.targetRoles.includes('all') || announcement.targetRoles.includes(user?.role)) {
          setAnnouncements((prev) => [announcement, ...prev].slice(0, 5));
          Alert.alert('📢 New Announcement', `${announcement.title}\n\n${announcement.content}`);
        }
      });

      socket.on('task_created', (task: any) => {
        if (task.assignee === user?.id) {
          fetchDashboardData();
          Alert.alert('📋 New Task Assigned', `Task "${task.title}" has been assigned to you!`);
        }
      });

      socket.on('task_updated', (task: any) => {
        if (task.assignee === user?.id) {
          fetchDashboardData();
        }
      });

      socket.on('task_deleted', (taskId: string) => {
        fetchDashboardData();
      });

      return () => {
        socket.off('announcement_created');
        socket.off('task_created');
        socket.off('task_updated');
        socket.off('task_deleted');
      };
    }
  }, []);

  const theme = useTheme();
  const styles = makeStyles(theme);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Header Profile greeting */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Hello, {user?.username || ''}!</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{user?.department || ''} • {user?.role?.toUpperCase() || ''}</Text>
        </View>
        <Avatar.Text
          size={48}
          label={user?.username?.charAt(0)?.toUpperCase() || ''}
          style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.avatarLabel}
        />
      </View>

      {/* Clock in Banner Status */}
      <Card style={[styles.card, clockedIn ? styles.clockedInBg : styles.clockedOutBg, { backgroundColor: clockedIn ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.03)', borderColor: clockedIn ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.2)' }]}>
        <Card.Content style={styles.clockContent}>
          <View>
            <Text style={[styles.clockTitle, { color: theme.colors.onSurface }]}>
              {clockedIn ? 'Clocked In Successfully' : 'Not Clocked In Yet'}
            </Text>
            <Text style={[styles.clockSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {clockedIn ? 'Your attendance for today is registered.' : 'Please go to Clock tab to clock in.'}
            </Text>
          </View>
          <Avatar.Icon
            size={36}
            icon={clockedIn ? 'check' : 'alert-circle-outline'}
            style={styles.clockIcon}
          />
        </Card.Content>
      </Card>

      {/* Announcements Carousel Section */}
      <Text style={[styles.sectionHeader, { color: theme.colors.onBackground }]}>📢 Announcements</Text>
      {announcements.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No active announcements.</Text>
          </Card.Content>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.announcementsScroll} contentContainerStyle={styles.announcementsContentScroll}>
          {announcements.map((ann) => (
            <Card key={ann._id} style={[styles.announcementCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content>
                <Text style={[styles.announcementTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>{ann.title}</Text>
                <Text style={[styles.announcementContent, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>{ann.content}</Text>
                <Text style={[styles.announcementMeta, { color: theme.colors.primary }]}>By {ann.author?.username || 'Admin'} • {new Date(ann.createdAt).toLocaleDateString()}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      {/* Stats Summary Rows */}
      <Text style={[styles.sectionHeader, { color: theme.colors.onBackground }]}>Task Progress</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Play color={theme.colors.primary} size={24} />
          <Text style={[styles.statVal, { color: theme.colors.onSurface }]}>{stats.pending}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <CheckCircle color="#10b981" size={24} />
          <Text style={[styles.statVal, { color: theme.colors.onSurface }]}>{stats.completed}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Completed</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <FileWarning color={theme.colors.error} size={24} />
          <Text style={[styles.statVal, { color: theme.colors.onSurface }]}>{stats.late}</Text>
          <Text style={[styles.statLbl, { color: theme.colors.onSurfaceVariant }]}>Overdue</Text>
        </View>
      </View>

      {/* Today's Tasks preview */}
      <Text style={[styles.sectionHeader, { color: theme.colors.onBackground }]}>Priority Tasks</Text>
      {todayTasks.length === 0 ? (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Card.Content style={styles.emptyContent}>
            <Calendar color={theme.colors.onSurfaceVariant} size={32} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>You have no pending tasks today!</Text>
          </Card.Content>
        </Card>
      ) : (
        todayTasks.map((task) => (
          <TouchableOpacity
            key={task._id}
            onPress={() => router.push(`/tasks/${task._id}`)}
            activeOpacity={0.7}
          >
            <Card style={[styles.taskCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content style={styles.taskContent}>
                <View style={styles.taskTextSection}>
                  <Text style={[styles.taskCategory, { color: theme.colors.primary }]}>{task.category}</Text>
                  <Text style={[styles.taskTitle, { color: theme.colors.onSurface }]}>{task.title}</Text>
                  <Text style={[styles.taskDue, { color: theme.colors.onSurfaceVariant }]}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
                </View>
                <ChipStatus status={task.status} />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// Simple internal component to render badge status
function ChipStatus({ status }: { status: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const getColors = () => {
    switch (status) {
      case 'completed': return { bg: 'rgba(16, 185, 129, 0.1)', fg: '#10b981' };
      case 'in_progress': return { bg: 'rgba(99, 102, 241, 0.1)', fg: '#6366f1' };
      case 'needs_review': return { bg: 'rgba(245, 158, 11, 0.1)', fg: '#f59e0b' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', fg: '#94a3b8' };
    }
  };
  const colors = getColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.fg }]}>{status.toUpperCase()}</Text>
    </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '600',
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  avatarLabel: {
    fontWeight: '700',
  },
  card: {
    marginVertical: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  clockedInBg: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  clockedOutBg: {
    borderColor: 'rgba(244, 63, 94, 0.2)',
    backgroundColor: 'rgba(244, 63, 94, 0.03)',
  },
  clockContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  clockSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '500',
  },
  clockIcon: {
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginTop: 24,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.onSurface,
    marginVertical: 4,
  },
  statLbl: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 14,
  },
  taskCard: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTextSection: {
    flex: 1,
  },
  taskCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginVertical: 2,
  },
  taskDue: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  announcementsScroll: {
    marginVertical: 4,
    marginBottom: 8,
  },
  announcementsContentScroll: {
    paddingRight: 16,
    gap: 12,
  },
  announcementCard: {
    width: 280,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  announcementContent: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  announcementMeta: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
});

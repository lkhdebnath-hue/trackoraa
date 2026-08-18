import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ViewStyle } from 'react-native';
import { Text, Card, Searchbar, SegmentedButtons, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clipboard } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search / Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVal, setFilterVal] = useState('pending');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks?assignee=${user?.id}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching user tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchQuery, filterVal]);

  const applyFilters = () => {
    let result = [...tasks];

    // Search query match
    if (searchQuery) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter tabs match
    const now = new Date();
    if (filterVal === 'pending') {
      result = result.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    } else if (filterVal === 'overdue') {
      result = result.filter(
        (t) => new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'cancelled'
      );
    } else if (filterVal === 'completed') {
      result = result.filter((t) => t.status === 'completed');
    }

    setFilteredTasks(result);
  };

  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search tasks..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        iconColor={theme.colors.onSurfaceVariant}
        inputStyle={{ color: theme.colors.onSurface }}
        placeholderTextColor={theme.colors.onSurfaceVariant}
      />

      <SegmentedButtons
        value={filterVal}
        onValueChange={setFilterVal}
        buttons={[
          { value: 'pending', label: 'Pending', checkedColor: theme.colors.primary },
          { value: 'overdue', label: 'Overdue', checkedColor: theme.colors.error },
          { value: 'completed', label: 'Completed', checkedColor: theme.colors.secondary },
          { value: 'all', label: 'All', checkedColor: theme.colors.onSurfaceVariant },
        ]}
        style={styles.segmented}
        theme={{ colors: { secondaryContainer: 'rgba(99, 102, 241, 0.12)' } }}
      />

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={fetchTasks}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Clipboard color={theme.colors.onSurfaceVariant} size={48} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No tasks found in this category.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOverdue = new Date(item.dueDate) < new Date() && item.status !== 'completed';
          return (
            <TouchableOpacity
              onPress={() => router.push(`/tasks/${item._id}`)}
              activeOpacity={0.7}
            >
              <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.category, { color: theme.colors.primary }]}>{item.category}</Text>
                    {item.priority === 'critical' && (
                      <View style={styles.criticalBadge}>
                        <AlertTriangle color={theme.colors.error} size={10} style={{ marginRight: 3 }} />
                        <Text style={[styles.criticalText, { color: theme.colors.error }]}>CRITICAL</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.title}</Text>
                  
                  <View style={styles.cardFooter}>
                    <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }, isOverdue && { color: theme.colors.error }]}>
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </Text>
                    <ChipStatus status={item.status} />
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// Simple internal helper to render status labels
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
    padding: 16,
  },
  search: {
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  segmented: {
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  criticalText: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.error,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  overdueText: {
    color: theme.colors.error,
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
});
export {};

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Avatar, Card, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MessageSquare, Users, Milestone } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/chat/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to load chat channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatGroups();
  }, []);

  const getGroupName = (group: any) => {
    if (group.type === 'direct') {
      const otherMember = group.members.find((m: any) => m._id !== user?.id);
      return otherMember ? otherMember.username : 'Direct Chat';
    }
    return group.name || 'Group Discussion';
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <MessageSquare color="#64748b" size={20} />;
      case 'group':
        return <Users color="#6366f1" size={20} />;
      default:
        return <Milestone color="#10b981" size={20} />;
    }
  };

  const theme = useTheme();
  const styles = makeStyles(theme);

  if (loading && groups.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChatGroups} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageSquare color={theme.colors.onSurfaceVariant} size={48} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>No active chats found.</Text>
            <Text style={[styles.emptySub, { color: theme.colors.onSurfaceVariant }]}>Chats are created by task assignments or group starts.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item._id}`)}
            activeOpacity={0.7}
          >
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content style={styles.cardContent}>
                <Avatar.Icon
                  size={40}
                  icon={() => getGroupIcon(item.type)}
                  style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}
                />
                
                <View style={styles.info}>
                  <View style={styles.row}>
                    <Text style={[styles.name, { color: theme.colors.onSurface }]} numberOfLines={1}>
                      {getGroupName(item)}
                    </Text>
                    <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
                      {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  
                  <View style={styles.row}>
                    <Text style={[styles.memberCount, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                      {item.members.length} members
                    </Text>
                    {item.type === 'task_discussion' && (
                      <Chip style={styles.badge} textStyle={styles.badgeText}>TASK</Chip>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 96,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: theme.colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 16,
  },
  emptySub: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  card: {
    marginBottom: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.outline,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: 10,
  },
  time: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  badge: {
    height: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    color: theme.colors.secondary,
    fontWeight: '800',
    marginTop: -2,
  },
});
export {};

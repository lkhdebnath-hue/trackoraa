import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Avatar, List, Divider, SegmentedButtons, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LogOut, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { useSettingsStore } from '../../store/settingsStore';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { user, logout } = useAuthStore();
  const { offlineQueue, syncOfflineActions, isSyncing } = useSyncStore();
  const { themePreference, setThemePreference } = useSettingsStore();

  const handleManualSync = async () => {
    if (offlineQueue.length === 0) {
      Alert.alert('Sync Status', 'All local actions are already synchronized.');
      return;
    }

    try {
      await syncOfflineActions();
      Alert.alert('Sync Status', 'Offline queue processed successfully.');
    } catch (err) {
      Alert.alert('Sync Error', 'Failed to synchronize queued operations.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Trackora?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Profile Card Summary */}
      <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={56}
            label={user?.username?.charAt(0)?.toUpperCase() || ''}
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          />
          <View style={styles.profileText}>
            <Text style={[styles.username, { color: theme.colors.onSurface }]}>{user?.username || ''}</Text>
            <Text style={[styles.subText, { color: theme.colors.onSurfaceVariant }]}>Role: {user?.role?.toUpperCase() || ''}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Theme Settings Selection */}
      <List.Section style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>Theme Preference</List.Subheader>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <SegmentedButtons
            value={themePreference}
            onValueChange={(val) => setThemePreference(val as any)}
            buttons={[
              { value: 'light', label: 'Light', labelStyle: { fontSize: 11, fontWeight: '700' } },
              { value: 'dark', label: 'Dark', labelStyle: { fontSize: 11, fontWeight: '700' } },
              { value: 'system', label: 'System', labelStyle: { fontSize: 11, fontWeight: '700' } },
            ]}
          />
        </View>
      </List.Section>

      {/* List Preferences Options */}
      <List.Section style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>User Specifications</List.Subheader>
        
        <List.Item
          title="Employee ID"
          description={user?.employeeId}
          left={(props) => <List.Icon {...props} icon="id-card" color={theme.colors.onSurfaceVariant} />}
          titleStyle={[styles.itemTitle, { color: theme.colors.onSurface }]}
          descriptionStyle={[styles.itemDesc, { color: theme.colors.onSurfaceVariant }]}
        />
        
        <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        
        <List.Item
          title="Department"
          description={user?.department}
          left={(props) => <List.Icon {...props} icon="office-building" color={theme.colors.onSurfaceVariant} />}
          titleStyle={[styles.itemTitle, { color: theme.colors.onSurface }]}
          descriptionStyle={[styles.itemDesc, { color: theme.colors.onSurfaceVariant }]}
        />
      </List.Section>

      {/* Sync / Cache logs */}
      <List.Section style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>Offline Sync Status</List.Subheader>

        <Card style={[styles.syncCard, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
          <Card.Content style={styles.syncContent}>
            <View style={styles.syncTextSection}>
              <Text style={[styles.syncTitle, { color: theme.colors.onSurface }]}>Pending Actions: {offlineQueue.length}</Text>
              <Text style={[styles.syncDesc, { color: theme.colors.onSurfaceVariant }]}>
                {offlineQueue.length > 0
                  ? 'Actions recorded offline are stored locally.'
                  : 'Your device is fully synchronized with the server.'}
              </Text>
            </View>
            <Button
              mode="contained"
              loading={isSyncing}
              onPress={handleManualSync}
              disabled={offlineQueue.length === 0}
              style={[styles.syncBtn, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.syncBtnLabel}
            >
              Sync
            </Button>
          </Card.Content>
        </Card>
      </List.Section>

      {/* Security Policies */}
      <List.Section style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <List.Subheader style={[styles.subheader, { color: theme.colors.primary }]}>Security Policies</List.Subheader>
        <List.Item
          title="Auto Logout"
          description="Inactive mobile sessions automatically terminate after 15 minutes."
          left={(props) => <List.Icon {...props} icon="shield-lock-outline" color={theme.colors.primary} />}
          titleStyle={[styles.itemTitle, { color: theme.colors.onSurface }]}
          descriptionStyle={[styles.itemDesc, { color: theme.colors.onSurfaceVariant }]}
        />
      </List.Section>

      {/* Logout button */}
      <Button
        mode="outlined"
        icon="logout"
        onPress={handleLogout}
        style={[styles.logoutBtn, { borderColor: theme.colors.error }]}
        textColor={theme.colors.error}
      >
        Sign Out
      </Button>
    </ScrollView>
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
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    marginBottom: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onSurface,
  },
  subText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    marginBottom: 20,
    paddingVertical: 4,
  },
  subheader: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  itemTitle: {
    color: theme.colors.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
  itemDesc: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  divider: {
    backgroundColor: theme.colors.outline,
  },
  syncCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  syncContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncTextSection: {
    flex: 1,
    marginRight: 12,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  syncDesc: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '500',
  },
  syncBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  syncBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 8,
    borderColor: theme.colors.error,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
  },
});
export {};

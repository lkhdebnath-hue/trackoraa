import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    if (Platform.OS === 'web') {
      setIsBiometricAvailable(false);
      return;
    }
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const savedUser = await SecureStore.getItemAsync('saved_username');
      setIsBiometricAvailable(hasHardware && isEnrolled && !!savedUser);
    } catch (err) {
      console.warn('Biometrics check failed:', err);
      setIsBiometricAvailable(false);
    }
  };

  const handleLogin = async (usr = username, pwd = password) => {
    if (!usr || !pwd) {
      Alert.alert('Validation Error', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username: usr, password: pwd });
      const { accessToken, refreshToken, user } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      
      // Prompt for enabling biometrics if not set up (mobile only)
      if (Platform.OS !== 'web') {
        const storedUser = await SecureStore.getItemAsync('saved_username');
        if (storedUser !== usr) {
          Alert.alert(
            'Enable Biometrics',
            'Would you like to enable FaceID/Fingerprint for future logins?',
            [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes',
                onPress: async () => {
                  await SecureStore.setItemAsync('saved_username', usr);
                  await SecureStore.setItemAsync('saved_password', pwd);
                  setIsBiometricAvailable(true);
                },
              },
            ]
          );
        }
      }
      
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (Platform.OS === 'web') return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Trackora',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        const savedUser = await SecureStore.getItemAsync('saved_username');
        const savedPass = await SecureStore.getItemAsync('saved_password');
        if (savedUser && savedPass) {
          handleLogin(savedUser, savedPass);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Biometric Error', 'Local authentication failed.');
    }
  };

  const theme: any = useTheme();
  const styles = makeStyles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: theme.colors.primary }]}>TRACKORA</Text>
          <Text style={[styles.subtext, { color: theme.colors.onSurfaceVariant }]}>Mobile Task Tracker</Text>
        </View>

        <TextInput
          label="Username"
          mode="outlined"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
        />

        <TextInput
          label="Password"
          mode="outlined"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          textColor={theme.colors.onSurface}
        />

        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <Button
              mode="contained"
              onPress={() => handleLogin()}
              style={[styles.button]}
              labelStyle={styles.buttonLabel}
            >
              Sign In
            </Button>

            {isBiometricAvailable && (
              <Button
                mode="outlined"
                icon="fingerprint"
                onPress={handleBiometricLogin}
                style={[styles.button, styles.biometricBtn]}
                textColor={theme.colors.primary}
              >
                Sign In with Biometrics
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  subtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  biometricBtn: {
    marginTop: 16,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  buttonLabel: {
    fontWeight: '700',
  },
  loader: {
    marginVertical: 16,
  },
});
export {};

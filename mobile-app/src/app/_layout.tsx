import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const { themePreference } = useSettingsStore();

  const activeScheme = themePreference === 'system' ? systemScheme : themePreference;
  const isDark = activeScheme === 'dark';

  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#5e6ad2', // Linear Indigo
          secondary: '#22c55e', // Notion Green
          error: '#f87171',
          background: '#131418', // Deep Obsidian
          surface: '#1a1b20', // Premium Slate
          surfaceVariant: '#27272a',
          onBackground: '#f4f4f5',
          onSurface: '#f4f4f5',
          outline: '#3f3f46',
          elevation: {
            ...MD3DarkTheme.colors.elevation,
            level1: '#1a1b20',
            level2: '#27272a',
          }
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#4338ca', // Premium Indigo
          secondary: '#059669', // Emerald
          error: '#ef4444',
          background: '#fcfcfc', // Clean off-white
          surface: '#ffffff',
          surfaceVariant: '#f4f4f5',
          onBackground: '#18181b',
          onSurface: '#18181b',
          outline: '#e4e4e7',
          elevation: {
            ...MD3LightTheme.colors.elevation,
            level1: '#ffffff',
            level2: '#f4f4f5',
          }
        },
      };

  const { LightTheme: NavLightTheme, DarkTheme: NavDarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

  const navigationTheme = isDark ? NavDarkTheme : NavLightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <NavigationThemeProvider value={navigationTheme}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen 
                name="tasks/[id]" 
                options={{ 
                  headerShown: true, 
                  title: 'Task Details', 
                  headerStyle: { backgroundColor: paperTheme.colors.surface }, 
                  headerTintColor: paperTheme.colors.onSurface 
                }} 
              />
              <Stack.Screen 
                name="chat/[id]" 
                options={{ 
                  headerShown: true, 
                  title: 'Chat Discussion', 
                  headerStyle: { backgroundColor: paperTheme.colors.surface }, 
                  headerTintColor: paperTheme.colors.onSurface 
                }} 
              />
            </Stack>
          </AuthGate>
        </NavigationThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SETTING_THEME } from '@/data/SettingsRepository';
import { ServicesProvider } from '@/hooks/ServicesContext';
import { t } from '@/i18n/it';
import { getAppServices, type AppServices } from '@/services/appServices';
import {
  parseThemePreference,
  ThemePreferenceContext,
  useTheme,
  type ThemePreference,
} from '@/ui/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5_000 } },
});

export default function RootLayout() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppServices()
      .then(async (s) => {
        const saved = await s.repos.settings.get(SETTING_THEME).catch(() => null);
        setPreferenceState(parseThemePreference(saved));
        setServices(s);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const themeContext = useMemo(
    () => ({
      preference,
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next);
        void services?.repos.settings.set(SETTING_THEME, next === 'system' ? null : next);
      },
    }),
    [preference, services],
  );

  return (
    <ThemePreferenceContext.Provider value={themeContext}>
      <AppShell services={services} error={error} />
    </ThemePreferenceContext.Provider>
  );
}

function AppShell({ services, error }: { services: AppServices | null; error: string | null }) {
  const theme = useTheme();

  if (!services) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        {error ? (
          <Text style={{ color: theme.colors.danger }}>{`${t.common.error}: ${error}`}</Text>
        ) : (
          <ActivityIndicator color={theme.colors.primary} />
        )}
      </View>
    );
  }

  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { color: theme.colors.text },
    contentStyle: { backgroundColor: theme.colors.background },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ServicesProvider services={services}>
          <StatusBar style={theme.dark ? 'light' : 'dark'} />
          <Stack screenOptions={headerOptions}>
            <Stack.Screen name="index" options={{ title: t.list.title }} />
            <Stack.Screen name="groups" options={{ title: t.groups.title }} />
            <Stack.Screen name="scan" options={{ title: t.scan.title }} />
            <Stack.Screen name="book/new" options={{ title: t.form.newTitle }} />
            <Stack.Screen name="book/[id]/index" options={{ title: t.detail.title }} />
            <Stack.Screen name="book/[id]/edit" options={{ title: t.form.editTitle }} />
            <Stack.Screen name="settings/index" options={{ title: t.settings.title }} />
            <Stack.Screen name="settings/tags" options={{ title: t.tags.title }} />
            <Stack.Screen name="settings/types" options={{ title: t.types.title }} />
          </Stack>
        </ServicesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

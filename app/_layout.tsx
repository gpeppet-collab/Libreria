import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getDatabase } from '@/data/db';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    getDatabase()
      .then(() => setDbState('ready'))
      .catch((err: unknown) => {
        setDbError(err instanceof Error ? err.message : String(err));
        setDbState('error');
      });
  }, []);

  if (dbState !== 'ready') {
    return (
      <View style={styles.center}>
        <Text>
          {dbState === 'loading' ? 'Apertura del catalogo…' : `Errore database: ${dbError}`}
        </Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Libreria' }} />
        <Stack.Screen name="groups" options={{ title: 'Per gruppo' }} />
        <Stack.Screen name="scan" options={{ title: 'Scansiona ISBN' }} />
        <Stack.Screen name="book/new" options={{ title: 'Nuovo libro' }} />
        <Stack.Screen name="book/[id]/index" options={{ title: 'Dettaglio' }} />
        <Stack.Screen name="book/[id]/edit" options={{ title: 'Modifica libro' }} />
        <Stack.Screen name="settings/index" options={{ title: 'Impostazioni' }} />
        <Stack.Screen name="settings/tags" options={{ title: 'Tag' }} />
        <Stack.Screen name="settings/types" options={{ title: 'Tipi di libro' }} />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

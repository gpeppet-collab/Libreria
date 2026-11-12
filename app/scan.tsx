import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { normalizeIsbn } from '@/domain/isbn';
import { useServices } from '@/hooks/ServicesContext';
import { t } from '@/i18n/it';
import { Button } from '@/ui/Button';
import { AppText, Screen } from '@/ui/Themed';
import { useTheme } from '@/ui/theme';

/** Scanner codice a barre (RF2, RF10): valida l'ISBN, controlla i duplicati, apre il form. */
export default function ScanScreen() {
  const { colors, spacing } = useTheme();
  const { repos } = useServices();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);

  const onScanned = async (data: string) => {
    if (busy.current) return;
    busy.current = true;
    const isbn = normalizeIsbn(data);
    if (!isbn) {
      setMessage(t.scan.notRecognized);
      setTimeout(() => {
        busy.current = false;
      }, 1500);
      return;
    }
    try {
      const existing = await repos.books.findByIsbn(isbn);
      if (existing) {
        Alert.alert(t.scan.duplicateTitle, t.scan.duplicateMessage(existing.title), [
          { text: t.scan.scanAgain, style: 'cancel', onPress: () => (busy.current = false) },
          { text: t.scan.openBook, onPress: () => router.replace(`/book/${existing.id}`) },
        ]);
        return;
      }
      router.replace({ pathname: '/book/new', params: { isbn } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.common.error);
      busy.current = false;
    }
  };

  if (!permission) return <Screen />;
  if (!permission.granted) {
    return (
      <Screen style={{ padding: spacing.xl, justifyContent: 'center', gap: spacing.md }}>
        <AppText style={styles.center}>{t.scan.permissionNeeded}</AppText>
        <Button title={t.scan.grant} onPress={() => requestPermission()} />
        <Button
          title={t.scan.typeManually}
          variant="secondary"
          onPress={() => router.replace('/book/new')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={(r) => void onScanned(r.data)}
      />
      <View style={[styles.overlay, { padding: spacing.lg, gap: spacing.sm }]}>
        <AppText style={[styles.center, { color: '#FFFFFF' }]}>{message ?? t.scan.hint}</AppText>
        <Button
          title={t.scan.typeManually}
          variant="secondary"
          compact
          onPress={() => router.replace('/book/new')}
        />
      </View>
      <View pointerEvents="none" style={[styles.frame, { borderColor: colors.primary }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  frame: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    right: '12%',
    height: 140,
    borderWidth: 2,
    borderRadius: 12,
  },
  center: { textAlign: 'center' },
});

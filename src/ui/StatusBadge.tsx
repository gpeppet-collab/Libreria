import { StyleSheet, Text, View } from 'react-native';

import { READING_STATUS_LABELS, type ReadingStatus } from '@/domain/types';

import { useTheme } from './theme';

const STATUS_COLORS: Record<ReadingStatus, string> = {
  da_leggere: '#9CA3AF',
  in_lettura: '#2563EB',
  letto: '#16A34A',
  abbandonato: '#B45309',
};

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const { radius } = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: STATUS_COLORS[status], borderRadius: radius.sm }]}
    >
      <Text style={styles.text}>{READING_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGroupCounts } from '@/hooks/useBooks';
import { t } from '@/i18n/it';
import { ChipGroup } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { AppText, ScrollScreen } from '@/ui/Themed';
import { AGE_RANGE_COLORS, useTheme } from '@/ui/theme';

type Field = 'ageRange' | 'bookType';

/** Vista raggruppata (RF14): conteggi per fascia d'età o tipo; il tocco apre la lista filtrata. */
export default function GroupsScreen() {
  const { colors, radius, spacing } = useTheme();
  const [field, setField] = useState<Field>('ageRange');
  const counts = useGroupCounts(field);
  const groups = counts.data ?? [];

  const open = (key: string | null) => {
    const param = field === 'ageRange' ? 'ageRange' : 'bookTypeId';
    router.navigate(key ? { pathname: '/', params: { [param]: key } } : '/');
  };

  return (
    <ScrollScreen>
      <ChipGroup
        options={[
          { value: 'ageRange', label: t.groups.byAgeRange },
          { value: 'bookType', label: t.groups.byBookType },
        ]}
        value={field}
        onChange={(v) => v && setField(v as Field)}
      />
      <ErrorBanner error={counts.error} />
      {!counts.isLoading && groups.length === 0 ? <EmptyState title={t.groups.empty} /> : null}
      {groups.map((g) => (
        <Pressable
          key={g.key ?? '__null'}
          accessibilityRole="button"
          disabled={g.key === null}
          onPress={() => open(g.key)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.swatch,
              {
                backgroundColor:
                  field === 'ageRange' && g.key ? AGE_RANGE_COLORS[g.key] : colors.surfaceAlt,
              },
            ]}
          />
          <AppText variant="heading" style={styles.label}>
            {g.label}
          </AppText>
          <AppText variant="muted">{t.list.count(g.count)}</AppText>
        </Pressable>
      ))}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  label: { flex: 1 },
});

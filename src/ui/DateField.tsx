import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateIt, todayIso } from '@/domain/dates';
import { t } from '@/i18n/it';

import { Button } from './Button';
import { pickDate } from './datePicker';
import { AppText } from './Themed';
import { useTheme } from './theme';

interface DateFieldProps {
  label: string;
  /** `AAAA-MM-GG` oppure stringa vuota. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

/** Campo data: tocco per aprire il calendario, "Oggi" e cancellazione rapida. */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const { colors, radius, spacing } = useTheme();
  const open = async () => {
    const picked = await pickDate(value || null);
    if (picked) onChange(picked);
  };
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={open}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : colors.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Text style={{ fontSize: 16, color: value ? colors.text : colors.textMuted }}>
            {value ? formatDateIt(value) : t.form.datePlaceholder}
          </Text>
        </Pressable>
        <Button
          title={t.common.today}
          variant="secondary"
          compact
          onPress={() => onChange(todayIso())}
        />
        {value ? (
          <Button
            title="×"
            variant="ghost"
            compact
            accessibilityLabel={`${t.common.clear} ${label}`}
            onPress={() => onChange('')}
          />
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

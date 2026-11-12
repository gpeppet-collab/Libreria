import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from './Themed';
import { useTheme } from './theme';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Campo di testo con etichetta, suggerimento ed errore. */
export function Field({ label, error, hint, style, ...rest }: FieldProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
          rest.multiline && styles.multiline,
          style,
        ]}
      />
      {error ? (
        <AppText variant="small" style={{ color: colors.danger }}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useTheme } from './theme';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  compact?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  compact,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const bg = {
    primary: colors.primary,
    secondary: colors.surfaceAlt,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];
  const fg = {
    primary: colors.onPrimary,
    secondary: colors.text,
    danger: '#FFFFFF',
    ghost: colors.primary,
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        compact
          ? { paddingVertical: spacing.xs, paddingHorizontal: spacing.md }
          : { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: fg }, compact && styles.compactText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  text: { fontSize: 16, fontWeight: '600' },
  compactText: { fontSize: 14 },
});

import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './theme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'label';

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const { colors } = useTheme();
  const variantStyle = {
    title: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
    heading: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 16, color: colors.text },
    muted: { fontSize: 14, color: colors.textMuted },
    small: { fontSize: 12, color: colors.textMuted },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.textMuted,
      textTransform: 'uppercase' as const,
    },
  }[variant];
  return <Text {...rest} style={[variantStyle, style]} />;
}

/** Contenitore di schermata con sfondo del tema e padding inferiore sicuro. */
export function Screen({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      style={[
        styles.screen,
        { backgroundColor: colors.background, paddingBottom: insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Schermata scorrevole con padding standard. */
export function ScrollScreen({
  children,
  contentContainerStyle,
  ...rest
}: PropsWithChildren<ScrollViewProps>) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...rest}
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        { padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { spacing } = useTheme();
  return (
    <View
      {...rest}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });

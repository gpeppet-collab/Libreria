import { StyleSheet, View } from 'react-native';

import { AppText } from './Themed';
import { useTheme } from './theme';

/** Messaggio di errore leggibile a partire da un'eccezione. */
export function errorMessage(error: unknown, fallback = 'Si è verificato un errore'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ErrorBanner({ error }: { error: unknown }) {
  const { colors, radius, spacing } = useTheme();
  if (!error) return null;
  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.danger, borderRadius: radius.md, padding: spacing.md },
      ]}
    >
      <AppText style={{ color: colors.danger }}>{errorMessage(error)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { borderWidth: 1 } });

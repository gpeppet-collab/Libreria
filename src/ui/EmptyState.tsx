import { StyleSheet, View } from 'react-native';

import { AppText } from './Themed';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.wrap}>
      <AppText variant="heading" style={styles.center}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="muted" style={styles.center}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
});

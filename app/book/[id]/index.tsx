import { StyleSheet, Text, View } from 'react-native';

/** dettaglio libro con stato, stelle, note, classificazione (RF4, RF5, RF7) */
export default function BookDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Da implementare: dettaglio libro con stato, stelle, note, classificazione (RF4, RF5, RF7)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

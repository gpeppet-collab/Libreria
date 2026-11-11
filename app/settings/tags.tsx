import { StyleSheet, Text, View } from 'react-native';

/** gestione tag: rinomina, elimina (RF13) */
export default function TagsSettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Da implementare: gestione tag: rinomina, elimina (RF13)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

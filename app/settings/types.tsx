import { StyleSheet, Text, View } from 'react-native';

/** gestione tipi di libro (RF12) */
export default function TypesSettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Da implementare: gestione tipi di libro (RF12)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

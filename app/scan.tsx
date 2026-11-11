import { StyleSheet, Text, View } from 'react-native';

/** scanner codice a barre con expo-camera (RF2) */
export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Da implementare: scanner codice a barre con expo-camera (RF2)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

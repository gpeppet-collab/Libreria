import { StyleSheet, Text, View } from 'react-native';

/** impostazioni: export, import, info (RF8, RF9) */
export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Da implementare: impostazioni: export, import, info (RF8, RF9)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

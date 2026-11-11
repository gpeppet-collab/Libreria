import { StyleSheet, Text, View } from 'react-native';

/** vista raggruppata per fascia d&apos;età o tipo (RF14) */
export default function GroupsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Da implementare: vista raggruppata per fascia d&apos;età o tipo (RF14)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

import { StyleSheet, Text, View } from 'react-native';

/** form nuovo libro, precompilabile da ?isbn= (RF1, RF3) */
export default function NewBookScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Da implementare: form nuovo libro, precompilabile da ?isbn= (RF1, RF3)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { textAlign: 'center', opacity: 0.7 },
});

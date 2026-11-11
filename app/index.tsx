import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/** Lista libri (RF6). Stub: la lista reale arriva con `useBooks` e `BookCard`. */
export default function BookListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nessun libro nel catalogo</Text>
      <Text style={styles.hint}>
        Aggiungi il primo libro scansionando l&apos;ISBN o inserendolo a mano.
      </Text>
      <View style={styles.links}>
        <Link href="/scan" style={styles.link}>
          Scansiona ISBN
        </Link>
        <Link href="/book/new" style={styles.link}>
          Inserisci a mano
        </Link>
        <Link href="/groups" style={styles.link}>
          Vista per gruppo
        </Link>
        <Link href="/settings" style={styles.link}>
          Impostazioni
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  hint: { textAlign: 'center', opacity: 0.7 },
  links: { marginTop: 24, gap: 12, alignItems: 'center' },
  link: { fontSize: 16, color: '#1a73e8' },
});

import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useServices } from '@/hooks/ServicesContext';

import { useTheme } from './theme';

interface CoverImageProps {
  path: string | null;
  /** Immagine appena scelta e non ancora salvata: se presente ha la precedenza. */
  previewUri?: string | null;
  title: string;
  width?: number;
}

/** Copertina locale con segnaposto (iniziale del titolo) se assente. */
export function CoverImage({ path, previewUri, title, width = 56 }: CoverImageProps) {
  const { colors, radius } = useTheme();
  const { covers } = useServices();
  const height = Math.round(width * 1.45);
  const uri = previewUri ? (covers.displayUri(previewUri) ?? previewUri) : covers.displayUri(path);
  // Se l'immagine non si carica (file mancante, URL remoto senza rete) si mostra il segnaposto.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={{ width, height, borderRadius: radius.sm }}
        resizeMode="cover"
        onError={() => setFailedUri(uri)}
        accessibilityLabel={`Copertina di ${title}`}
      />
    );
  }
  return (
    <View
      style={[
        styles.placeholder,
        { width, height, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
      ]}
    >
      <Text style={[styles.initial, { color: colors.textMuted, fontSize: width / 2.5 }]}>
        {title.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});

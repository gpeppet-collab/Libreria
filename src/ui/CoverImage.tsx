import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from './theme';

interface CoverImageProps {
  path: string | null;
  title: string;
  width?: number;
}

/** Copertina locale con segnaposto (iniziale del titolo) se assente. */
export function CoverImage({ path, title, width = 56 }: CoverImageProps) {
  const { colors, radius } = useTheme();
  const height = Math.round(width * 1.45);
  if (path) {
    return (
      <Image
        source={{ uri: path }}
        style={{ width, height, borderRadius: radius.sm }}
        resizeMode="cover"
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

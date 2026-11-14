import { Pressable, StyleSheet, View } from 'react-native';

import { formatIsbn13 } from '@/domain/isbn';
import { t } from '@/i18n/it';
import type { BookSearchResult } from '@/services/metadata/MetadataProvider';

import { AppText } from './Themed';
import { useTheme } from './theme';

interface SearchResultsListProps {
  results: BookSearchResult[];
  onSelect: (result: BookSearchResult) => void;
}

/** Elenco dei risultati della ricerca per titolo: tocco per usare un risultato. */
export function SearchResultsList({ results, onSelect }: SearchResultsListProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {results.map((r, i) => {
        const details = [r.publisher, r.publishedYear ? String(r.publishedYear) : null]
          .filter(Boolean)
          .join(' · ');
        return (
          <Pressable
            key={`${r.isbn ?? r.title}-${i}`}
            accessibilityRole="button"
            onPress={() => onSelect(r)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: spacing.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <AppText variant="heading" numberOfLines={2}>
              {r.title}
            </AppText>
            {r.authors.length ? (
              <AppText variant="muted" numberOfLines={1}>
                {r.authors.join(', ')}
              </AppText>
            ) : null}
            <AppText variant="small" numberOfLines={1}>
              {[details, r.isbn ? `ISBN ${formatIsbn13(r.isbn)}` : null, t.sources[r.source]]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: 2 } });

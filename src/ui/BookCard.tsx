import { Pressable, StyleSheet, View } from 'react-native';

import { AGE_RANGE_LABELS, type Book } from '@/domain/types';

import { Chip } from './Chip';
import { CoverImage } from './CoverImage';
import { RatingStars } from './RatingStars';
import { StatusBadge } from './StatusBadge';
import { AppText } from './Themed';
import { AGE_RANGE_COLORS, useTheme } from './theme';

interface BookCardProps {
  book: Book;
  bookTypeName?: string;
  onPress: () => void;
}

export function BookCard({ book, bookTypeName, onPress }: BookCardProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <CoverImage path={book.coverPath} title={book.title} />
      <View style={styles.body}>
        <AppText variant="heading" numberOfLines={2}>
          {book.title}
        </AppText>
        {book.authors.length > 0 ? (
          <AppText variant="muted" numberOfLines={1}>
            {book.authors.join(', ')}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <StatusBadge status={book.status} />
          {book.ageRange ? (
            <Chip label={AGE_RANGE_LABELS[book.ageRange]} color={AGE_RANGE_COLORS[book.ageRange]} />
          ) : null}
          {bookTypeName ? <AppText variant="small">{bookTypeName}</AppText> : null}
        </View>
        {book.rating ? <RatingStars value={book.rating} size={14} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, borderWidth: StyleSheet.hairlineWidth },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
});

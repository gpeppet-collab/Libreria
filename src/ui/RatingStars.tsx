import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Rating } from '@/domain/types';

import { useTheme } from './theme';

interface RatingStarsProps {
  value: Rating | null;
  /** Se presente le stelle sono toccabili; toccare la stella corrente azzera. */
  onChange?: (value: Rating | null) => void;
  size?: number;
}

export function RatingStars({ value, onChange, size = 18 }: RatingStarsProps) {
  const { colors } = useTheme();
  const stars = [1, 2, 3, 4, 5] as const;
  return (
    <View
      style={styles.row}
      accessibilityLabel={value ? `${value} stelle su 5` : 'Nessuna valutazione'}
    >
      {stars.map((s) => {
        const filled = value !== null && s <= value;
        const star = (
          <Text key={s} style={{ fontSize: size, color: filled ? colors.star : colors.border }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        return onChange ? (
          <Pressable
            key={s}
            testID={`star-${s}`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => onChange(value === s ? null : s)}
          >
            {star}
          </Pressable>
        ) : (
          star
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });

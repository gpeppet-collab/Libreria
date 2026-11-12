import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { useTheme } from './theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  color?: string;
  testID?: string;
}

export function Chip({ label, selected, onPress, onRemove, color, testID }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const background = selected ? colors.chipSelected : (color ?? colors.chip);
  const textColor = selected ? colors.chipTextSelected : color ? '#1E1E1E' : colors.chipText;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: background, borderRadius: radius.lg, paddingHorizontal: spacing.md },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Rimuovi ${label}`}
          onPress={onRemove}
          hitSlop={8}
        >
          <Text style={[styles.remove, { color: textColor }]}>×</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export interface ChipOption<V extends string> {
  value: V;
  label: string;
  color?: string;
}

interface ChipGroupProps<V extends string> extends ViewProps {
  options: readonly ChipOption<V>[];
  /** Valore selezionato (singola) o lista (multipla). */
  value: V | null | V[];
  onChange: (value: V | null | V[]) => void;
  multiple?: boolean;
}

/** Gruppo di chip a selezione singola (toccare di nuovo deseleziona) o multipla. */
export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  multiple,
  style,
  ...rest
}: ChipGroupProps<V>) {
  const { spacing } = useTheme();
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const toggle = (v: V) => {
    if (multiple) {
      const list = Array.isArray(value) ? value : [];
      onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    } else {
      onChange(value === v ? null : v);
    }
  };
  return (
    <View {...rest} style={[styles.group, { gap: spacing.sm }, style]}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          color={o.color}
          selected={selectedValues.includes(o.value)}
          onPress={() => toggle(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  label: { fontSize: 14 },
  remove: { fontSize: 16, fontWeight: '700' },
  group: { flexDirection: 'row', flexWrap: 'wrap' },
});

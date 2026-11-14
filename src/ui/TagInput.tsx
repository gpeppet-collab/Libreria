import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { normalizeTagList, normalizeTagName, parseTagInput } from '@/domain/tags';
import { useTags } from '@/hooks/useTags';
import { t } from '@/i18n/it';

import { Chip } from './Chip';
import { AppText } from './Themed';
import { useTheme } from './theme';

const MAX_VISIBLE_TAGS = 12;

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tag proposti (es. dai metadati online): spuntabili, mai applicati in automatico. */
  suggested?: string[];
}

/** Campo tag: chip rimovibili, inserimento con virgola/invio, suggerimenti dai tag esistenti. */
export function TagInput({ value, onChange, suggested = [] }: TagInputProps) {
  const { colors, radius, spacing } = useTheme();
  const [text, setText] = useState('');
  const allTags = useTags();
  const [showAll, setShowAll] = useState(false);

  const add = (names: string[]) => {
    const next = normalizeTagList([...value, ...names]);
    if (next.length !== value.length) onChange(next);
    setText('');
  };
  const remove = (name: string) => onChange(value.filter((v) => v !== name));
  const onChangeText = (s: string) => (/[,;\n]/.test(s) ? add(parseTagInput(s)) : setText(s));

  const pending = suggested.filter((s) => !value.includes(s));
  // Tutti i tag esistenti non ancora scelti, i più usati prima; mentre si scrive, solo quelli che corrispondono.
  const typed = normalizeTagName(text);
  const available = (allTags.data ?? [])
    .filter((s) => !value.includes(s.name) && (!typed || s.name.includes(typed)))
    .sort((a, b) => (b.bookCount ?? 0) - (a.bookCount ?? 0) || a.name.localeCompare(b.name, 'it'));
  const matches = showAll || typed ? available : available.slice(0, MAX_VISIBLE_TAGS);
  const canCreate =
    typed.length > 0 && !value.includes(typed) && !available.some((s) => s.name === typed);

  return (
    <View style={{ gap: spacing.sm }}>
      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((name) => (
            <Chip key={name} label={name} selected onRemove={() => remove(name)} />
          ))}
        </View>
      ) : null}
      <TextInput
        accessibilityLabel={t.form.tags}
        value={text}
        onChangeText={onChangeText}
        onSubmitEditing={() => add(parseTagInput(text))}
        onBlur={() => text.trim() && add(parseTagInput(text))}
        placeholder={t.form.tagsPlaceholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        blurOnSubmit={false}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      />
      {canCreate ? (
        <View style={styles.chips}>
          <Chip label={t.form.addTag(typed)} onPress={() => add([typed])} />
        </View>
      ) : null}
      {matches.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="small">{t.form.yourTags}</AppText>
          <View style={styles.chips}>
            {matches.map((s) => (
              <Chip
                key={s.id}
                label={s.bookCount ? `${s.name} (${s.bookCount})` : s.name}
                onPress={() => add([s.name])}
              />
            ))}
            {!typed && available.length > MAX_VISIBLE_TAGS ? (
              <Chip
                label={showAll ? t.form.showFewerTags : t.form.showAllTags(available.length)}
                selected
                onPress={() => setShowAll((v) => !v)}
              />
            ) : null}
          </View>
        </View>
      ) : null}
      {pending.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="small">{t.form.suggestedTags}</AppText>
          <View style={styles.chips}>
            {pending.map((s) => (
              <Chip key={s} label={`+ ${s}`} onPress={() => add([s])} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    fontSize: 16,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
});

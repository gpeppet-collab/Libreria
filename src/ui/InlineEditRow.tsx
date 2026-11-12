import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { t } from '@/i18n/it';

import { Button } from './Button';
import { AppText, Row } from './Themed';
import { useTheme } from './theme';

interface InlineEditRowProps {
  name: string;
  subtitle?: string;
  onRename: (name: string) => Promise<void>;
  onDelete?: () => void;
  deletable?: boolean;
  busy?: boolean;
}

/** Riga con nome, sottotitolo e azioni rinomina (inline) ed elimina. */
export function InlineEditRow({
  name,
  subtitle,
  onRename,
  onDelete,
  deletable = true,
  busy,
}: InlineEditRowProps) {
  const { colors, radius, spacing } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await onRename(draft);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  };

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.sm,
        },
      ]}
    >
      {editing ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            accessibilityLabel={t.common.rename}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            onSubmitEditing={save}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
              },
            ]}
          />
          {error ? (
            <AppText variant="small" style={{ color: colors.danger }}>
              {error}
            </AppText>
          ) : null}
          <Row>
            <Button
              title={t.common.save}
              compact
              onPress={save}
              loading={busy}
              disabled={!draft.trim()}
            />
            <Button
              title={t.common.cancel}
              variant="secondary"
              compact
              onPress={() => {
                setEditing(false);
                setDraft(name);
                setError(null);
              }}
            />
          </Row>
        </View>
      ) : (
        <Row>
          <View style={styles.text}>
            <AppText variant="heading">{name}</AppText>
            {subtitle ? <AppText variant="small">{subtitle}</AppText> : null}
          </View>
          <Button
            title={t.common.rename}
            variant="secondary"
            compact
            onPress={() => setEditing(true)}
          />
          {onDelete && deletable ? (
            <Button title={t.common.delete} variant="danger" compact onPress={onDelete} />
          ) : null}
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: StyleSheet.hairlineWidth },
  text: { flex: 1 },
  input: { fontSize: 16, borderWidth: StyleSheet.hairlineWidth, minHeight: 40 },
});

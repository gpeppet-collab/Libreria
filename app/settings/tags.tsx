import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useTagMutations, useTags } from '@/hooks/useTags';
import { t } from '@/i18n/it';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Field } from '@/ui/Field';
import { InlineEditRow } from '@/ui/InlineEditRow';
import { Row, ScrollScreen } from '@/ui/Themed';

/** Gestione tag (RF13): aggiungi, rinomina (con unione) ed elimina. */
export default function TagsSettingsScreen() {
  const tags = useTags();
  const { create, rename, remove } = useTagMutations();
  const [name, setName] = useState('');
  const list = tags.data ?? [];

  const add = () => name.trim() && create.mutate(name, { onSuccess: () => setName('') });

  return (
    <ScrollScreen>
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t.common.add}
            value={name}
            onChangeText={setName}
            placeholder={t.tags.newPlaceholder}
            autoCapitalize="none"
            onSubmitEditing={add}
          />
        </View>
        <Button
          title={t.common.add}
          onPress={add}
          disabled={!name.trim()}
          loading={create.isPending}
        />
      </Row>
      <ErrorBanner error={tags.error ?? create.error ?? remove.error} />
      {!tags.isLoading && list.length === 0 ? <EmptyState title={t.tags.empty} /> : null}
      {list.map((tag) => (
        <InlineEditRow
          key={tag.id}
          name={tag.name}
          subtitle={t.tags.count(tag.bookCount ?? 0)}
          busy={rename.isPending}
          onRename={(n) => rename.mutateAsync({ id: tag.id, name: n }).then(() => undefined)}
          onDelete={() =>
            Alert.alert(t.tags.deleteTitle, t.tags.deleteMessage(tag.name, tag.bookCount ?? 0), [
              { text: t.common.cancel, style: 'cancel' },
              { text: t.common.delete, style: 'destructive', onPress: () => remove.mutate(tag.id) },
            ])
          }
        />
      ))}
    </ScrollScreen>
  );
}

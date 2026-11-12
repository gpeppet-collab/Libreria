import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useBookTypeMutations, useBookTypes } from '@/hooks/useBookTypes';
import { t } from '@/i18n/it';
import { Button } from '@/ui/Button';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { Field } from '@/ui/Field';
import { InlineEditRow } from '@/ui/InlineEditRow';
import { Row, ScrollScreen } from '@/ui/Themed';

/** Gestione tipi di libro (RF12): aggiungi, rinomina, elimina (solo non predefiniti). */
export default function TypesSettingsScreen() {
  const types = useBookTypes();
  const { create, rename, remove } = useBookTypeMutations();
  const [name, setName] = useState('');

  const add = () => create.mutate(name, { onSuccess: () => setName('') });

  return (
    <ScrollScreen>
      <Row style={{ alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t.common.add}
            value={name}
            onChangeText={setName}
            placeholder={t.types.newPlaceholder}
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
      <ErrorBanner error={create.error ?? remove.error ?? types.error} />
      {(types.data ?? []).map((type) => (
        <InlineEditRow
          key={type.id}
          name={type.name}
          subtitle={type.builtin ? t.types.builtin : undefined}
          deletable={!type.builtin}
          busy={rename.isPending}
          onRename={(n) => rename.mutateAsync({ id: type.id, name: n }).then(() => undefined)}
          onDelete={() =>
            Alert.alert(t.types.deleteTitle, t.types.deleteMessage(type.name), [
              { text: t.common.cancel, style: 'cancel' },
              {
                text: t.common.delete,
                style: 'destructive',
                onPress: () => remove.mutate(type.id),
              },
            ])
          }
        />
      ))}
    </ScrollScreen>
  );
}

import { Alert } from 'react-native';

import { useTagMutations, useTags } from '@/hooks/useTags';
import { t } from '@/i18n/it';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { InlineEditRow } from '@/ui/InlineEditRow';
import { ScrollScreen } from '@/ui/Themed';

/** Gestione tag (RF13): rinomina (con unione) ed elimina. */
export default function TagsSettingsScreen() {
  const tags = useTags();
  const { rename, remove } = useTagMutations();
  const list = tags.data ?? [];

  return (
    <ScrollScreen>
      <ErrorBanner error={tags.error ?? remove.error} />
      {!tags.isLoading && list.length === 0 ? <EmptyState title={t.tags.empty} /> : null}
      {list.map((tag) => (
        <InlineEditRow
          key={tag.id}
          name={tag.name}
          subtitle={t.tags.count(tag.bookCount ?? 0)}
          busy={rename.isPending}
          onRename={(name) => rename.mutateAsync({ id: tag.id, name }).then(() => undefined)}
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

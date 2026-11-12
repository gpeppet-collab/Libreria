import { router, useLocalSearchParams } from 'expo-router';

import { useBook, useBookMutations } from '@/hooks/useBooks';
import { t } from '@/i18n/it';
import { BookForm } from '@/ui/BookForm';
import { EmptyState } from '@/ui/EmptyState';
import { ScrollScreen } from '@/ui/Themed';

/** Modifica libro (RF7). */
export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useBook(id);
  const { update } = useBookMutations();

  if (book.isLoading) return <ScrollScreen />;
  if (!book.data) {
    return (
      <ScrollScreen>
        <EmptyState title={t.detail.notFound} />
      </ScrollScreen>
    );
  }
  return (
    <ScrollScreen>
      <BookForm
        initial={book.data}
        submitting={update.isPending}
        error={update.error}
        onSubmit={({ book: patch, coverUrl }) =>
          update.mutate({ id: book.data!.id, patch, coverUrl }, { onSuccess: () => router.back() })
        }
      />
    </ScrollScreen>
  );
}

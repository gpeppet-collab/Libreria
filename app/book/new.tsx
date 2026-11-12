import { router, useLocalSearchParams } from 'expo-router';

import { useBookMutations } from '@/hooks/useBooks';
import { BookForm } from '@/ui/BookForm';
import { ScrollScreen } from '@/ui/Themed';

/** Nuovo libro (RF1, RF3): precompilabile da `?isbn=` (scansione). */
export default function NewBookScreen() {
  const { isbn } = useLocalSearchParams<{ isbn?: string }>();
  const { create } = useBookMutations();
  return (
    <ScrollScreen>
      <BookForm
        initialIsbn={isbn}
        submitting={create.isPending}
        error={create.error}
        onSubmit={({ book, coverUrl }) =>
          create.mutate(
            { book, coverUrl },
            { onSuccess: (created) => router.replace(`/book/${created.id}`) },
          )
        }
      />
    </ScrollScreen>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { formatIsbn13 } from '@/domain/isbn';
import {
  AGE_RANGE_LABELS,
  READING_STATUSES,
  READING_STATUS_LABELS,
  type ReadingStatus,
} from '@/domain/types';
import { useBook, useBookMutations } from '@/hooks/useBooks';
import { useBookTypes } from '@/hooks/useBookTypes';
import { t } from '@/i18n/it';
import { Button } from '@/ui/Button';
import { Chip, ChipGroup } from '@/ui/Chip';
import { CoverImage } from '@/ui/CoverImage';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { RatingStars } from '@/ui/RatingStars';
import { AppText, Card, Row, ScrollScreen } from '@/ui/Themed';
import { AGE_RANGE_COLORS, useTheme } from '@/ui/theme';

/** Dettaglio libro (RF4, RF5, RF7): cambio rapido di stato e valutazione, modifica, eliminazione. */
export default function BookDetailScreen() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useBook(id);
  const bookTypes = useBookTypes();
  const { update, remove } = useBookMutations();
  const b = book.data;

  if (book.isLoading) return <ScrollScreen />;
  if (!b) {
    return (
      <ScrollScreen>
        <EmptyState title={t.detail.notFound} />
      </ScrollScreen>
    );
  }

  const confirmDelete = () =>
    Alert.alert(t.detail.deleteTitle, t.detail.deleteMessage(b.title), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => remove.mutate(b.id, { onSuccess: () => router.replace('/') }),
      },
    ]);

  const details = [
    b.publisher,
    b.publishedYear ? String(b.publishedYear) : null,
    b.pageCount ? t.detail.pages(b.pageCount) : null,
  ].filter(Boolean);

  return (
    <ScrollScreen>
      <ErrorBanner error={update.error ?? remove.error} />
      <Card>
        <Row style={{ alignItems: 'flex-start' }}>
          <CoverImage path={b.coverPath} title={b.title} width={96} />
          <View style={styles.headText}>
            <AppText variant="title">{b.title}</AppText>
            {b.authors.length ? <AppText variant="muted">{b.authors.join(', ')}</AppText> : null}
            {details.length ? <AppText variant="small">{details.join(' · ')}</AppText> : null}
            {b.isbn ? <AppText variant="small">ISBN {formatIsbn13(b.isbn)}</AppText> : null}
          </View>
        </Row>
        <View style={styles.chips}>
          {b.ageRange ? (
            <Chip label={AGE_RANGE_LABELS[b.ageRange]} color={AGE_RANGE_COLORS[b.ageRange]} />
          ) : null}
          {b.bookTypeId ? (
            <Chip label={bookTypes.nameById.get(b.bookTypeId) ?? t.common.notSet} />
          ) : null}
          {b.tags.map((tag) => (
            <Chip key={tag} label={`#${tag}`} />
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="label">{t.form.status}</AppText>
        <ChipGroup
          options={READING_STATUSES.map((s) => ({ value: s, label: READING_STATUS_LABELS[s] }))}
          value={b.status}
          onChange={(v) => v && update.mutate({ id: b.id, patch: { status: v as ReadingStatus } })}
        />
        <AppText variant="label">{t.form.rating}</AppText>
        <RatingStars
          value={b.rating}
          size={30}
          onChange={(rating) => update.mutate({ id: b.id, patch: { rating } })}
        />
        {b.startedAt || b.finishedAt ? (
          <AppText variant="small">
            {[
              b.startedAt ? `${t.form.startedAt}: ${b.startedAt}` : null,
              b.finishedAt ? `${t.form.finishedAt}: ${b.finishedAt}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        ) : null}
        {b.notes ? <AppText>{b.notes}</AppText> : null}
      </Card>

      {b.description ? (
        <Card>
          <AppText variant="label">{t.form.description}</AppText>
          <AppText>{b.description}</AppText>
        </Card>
      ) : null}

      <AppText variant="small">{t.detail.addedOn(b.createdAt.slice(0, 10))}</AppText>
      <Row style={{ marginTop: spacing.sm }}>
        <View style={styles.flex}>
          <Button
            title={t.common.edit}
            variant="secondary"
            onPress={() => router.push(`/book/${b.id}/edit`)}
          />
        </View>
        <View style={styles.flex}>
          <Button
            title={t.common.delete}
            variant="danger"
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        </View>
      </Row>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  headText: { flex: 1, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 },
});

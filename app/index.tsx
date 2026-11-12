import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { countActiveFilters, parseBookQueryParams } from '@/domain/bookQueryParams';
import type { BookQuery } from '@/domain/types';
import { useBooks } from '@/hooks/useBooks';
import { useBookTypes } from '@/hooks/useBookTypes';
import { t } from '@/i18n/it';
import { BookCard } from '@/ui/BookCard';
import { Button } from '@/ui/Button';
import { ChipGroup } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorBanner } from '@/ui/ErrorBanner';
import { FilterPanel } from '@/ui/FilterPanel';
import { SearchBar } from '@/ui/SearchBar';
import { AppText, Row, Screen } from '@/ui/Themed';
import { useTheme } from '@/ui/theme';

const SORT_OPTIONS = (['title', 'author', 'createdAt', 'ageRange'] as const).map((s) => ({
  value: s,
  label: t.list.sortLabels[s],
}));

/** Lista libri (RF6): ricerca, filtri combinabili, ordinamento. */
export default function BookListScreen() {
  const { spacing } = useTheme();
  const params = useLocalSearchParams<Record<string, string>>();
  const [query, setQuery] = useState<BookQuery>(() => parseBookQueryParams(params));
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // Filtri ricevuti da altre schermate (es. vista per gruppo): applicati durante il render
  // quando cambiano i parametri, senza effetti (https://react.dev/learn/you-might-not-need-an-effect).
  const paramsKey = JSON.stringify(params);
  const [appliedParamsKey, setAppliedParamsKey] = useState(paramsKey);
  if (paramsKey !== appliedParamsKey) {
    setAppliedParamsKey(paramsKey);
    const incoming = parseBookQueryParams(params);
    if (Object.keys(incoming).length) setQuery((q) => ({ ...q, ...incoming }));
  }

  const books = useBooks(query);
  const bookTypes = useBookTypes();
  const activeFilters = countActiveFilters(query);
  const hasAnyCriteria = activeFilters > 0 || !!query.text;
  const data = useMemo(() => books.data ?? [], [books.data]);

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm }}>
        <SearchBar
          value={query.text ?? ''}
          onChangeText={(text) => setQuery((q) => ({ ...q, text: text || undefined }))}
          placeholder={t.list.searchPlaceholder}
        />
        <Row>
          <Button
            title={activeFilters ? `${t.list.filters} (${activeFilters})` : t.list.filters}
            variant={showFilters ? 'primary' : 'secondary'}
            compact
            onPress={() => setShowFilters((v) => !v)}
          />
          <Button
            title={`${t.list.sort}: ${t.list.sortLabels[query.sort ?? 'title']}`}
            variant={showSort ? 'primary' : 'secondary'}
            compact
            onPress={() => setShowSort((v) => !v)}
          />
          <View style={styles.spacer} />
          <AppText variant="small">{books.data ? t.list.count(books.data.length) : ''}</AppText>
        </Row>
        {showSort ? (
          <Row>
            <ChipGroup
              options={SORT_OPTIONS}
              value={query.sort ?? 'title'}
              onChange={(v) =>
                setQuery((q) => ({ ...q, sort: (v as BookQuery['sort']) ?? 'title' }))
              }
            />
            <Button
              title={query.direction === 'desc' ? '↓' : '↑'}
              variant="secondary"
              compact
              onPress={() =>
                setQuery((q) => ({ ...q, direction: q.direction === 'desc' ? 'asc' : 'desc' }))
              }
            />
          </Row>
        ) : null}
        {showFilters ? <FilterPanel query={query} onChange={setQuery} /> : null}
        <ErrorBanner error={books.error} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            bookTypeName={item.bookTypeId ? bookTypes.nameById.get(item.bookTypeId) : undefined}
            onPress={() => router.push(`/book/${item.id}`)}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: 96,
          gap: spacing.sm,
        }}
        ListEmptyComponent={
          books.isLoading ? undefined : hasAnyCriteria ? (
            <EmptyState title={t.list.noResults} />
          ) : (
            <EmptyState title={t.list.empty} hint={t.list.emptyHint} />
          )
        }
        refreshing={books.isFetching && !books.isLoading}
        onRefresh={() => books.refetch()}
      />

      <View style={[styles.fab, { padding: spacing.lg, gap: spacing.sm }]}>
        <Row>
          <Button
            title={t.list.groups}
            variant="secondary"
            compact
            onPress={() => router.push('/groups')}
          />
          <Button
            title={t.list.settings}
            variant="secondary"
            compact
            onPress={() => router.push('/settings')}
          />
          <View style={styles.spacer} />
          <Button
            title={t.list.manual}
            variant="secondary"
            onPress={() => router.push('/book/new')}
          />
          <Button title={t.list.scan} onPress={() => router.push('/scan')} />
        </Row>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
  fab: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

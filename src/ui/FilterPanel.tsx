import { View } from 'react-native';

import { countActiveFilters } from '@/domain/bookQueryParams';
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  READING_STATUSES,
  READING_STATUS_LABELS,
  UNSET,
  type AgeRange,
  type BookQuery,
  type ReadingStatus,
  type Unset,
} from '@/domain/types';
import { useBookTypes } from '@/hooks/useBookTypes';
import { useTags } from '@/hooks/useTags';
import { t } from '@/i18n/it';

import { Button } from './Button';
import { ChipGroup } from './Chip';
import { AppText, Card } from './Themed';
import { AGE_RANGE_COLORS } from './theme';

interface FilterPanelProps {
  query: BookQuery;
  onChange: (query: BookQuery) => void;
}

/** Pannello filtri della lista (RF6): stato, fascia d'età, tipo, tag. */
export function FilterPanel({ query, onChange }: FilterPanelProps) {
  const bookTypes = useBookTypes();
  const tags = useTags();
  const usedTags = (tags.data ?? []).filter((x) => (x.bookCount ?? 0) > 0);
  const patch = (p: Partial<BookQuery>) => onChange({ ...query, ...p });

  return (
    <Card>
      <AppText variant="label">{t.filters.status}</AppText>
      <ChipGroup
        options={READING_STATUSES.map((s) => ({ value: s, label: READING_STATUS_LABELS[s] }))}
        value={query.status ?? null}
        onChange={(v) => patch({ status: (v as ReadingStatus | null) ?? undefined })}
      />
      <AppText variant="label">{t.filters.ageRange}</AppText>
      <ChipGroup
        options={[
          ...AGE_RANGES.map((a) => ({
            value: a as AgeRange | Unset,
            label: AGE_RANGE_LABELS[a],
            color: AGE_RANGE_COLORS[a],
          })),
          { value: UNSET, label: t.filters.ageRangeUnset },
        ]}
        value={query.ageRange ?? null}
        onChange={(v) => patch({ ageRange: (v as AgeRange | Unset | null) ?? undefined })}
      />
      <AppText variant="label">{t.filters.bookType}</AppText>
      <ChipGroup
        options={[
          ...(bookTypes.data ?? []).map((b) => ({ value: b.id, label: b.name })),
          { value: UNSET, label: t.filters.bookTypeUnset },
        ]}
        value={query.bookTypeId ?? null}
        onChange={(v) => patch({ bookTypeId: (v as string | null) ?? undefined })}
      />
      {usedTags.length > 0 ? (
        <>
          <AppText variant="label">{t.filters.tags}</AppText>
          <ChipGroup
            multiple
            options={usedTags.map((x) => ({ value: x.name, label: `${x.name} (${x.bookCount})` }))}
            value={query.tags ?? []}
            onChange={(v) => patch({ tags: (v as string[]).length ? (v as string[]) : undefined })}
          />
        </>
      ) : null}
      {countActiveFilters(query) > 0 ? (
        <View>
          <Button
            title={t.filters.clearAll}
            variant="ghost"
            compact
            onPress={() =>
              onChange({ text: query.text, sort: query.sort, direction: query.direction })
            }
          />
        </View>
      ) : null}
    </Card>
  );
}

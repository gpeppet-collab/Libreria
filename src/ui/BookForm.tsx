import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { formatIsbn13, normalizeIsbn } from '@/domain/isbn';
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  READING_STATUSES,
  READING_STATUS_LABELS,
  type AgeRange,
  type Book,
  type NewBook,
  type Rating,
  type ReadingStatus,
} from '@/domain/types';
import { useBookTypes } from '@/hooks/useBookTypes';
import { useServices } from '@/hooks/ServicesContext';
import { useMetadataLookup } from '@/hooks/useMetadataLookup';
import { t } from '@/i18n/it';
import type { LookupResult } from '@/services/metadata/MetadataProvider';
import { metadataToBookFields } from '@/services/metadata/toBook';

import { Button } from './Button';
import { ChipGroup } from './Chip';
import { CoverImage } from './CoverImage';
import { ErrorBanner } from './ErrorBanner';
import { Field } from './Field';
import { RatingStars } from './RatingStars';
import { TagInput } from './TagInput';
import { AppText, Card, Row } from './Themed';
import { AGE_RANGE_COLORS, useTheme } from './theme';

export interface BookFormResult {
  book: NewBook;
  /** Copertine candidate da scaricare (dai metadati), se il libro non ne ha una. */
  coverUrls?: string[];
  /** Immagine scelta dall'utente (foto o galleria), da salvare come copertina. */
  coverFileUri?: string;
}

interface BookFormProps {
  initial?: Book | null;
  /** ISBN con cui precompilare e avviare la ricerca online (da scansione). */
  initialIsbn?: string;
  submitting?: boolean;
  error?: unknown;
  onSubmit: (result: BookFormResult) => void;
}

interface FormState {
  title: string;
  authors: string;
  isbn: string;
  publisher: string;
  publishedYear: string;
  pageCount: string;
  description: string;
  ageRange: AgeRange | null;
  bookTypeId: string | null;
  tags: string[];
  status: ReadingStatus;
  rating: Rating | null;
  startedAt: string;
  finishedAt: string;
  notes: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fromBook(book: Book | null | undefined, isbn?: string): FormState {
  return {
    title: book?.title ?? '',
    authors: book?.authors.join(', ') ?? '',
    isbn: book?.isbn ?? isbn ?? '',
    publisher: book?.publisher ?? '',
    publishedYear: book?.publishedYear ? String(book.publishedYear) : '',
    pageCount: book?.pageCount ? String(book.pageCount) : '',
    description: book?.description ?? '',
    ageRange: book?.ageRange ?? null,
    bookTypeId: book?.bookTypeId ?? null,
    tags: book?.tags ?? [],
    status: book?.status ?? 'da_leggere',
    rating: book?.rating ?? null,
    startedAt: book?.startedAt ?? '',
    finishedAt: book?.finishedAt ?? '',
    notes: book?.notes ?? '',
  };
}

/** Messaggio sull'esito della ricerca online, con il dettaglio per fonte. */
function describeLookup(result: LookupResult): string {
  if (result.offline) return t.form.lookupOffline;
  const detail = result.outcomes
    .map((o) => `${t.sources[o.source]}: ${t.form.lookupStatus[o.status]}`)
    .join(' · ');
  const head = result.metadata
    ? t.form.lookupFound(t.sources[result.metadata.source])
    : t.form.lookupNotFound;
  const quota = result.outcomes.some((o) => o.source === 'google_books' && o.status === 'quota')
    ? `\n${t.form.lookupQuotaHint}`
    : '';
  return `${head}\n${detail}${quota}`;
}

/** Form di inserimento e modifica (RF1, RF3, RF4, RF5, RF11, RF12, RF13, RF15). */
export function BookForm({ initial, initialIsbn, submitting, error, onSubmit }: BookFormProps) {
  const { spacing } = useTheme();
  const [form, setForm] = useState<FormState>(() => fromBook(initial, initialIsbn));
  const [touched, setTouched] = useState(false);
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [coverFileUri, setCoverFileUri] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  /** La copertina salvata non si riesce a mostrare (file mancante o non valido). */
  const [coverBroken, setCoverBroken] = useState(false);
  const [onlineCoverMissing, setOnlineCoverMissing] = useState(false);
  const { covers } = useServices();
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const bookTypes = useBookTypes();
  const lookup = useMetadataLookup();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const runLookup = (isbn: string) => {
    lookup.mutate(isbn, {
      onSuccess: (result) => {
        const meta = result.metadata;
        if (!meta) return;
        const fields = metadataToBookFields(meta);
        setForm((f) => ({
          ...f,
          isbn: fields.isbn ?? f.isbn,
          title: f.title || fields.title || '',
          authors: f.authors || (fields.authors ?? []).join(', '),
          publisher: f.publisher || fields.publisher || '',
          publishedYear:
            f.publishedYear || (fields.publishedYear ? String(fields.publishedYear) : ''),
          pageCount: f.pageCount || (fields.pageCount ? String(fields.pageCount) : ''),
          description: f.description || fields.description || '',
        }));
        // Le copertine candidate si tengono sempre: si usano solo se manca una copertina valida.
        setCoverUrls(result.coverUrls);
        setOnlineCoverMissing(!meta.coverUrl);
        setSuggestedTags(meta.suggestedTags ?? []);
      },
    });
  };

  // Da scansione: ricerca automatica all'apertura.
  useEffect(() => {
    if (initialIsbn && !initial) runLookup(initialIsbn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupMessage = lookup.isPending
    ? t.form.lookingUp
    : lookup.isSuccess
      ? describeLookup(lookup.data)
      : null;

  const isbnNormalized = form.isbn.trim() ? normalizeIsbn(form.isbn) : null;
  const errors = useMemo(
    () => ({
      title: !form.title.trim() ? t.form.titleRequired : null,
      isbn: form.isbn.trim() && !isbnNormalized ? t.form.invalidIsbn : null,
      startedAt: form.startedAt && !DATE_RE.test(form.startedAt) ? t.form.invalidDate : null,
      finishedAt: form.finishedAt && !DATE_RE.test(form.finishedAt) ? t.form.invalidDate : null,
    }),
    [form, isbnNormalized],
  );
  const valid = Object.values(errors).every((e) => e === null);

  // Una copertina guasta conta come assente: così quella online la sostituisce.
  const currentCover = removeCover || coverBroken ? null : (initial?.coverPath ?? null);
  const willDownloadCover = coverUrls.length > 0 && !coverFileUri && !currentCover;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const book: NewBook = {
      isbn: isbnNormalized,
      title: form.title,
      authors: form.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      publisher: form.publisher || null,
      publishedYear: form.publishedYear ? Number(form.publishedYear) : null,
      pageCount: form.pageCount ? Number(form.pageCount) : null,
      description: form.description || null,
      coverPath: currentCover,
      status: form.status,
      rating: form.rating,
      notes: form.notes || null,
      startedAt: form.startedAt || null,
      finishedAt: form.finishedAt || null,
      ageRange: form.ageRange,
      bookTypeId: form.bookTypeId,
      tags: form.tags,
    };
    onSubmit({
      book,
      coverUrls: willDownloadCover ? coverUrls : undefined,
      coverFileUri: coverFileUri ?? undefined,
    });
  };

  const pickCover = async (source: 'camera' | 'library') => {
    const uri = await covers.pickImage(source);
    if (uri) {
      setCoverFileUri(uri);
      setRemoveCover(false);
    }
  };

  const today = () => new Date().toISOString().slice(0, 10);

  return (
    <View style={{ gap: spacing.md }}>
      <ErrorBanner error={error} />

      <Card>
        <Field
          label={t.form.isbn}
          value={form.isbn}
          onChangeText={(v) => set('isbn', v)}
          keyboardType="numeric"
          error={touched ? errors.isbn : null}
          hint={isbnNormalized ? formatIsbn13(isbnNormalized) : undefined}
        />
        <Row>
          <Button
            title={t.form.lookup}
            variant="secondary"
            compact
            loading={lookup.isPending}
            disabled={!isbnNormalized}
            onPress={() => isbnNormalized && runLookup(isbnNormalized)}
          />
          {lookupMessage ? (
            <AppText variant="small" style={{ flex: 1 }}>
              {lookupMessage}
            </AppText>
          ) : null}
        </Row>
        <Field
          label={t.form.title}
          value={form.title}
          onChangeText={(v) => set('title', v)}
          error={touched ? errors.title : null}
        />
        <Field
          label={t.form.authors}
          value={form.authors}
          onChangeText={(v) => set('authors', v)}
          hint={t.form.authorsHint}
        />
        <Row>
          <View style={{ flex: 2 }}>
            <Field
              label={t.form.publisher}
              value={form.publisher}
              onChangeText={(v) => set('publisher', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t.form.year}
              value={form.publishedYear}
              onChangeText={(v) => set('publishedYear', v.replace(/\D/g, ''))}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label={t.form.pages}
              value={form.pageCount}
              onChangeText={(v) => set('pageCount', v.replace(/\D/g, ''))}
              keyboardType="numeric"
            />
          </View>
        </Row>
        <Field
          label={t.form.description}
          value={form.description}
          onChangeText={(v) => set('description', v)}
          multiline
        />
      </Card>

      <Card>
        <AppText variant="heading">{t.form.cover}</AppText>
        <Row style={{ alignItems: 'flex-start' }}>
          <CoverImage
            path={currentCover}
            previewUri={coverFileUri}
            title={form.title}
            width={84}
            onLoadError={() => !coverFileUri && setCoverBroken(true)}
          />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Button
              title={t.form.coverCamera}
              variant="secondary"
              compact
              onPress={() => pickCover('camera')}
            />
            <Button
              title={t.form.coverLibrary}
              variant="secondary"
              compact
              onPress={() => pickCover('library')}
            />
            {coverFileUri || currentCover ? (
              <Button
                title={t.form.coverRemove}
                variant="ghost"
                compact
                onPress={() => {
                  setCoverFileUri(null);
                  setRemoveCover(true);
                  setCoverUrls([]);
                }}
              />
            ) : null}
          </View>
        </Row>
        {willDownloadCover ? (
          <AppText variant="small">
            {onlineCoverMissing ? t.form.coverMaybeOnline : t.form.coverWillDownload}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">{t.form.classification}</AppText>
        <AppText variant="label">{t.form.ageRange}</AppText>
        <ChipGroup
          options={AGE_RANGES.map((a) => ({
            value: a,
            label: AGE_RANGE_LABELS[a],
            color: AGE_RANGE_COLORS[a],
          }))}
          value={form.ageRange}
          onChange={(v) => set('ageRange', v as AgeRange | null)}
        />
        <AppText variant="label">{t.form.bookType}</AppText>
        <ChipGroup
          options={(bookTypes.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
          value={form.bookTypeId}
          onChange={(v) => set('bookTypeId', v as string | null)}
        />
        <AppText variant="label">{t.form.tags}</AppText>
        <TagInput value={form.tags} onChange={(v) => set('tags', v)} suggested={suggestedTags} />
      </Card>

      <Card>
        <AppText variant="heading">{t.form.reading}</AppText>
        <AppText variant="label">{t.form.status}</AppText>
        <ChipGroup
          options={READING_STATUSES.map((s) => ({ value: s, label: READING_STATUS_LABELS[s] }))}
          value={form.status}
          onChange={(v) => set('status', (v as ReadingStatus | null) ?? 'da_leggere')}
        />
        <AppText variant="label">{t.form.rating}</AppText>
        <RatingStars value={form.rating} onChange={(v) => set('rating', v)} size={28} />
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              label={t.form.startedAt}
              value={form.startedAt}
              onChangeText={(v) => set('startedAt', v)}
              placeholder={t.form.dateFormat}
              error={touched ? errors.startedAt : null}
            />
          </View>
          <Button
            title={t.common.today}
            variant="secondary"
            compact
            onPress={() => set('startedAt', today())}
          />
        </Row>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field
              label={t.form.finishedAt}
              value={form.finishedAt}
              onChangeText={(v) => set('finishedAt', v)}
              placeholder={t.form.dateFormat}
              error={touched ? errors.finishedAt : null}
            />
          </View>
          <Button
            title={t.common.today}
            variant="secondary"
            compact
            onPress={() => set('finishedAt', today())}
          />
        </Row>
        <Field
          label={t.form.notes}
          value={form.notes}
          onChangeText={(v) => set('notes', v)}
          multiline
        />
      </Card>

      <Button
        title={t.common.save}
        onPress={submit}
        loading={submitting}
        disabled={touched && !valid}
      />
    </View>
  );
}

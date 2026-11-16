import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, type AlertButton } from 'react-native';

import { ExportFormatError } from '@/domain/export';
import { SETTING_GOOGLE_BOOKS_API_KEY } from '@/data/SettingsRepository';
import { useBookCount } from '@/hooks/useBooks';
import { useExportImport } from '@/hooks/useExportImport';
import { useSetting } from '@/hooks/useSettings';
import { t } from '@/i18n/it';
import type { ImportPreview } from '@/services/exportImport/ExportImportService';
import { Button } from '@/ui/Button';
import { ErrorBanner, errorMessage } from '@/ui/ErrorBanner';
import { Field } from '@/ui/Field';
import { ChipGroup } from '@/ui/Chip';
import { AppText, Card, ScrollScreen } from '@/ui/Themed';
import { THEME_PREFERENCES, useThemePreference, type ThemePreference } from '@/ui/theme';

/** Impostazioni (RF8, RF9): export, import, gestione tag e tipi, info. */
export default function SettingsScreen() {
  const count = useBookCount();
  const { exportLibrary, pickImport, applyImport } = useExportImport();
  const themePref = useThemePreference();
  const googleKey = useSetting(SETTING_GOOGLE_BOOKS_API_KEY);
  const [keyDraft, setKeyDraft] = useState<string | null>(null);
  const keyValue = keyDraft ?? googleKey.value ?? '';
  const saveKey = () =>
    googleKey.save.mutate(keyValue, {
      onSuccess: () => {
        Alert.alert(
          t.settings.onlineSearch,
          keyValue.trim() ? t.settings.googleKeySaved : t.settings.googleKeyRemoved,
        );
        setKeyDraft(null);
      },
    });
  const version = Constants.expoConfig?.version ?? '0.0.0';

  const [includeCovers, setIncludeCovers] = useState(true);
  const doExport = (destination: 'share' | 'folder') =>
    exportLibrary.mutate(
      { includeCovers, destination },
      {
        onSuccess: (s) => {
          // Dopo la condivisione non serve un avviso: l'ha già gestita Android.
          if (destination === 'folder' && s.delivered) {
            Alert.alert(t.settings.export, t.settings.exportSaved(s.fileName, s.books, s.covers));
          }
        },
      },
    );

  const applyWith = (preview: ImportPreview, strategy: 'keep' | 'replace') =>
    applyImport.mutate(
      { data: preview.data, strategy },
      { onSuccess: (r) => Alert.alert(t.settings.import, t.settings.importDone(r)) },
    );

  const doImport = () =>
    pickImport.mutate(undefined, {
      onSuccess: (preview) => {
        if (!preview) return;
        const buttons: AlertButton[] = [{ text: t.common.cancel, style: 'cancel' }];
        if (preview.existing > 0) {
          buttons.push(
            { text: t.settings.importKeep, onPress: () => applyWith(preview, 'keep') },
            { text: t.settings.importReplace, onPress: () => applyWith(preview, 'replace') },
          );
        } else {
          buttons.push({ text: t.common.ok, onPress: () => applyWith(preview, 'replace') });
        }
        Alert.alert(
          t.settings.importPreviewTitle,
          t.settings.importPreview(
            preview.total,
            preview.newBooks,
            preview.existing,
            preview.newBookTypes.length,
          ),
          buttons,
        );
      },
      onError: (err) =>
        Alert.alert(
          t.settings.import,
          err instanceof ExportFormatError
            ? `${t.settings.importInvalid}\n${err.message}`
            : errorMessage(err),
        ),
    });

  return (
    <ScrollScreen>
      <Card>
        <AppText variant="heading">{t.settings.catalog}</AppText>
        <AppText variant="muted">
          {count.data !== undefined ? t.list.count(count.data) : ''}
        </AppText>
        <AppText variant="label">{t.settings.export}</AppText>
        <ChipGroup
          options={[
            { value: 'yes', label: t.settings.exportWithCovers },
            { value: 'no', label: t.settings.exportWithoutCovers },
          ]}
          value={includeCovers ? 'yes' : 'no'}
          onChange={(v) => v && setIncludeCovers(v === 'yes')}
        />
        <Button
          title={t.settings.exportToFolder}
          onPress={() => doExport('folder')}
          loading={exportLibrary.isPending}
        />
        <Button
          title={t.settings.exportShare}
          variant="secondary"
          onPress={() => doExport('share')}
          loading={exportLibrary.isPending}
        />
        <AppText variant="small">{t.settings.exportHint}</AppText>
        <AppText variant="label">{t.settings.importLabel}</AppText>
        <Button
          title={t.settings.import}
          variant="secondary"
          onPress={doImport}
          loading={pickImport.isPending || applyImport.isPending}
        />
        <ErrorBanner error={exportLibrary.error ?? applyImport.error} />
      </Card>
      <Card>
        <AppText variant="heading">{t.settings.theme}</AppText>
        <ChipGroup
          options={THEME_PREFERENCES.map((p) => ({ value: p, label: t.settings.themeLabels[p] }))}
          value={themePref.preference}
          onChange={(v) => v && themePref.setPreference(v as ThemePreference)}
        />
      </Card>
      <Card>
        <AppText variant="heading">{t.settings.onlineSearch}</AppText>
        <Field
          label={t.settings.googleKey}
          value={keyValue}
          onChangeText={setKeyDraft}
          autoCapitalize="none"
          autoCorrect={false}
          hint={t.settings.googleKeyHint}
        />
        <Button
          title={t.common.save}
          variant="secondary"
          onPress={saveKey}
          loading={googleKey.save.isPending}
          disabled={keyDraft === null}
        />
      </Card>
      <Card>
        <Button
          title={t.settings.manageTags}
          variant="secondary"
          onPress={() => router.push('/settings/tags')}
        />
        <Button
          title={t.settings.manageTypes}
          variant="secondary"
          onPress={() => router.push('/settings/types')}
        />
      </Card>
      <Card>
        <AppText variant="heading">{t.settings.about}</AppText>
        <AppText variant="muted">{`${t.app.name} · ${t.settings.version(version)}`}</AppText>
        <AppText variant="small">{t.settings.privacy}</AppText>
      </Card>
    </ScrollScreen>
  );
}

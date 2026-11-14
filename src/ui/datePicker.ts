import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { parseIsoDate, toIsoDate } from '@/domain/dates';

/**
 * Apre il calendario di sistema di Android. Restituisce `AAAA-MM-GG`, oppure null se annullato.
 * Sul web Metro usa `datePicker.web.ts`.
 */
export function pickDate(current: string | null): Promise<string | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: parseIsoDate(current) ?? new Date(),
      maximumDate: new Date(),
      onChange: (event, date) => resolve(event.type === 'set' && date ? toIsoDate(date) : null),
    });
  });
}

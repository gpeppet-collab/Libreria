import { todayIso } from '@/domain/dates';

/** Web (anteprima): usa il selettore di data del browser. */
export function pickDate(current: string | null): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = current ?? '';
    input.max = todayIso();
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.bottom = '0';
    document.body.appendChild(input);
    const done = (value: string | null) => {
      input.remove();
      resolve(value);
    };
    input.onchange = () => done(input.value || null);
    input.onblur = () => done(null);
    input.focus();
    try {
      input.showPicker();
    } catch {
      // Browser senza showPicker: resta il campo con il focus.
    }
  });
}

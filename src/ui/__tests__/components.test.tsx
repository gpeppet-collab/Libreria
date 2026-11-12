import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { Rating } from '@/domain/types';

import { ChipGroup } from '../Chip';
import { RatingStars } from '../RatingStars';

function StarsHarness() {
  const [value, setValue] = useState<Rating | null>(null);
  return <RatingStars value={value} onChange={setValue} />;
}

function ChipsHarness({ multiple }: { multiple?: boolean }) {
  const [value, setValue] = useState<string | null | string[]>(multiple ? [] : null);
  return (
    <ChipGroup
      multiple={multiple}
      options={[
        { value: 'a', label: 'Alfa' },
        { value: 'b', label: 'Beta' },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

describe('RatingStars', () => {
  it('imposta la valutazione e la azzera toccando la stessa stella', async () => {
    await render(<StarsHarness />);
    expect(screen.getByLabelText('Nessuna valutazione')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('star-4'));
    expect(screen.getByLabelText('4 stelle su 5')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('star-4'));
    expect(screen.getByLabelText('Nessuna valutazione')).toBeTruthy();
  });
});

describe('ChipGroup', () => {
  const selected = (label: string) =>
    screen.getByRole('button', { name: label }).props.accessibilityState?.selected;

  it('selezione singola: tocca per scegliere, ritocca per togliere', async () => {
    await render(<ChipsHarness />);
    await fireEvent.press(screen.getByText('Alfa'));
    expect(selected('Alfa')).toBe(true);
    await fireEvent.press(screen.getByText('Beta'));
    expect(selected('Alfa')).toBe(false);
    expect(selected('Beta')).toBe(true);
    await fireEvent.press(screen.getByText('Beta'));
    expect(selected('Beta')).toBe(false);
  });

  it('selezione multipla', async () => {
    await render(<ChipsHarness multiple />);
    await fireEvent.press(screen.getByText('Alfa'));
    await fireEvent.press(screen.getByText('Beta'));
    expect(selected('Alfa')).toBe(true);
    expect(selected('Beta')).toBe(true);
    await fireEvent.press(screen.getByText('Alfa'));
    expect(selected('Alfa')).toBe(false);
  });
});

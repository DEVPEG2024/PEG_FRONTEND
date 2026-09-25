import { fitWithin } from '@/utils/imageShrink';

describe('fitWithin — dimensions après réduction', () => {
  test('une image déjà assez petite garde ses dimensions', () => {
    expect(fitWithin(1600, 400, 2560)).toEqual({ width: 1600, height: 400 });
  });
  test('le plus grand côté est ramené à la limite, proportions gardées', () => {
    expect(fitWithin(6000, 4000, 2560)).toEqual({ width: 2560, height: 1707 });
    expect(fitWithin(3000, 6000, 2560)).toEqual({ width: 1280, height: 2560 });
  });
  test("jamais d'agrandissement ni de dimension nulle", () => {
    expect(fitWithin(10, 5, 2560)).toEqual({ width: 10, height: 5 });
    expect(fitWithin(10000, 1, 2560)).toEqual({ width: 2560, height: 1 });
  });
});

import DecimalBase from "decimal.js";

/**
 * Decimal con precisión de 34 dígitos y redondeo "half up" (lejos del cero en el .5),
 * igual que la función REDONDEAR de las planillas de cálculo. Nunca usar `number` para dinero.
 */
export const Decimal = DecimalBase.clone({ precision: 34, rounding: DecimalBase.ROUND_HALF_UP });
export type Decimal = InstanceType<typeof Decimal>;

export function redondear(valor: Decimal, decimales = 2): Decimal {
  return valor.toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP);
}

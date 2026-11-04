import { Decimal } from "../decimal.js";
import type { Concepto, ValorEntrada } from "../liquidar.js";

/**
 * Convenio genérico configurable. Cada estudio puede editar escala, porcentajes y fórmulas;
 * estos son los valores por defecto. Los supuestos están documentados en
 * docs/casos-prueba/casos-prueba-liquidacion.xlsx (hoja "Supuestos").
 */
export const CONCEPTOS_CONVENIO_GENERICO: Concepto[] = [
  {
    codigo: "BASICO",
    nombre: "Sueldo básico",
    tipo: "remunerativo",
    formula: 'SI(TIPO_LIQUIDACION = "MENSUAL", REDONDEAR(BASICO_MES * DIAS_TRABAJADOS / DIVISOR_DIA, 2), 0)',
  },
  {
    codigo: "ANTIGUEDAD",
    nombre: "Antigüedad",
    tipo: "remunerativo",
    formula:
      'SI(Y(TIPO_LIQUIDACION = "MENSUAL", NO(FUERA_CONVENIO)), REDONDEAR(BASICO_MES * PORC_ANTIGUEDAD * ANIOS_ANTIGUEDAD * DIAS_TRABAJADOS / DIVISOR_DIA, 2), 0)',
  },
  {
    codigo: "PRESENTISMO",
    nombre: "Presentismo",
    tipo: "remunerativo",
    formula:
      'SI(Y(TIPO_LIQUIDACION = "MENSUAL", NO(FUERA_CONVENIO), AUSENCIAS_INJUSTIFICADAS = 0), REDONDEAR((BASICO + ANTIGUEDAD) * PORC_PRESENTISMO, 2), 0)',
  },
  {
    codigo: "DESC_AUSENCIAS",
    nombre: "Descuento por ausencias injustificadas",
    tipo: "remunerativo",
    formula: "-REDONDEAR((BASICO + ANTIGUEDAD) / DIVISOR_DIA * AUSENCIAS_INJUSTIFICADAS, 2)",
  },
  {
    codigo: "VALOR_HORA",
    nombre: "Valor hora",
    tipo: "auxiliar",
    formula: "REDONDEAR((BASICO + ANTIGUEDAD + PRESENTISMO) / DIVISOR_HORA, 2)",
  },
  {
    codigo: "HORAS_EXTRA_50",
    nombre: "Horas extra al 50%",
    tipo: "remunerativo",
    formula: "REDONDEAR(VALOR_HORA * RECARGO_HE_50 * HS_EXTRA_50, 2)",
  },
  {
    codigo: "HORAS_EXTRA_100",
    nombre: "Horas extra al 100%",
    tipo: "remunerativo",
    formula: "REDONDEAR(VALOR_HORA * RECARGO_HE_100 * HS_EXTRA_100, 2)",
  },
  {
    codigo: "PLUS_VACACIONAL",
    nombre: "Plus vacacional (art. 155 LCT)",
    tipo: "remunerativo",
    formula:
      "REDONDEAR((BASICO + ANTIGUEDAD + PRESENTISMO) * DIAS_VACACIONES * (1 / DIVISOR_VACACIONES - 1 / DIVISOR_DIA), 2)",
  },
  {
    codigo: "SAC",
    nombre: "Sueldo anual complementario",
    tipo: "remunerativo",
    formula: 'SI(TIPO_LIQUIDACION = "SAC", REDONDEAR(MEJOR_REMUNERACION / 2 * DIAS_TRABAJADOS_SEMESTRE / DIAS_SEMESTRE, 2), 0)',
  },
  {
    codigo: "NO_REMUNERATIVO",
    nombre: "Suma no remunerativa",
    tipo: "no_remunerativo",
    formula: "SUMA_NO_REMUNERATIVA",
  },
  {
    codigo: "BASE_APORTES",
    nombre: "Base de aportes con tope",
    tipo: "auxiliar",
    formula: "MIN(TOTAL_REMUNERATIVO, TOPE_APORTES)",
  },
  {
    codigo: "JUBILACION",
    nombre: "Jubilación",
    tipo: "descuento",
    formula: "REDONDEAR(BASE_APORTES * PORC_JUBILACION, 2)",
  },
  {
    codigo: "LEY_19032",
    nombre: "Ley 19.032 (PAMI)",
    tipo: "descuento",
    formula: "REDONDEAR(BASE_APORTES * PORC_PAMI, 2)",
  },
  {
    codigo: "OBRA_SOCIAL",
    nombre: "Obra social",
    tipo: "descuento",
    formula: "REDONDEAR(BASE_APORTES * PORC_OBRA_SOCIAL, 2)",
  },
  {
    codigo: "SINDICATO",
    nombre: "Cuota sindical",
    tipo: "descuento",
    formula: "SI(FUERA_CONVENIO, 0, REDONDEAR(TOTAL_REMUNERATIVO * PORC_SINDICAL, 2))",
  },
  {
    codigo: "CONTRIB_SIPA",
    nombre: "Contribuciones SIPA",
    tipo: "contribucion",
    formula: "REDONDEAR(TOTAL_REMUNERATIVO * PORC_CONTRIB_SIPA, 2)",
  },
  {
    codigo: "CONTRIB_OBRA_SOCIAL",
    nombre: "Contribución obra social",
    tipo: "contribucion",
    formula: "REDONDEAR(TOTAL_REMUNERATIVO * PORC_CONTRIB_OBRA_SOCIAL, 2)",
  },
];

const d = (v: string) => new Decimal(v);

/** Parámetros de ley y del convenio para el período octubre 2026. */
export const PARAMETROS_OCTUBRE_2026: Record<string, ValorEntrada> = {
  TOPE_APORTES: d("4769631.49"), // Res. ANSES 284/2026
  PORC_JUBILACION: d("0.11"),
  PORC_PAMI: d("0.03"),
  PORC_OBRA_SOCIAL: d("0.03"),
  PORC_SINDICAL: d("0.02"),
  PORC_ANTIGUEDAD: d("0.01"),
  PORC_PRESENTISMO: d("0.0833"),
  DIVISOR_HORA: d("200"),
  RECARGO_HE_50: d("1.5"),
  RECARGO_HE_100: d("2"),
  DIVISOR_DIA: d("30"),
  DIVISOR_VACACIONES: d("25"),
  PORC_CONTRIB_SIPA: d("0.18"),
  PORC_CONTRIB_OBRA_SOCIAL: d("0.06"),
};

/** Escala de ejemplo del convenio genérico (valores inventados con magnitud realista a octubre 2026). */
export const ESCALA_EJEMPLO: Record<string, Decimal> = {
  A: d("1250000"),
  B: d("1320000"),
  C: d("1420000"),
  D: d("1560000"),
  E: d("1750000"),
};

export interface LegajoGenerico {
  /** Categoría de la escala, o null si está fuera de convenio. */
  categoria: string | null;
  sueldoFueraDeConvenio?: Decimal;
  aniosAntiguedad: number;
}

export interface NovedadesGenerico {
  tipoLiquidacion: "MENSUAL" | "SAC";
  diasTrabajados?: number;
  ausenciasInjustificadas?: number;
  horasExtra50?: number;
  horasExtra100?: number;
  diasVacaciones?: number;
  sumaNoRemunerativa?: Decimal;
  mejorRemuneracion?: Decimal;
  diasTrabajadosSemestre?: number;
  diasSemestre?: number;
}

/** Arma las variables de entrada del motor a partir del legajo, las novedades, la escala y los parámetros. */
export function variablesConvenioGenerico(
  legajo: LegajoGenerico,
  novedades: NovedadesGenerico,
  escala: Record<string, Decimal> = ESCALA_EJEMPLO,
  parametros: Record<string, ValorEntrada> = PARAMETROS_OCTUBRE_2026,
): Record<string, ValorEntrada> {
  const fueraDeConvenio = legajo.categoria === null;
  let basicoMes: Decimal;
  if (fueraDeConvenio) {
    if (!legajo.sueldoFueraDeConvenio) throw new Error("Legajo fuera de convenio sin sueldo");
    basicoMes = legajo.sueldoFueraDeConvenio;
  } else {
    const valor = escala[legajo.categoria!];
    if (!valor) throw new Error(`La categoría ${legajo.categoria} no está en la escala`);
    basicoMes = valor;
  }
  return {
    ...parametros,
    TIPO_LIQUIDACION: novedades.tipoLiquidacion,
    FUERA_CONVENIO: fueraDeConvenio,
    BASICO_MES: basicoMes,
    ANIOS_ANTIGUEDAD: legajo.aniosAntiguedad,
    DIAS_TRABAJADOS: novedades.diasTrabajados ?? 30,
    AUSENCIAS_INJUSTIFICADAS: novedades.ausenciasInjustificadas ?? 0,
    HS_EXTRA_50: novedades.horasExtra50 ?? 0,
    HS_EXTRA_100: novedades.horasExtra100 ?? 0,
    DIAS_VACACIONES: novedades.diasVacaciones ?? 0,
    SUMA_NO_REMUNERATIVA: novedades.sumaNoRemunerativa ?? d("0"),
    MEJOR_REMUNERACION: novedades.mejorRemuneracion ?? d("0"),
    DIAS_TRABAJADOS_SEMESTRE: novedades.diasTrabajadosSemestre ?? 0,
    DIAS_SEMESTRE: novedades.diasSemestre ?? 1,
  };
}

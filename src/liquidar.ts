import { Decimal, redondear } from "./decimal.js";
import { evaluar, type Valor } from "./formula/evaluar.js";
import { parsear, variablesDe, type Nodo } from "./formula/parser.js";

export type TipoConcepto = "remunerativo" | "no_remunerativo" | "descuento" | "contribucion" | "auxiliar";

export interface Concepto {
  /** Código único en mayúsculas; el resultado queda disponible como variable con este nombre. */
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  formula: string;
}

export interface ConceptoLiquidado {
  codigo: string;
  nombre: string;
  tipo: TipoConcepto;
  importe: Decimal;
  /** Valor de cada variable que usó la fórmula, para explicar de dónde sale el importe. */
  traza: Record<string, string>;
}

export interface Totales {
  remunerativo: Decimal;
  noRemunerativo: Decimal;
  descuentos: Decimal;
  contribuciones: Decimal;
  neto: Decimal;
  costoEmpleador: Decimal;
}

export interface ResultadoLiquidacion {
  conceptos: ConceptoLiquidado[];
  totales: Totales;
  /** Atajo por código de concepto. */
  importe(codigo: string): Decimal;
}

export type ValorEntrada = Valor | number;

export class ErrorDeLiquidacion extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(`Concepto ${codigo}: ${mensaje}`);
    this.name = "ErrorDeLiquidacion";
  }
}

/** Acumuladores que el motor actualiza a medida que calcula cada concepto, en orden. */
export const ACUMULADORES = {
  remunerativo: "TOTAL_REMUNERATIVO",
  no_remunerativo: "TOTAL_NO_REMUNERATIVO",
  descuento: "TOTAL_DESCUENTOS",
  contribucion: "TOTAL_CONTRIBUCIONES",
} as const;

interface ConceptoCompilado extends Concepto {
  ast: Nodo;
  usa: string[];
}

/**
 * Valida y prepara una lista ordenada de conceptos. Falla si una fórmula tiene errores de sintaxis,
 * si hay códigos repetidos o si un concepto usa otro que se calcula después.
 */
export function compilarConceptos(conceptos: Concepto[]): ConceptoCompilado[] {
  const posiciones = new Map<string, number>();
  conceptos.forEach((c, i) => {
    const codigo = c.codigo.toUpperCase();
    if (posiciones.has(codigo)) throw new ErrorDeLiquidacion(codigo, "código repetido");
    posiciones.set(codigo, i);
  });
  return conceptos.map((c, i) => {
    const codigo = c.codigo.toUpperCase();
    let ast: Nodo;
    try {
      ast = parsear(c.formula);
    } catch (e) {
      throw new ErrorDeLiquidacion(codigo, (e as Error).message);
    }
    const usa = [...variablesDe(ast)];
    for (const v of usa) {
      const pos = posiciones.get(v);
      if (pos !== undefined && pos >= i) {
        throw new ErrorDeLiquidacion(codigo, `usa ${v}, que se calcula ${pos === i ? "en sí mismo" : "después"}`);
      }
    }
    return { ...c, codigo, ast, usa };
  });
}

export function liquidar(conceptos: Concepto[], variables: Record<string, ValorEntrada>): ResultadoLiquidacion {
  const compilados = compilarConceptos(conceptos);
  const valores = new Map<string, Valor>();
  for (const [nombre, v] of Object.entries(variables)) {
    valores.set(nombre.toUpperCase(), typeof v === "number" ? new Decimal(v) : v);
  }
  const acumulado = {
    remunerativo: new Decimal(0),
    no_remunerativo: new Decimal(0),
    descuento: new Decimal(0),
    contribucion: new Decimal(0),
  };
  const sincronizarAcumuladores = () => {
    for (const [tipo, nombre] of Object.entries(ACUMULADORES)) {
      valores.set(nombre, acumulado[tipo as keyof typeof acumulado]);
    }
  };
  sincronizarAcumuladores();

  const resultado: ConceptoLiquidado[] = [];
  for (const c of compilados) {
    let valor: Valor;
    try {
      valor = evaluar(c.ast, { obtener: (n) => valores.get(n) });
    } catch (e) {
      throw new ErrorDeLiquidacion(c.codigo, (e as Error).message);
    }
    if (!(valor instanceof Decimal)) {
      throw new ErrorDeLiquidacion(c.codigo, `la fórmula debe dar un importe y dio ${JSON.stringify(valor)}`);
    }
    const importe = c.tipo === "auxiliar" ? valor : redondear(valor);
    const traza: Record<string, string> = {};
    for (const v of c.usa) traza[v] = formatear(valores.get(v));
    resultado.push({ codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, importe, traza });
    valores.set(c.codigo, importe);
    if (c.tipo !== "auxiliar") {
      acumulado[c.tipo] = acumulado[c.tipo].plus(importe);
      sincronizarAcumuladores();
    }
  }

  const neto = acumulado.remunerativo.plus(acumulado.no_remunerativo).minus(acumulado.descuento);
  const totales: Totales = {
    remunerativo: acumulado.remunerativo,
    noRemunerativo: acumulado.no_remunerativo,
    descuentos: acumulado.descuento,
    contribuciones: acumulado.contribucion,
    neto,
    costoEmpleador: acumulado.remunerativo.plus(acumulado.no_remunerativo).plus(acumulado.contribucion),
  };
  const porCodigo = new Map(resultado.map((r) => [r.codigo, r.importe]));
  return {
    conceptos: resultado,
    totales,
    importe(codigo) {
      const v = porCodigo.get(codigo.toUpperCase());
      if (v === undefined) throw new Error(`No hay concepto ${codigo} en la liquidación`);
      return v;
    },
  };
}

function formatear(v: Valor | undefined): string {
  if (v === undefined) return "";
  return v instanceof Decimal ? v.toFixed() : String(v);
}

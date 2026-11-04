import { Decimal, redondear } from "../decimal.js";
import { ErrorDeFormula } from "./lexer.js";
import type { Nodo } from "./parser.js";

export type Valor = Decimal | string | boolean;

export interface Contexto {
  obtener(nombre: string): Valor | undefined;
}

export const FUNCIONES = ["SI", "Y", "O", "NO", "MIN", "MAX", "REDONDEAR", "ABS"] as const;

export function evaluar(nodo: Nodo, ctx: Contexto): Valor {
  switch (nodo.tipo) {
    case "numero":
      return new Decimal(nodo.valor);
    case "texto":
      return nodo.valor;
    case "variable": {
      const v = ctx.obtener(nodo.nombre);
      if (v === undefined) throw new ErrorDeFormula(`Variable desconocida ${nodo.nombre}`, nodo.posicion);
      return v;
    }
    case "unario": {
      const v = comoNumero(evaluar(nodo.operando, ctx), "el operador " + nodo.operador);
      return nodo.operador === "-" ? v.negated() : v;
    }
    case "binario":
      return evaluarBinario(nodo.operador, evaluar(nodo.izquierda, ctx), evaluar(nodo.derecha, ctx));
    case "funcion":
      return evaluarFuncion(nodo, ctx);
  }
}

function evaluarBinario(operador: string, a: Valor, b: Valor): Valor {
  switch (operador) {
    case "+":
      return comoNumero(a, "+").plus(comoNumero(b, "+"));
    case "-":
      return comoNumero(a, "-").minus(comoNumero(b, "-"));
    case "*":
      return comoNumero(a, "*").times(comoNumero(b, "*"));
    case "/": {
      const divisor = comoNumero(b, "/");
      if (divisor.isZero()) throw new Error("División por cero");
      return comoNumero(a, "/").dividedBy(divisor);
    }
    case "=":
      return iguales(a, b);
    case "<>":
      return !iguales(a, b);
    case "<":
      return comoNumero(a, "<").lessThan(comoNumero(b, "<"));
    case ">":
      return comoNumero(a, ">").greaterThan(comoNumero(b, ">"));
    case "<=":
      return comoNumero(a, "<=").lessThanOrEqualTo(comoNumero(b, "<="));
    case ">=":
      return comoNumero(a, ">=").greaterThanOrEqualTo(comoNumero(b, ">="));
  }
  throw new Error(`Operador desconocido ${operador}`);
}

function evaluarFuncion(nodo: Extract<Nodo, { tipo: "funcion" }>, ctx: Contexto): Valor {
  const args = nodo.argumentos;
  const aridad = (min: number, max = min) => {
    if (args.length < min || args.length > max) {
      const esperado = min === max ? `${min}` : `${min} a ${max}`;
      throw new ErrorDeFormula(`${nodo.nombre} espera ${esperado} argumentos y recibió ${args.length}`, nodo.posicion);
    }
  };
  switch (nodo.nombre) {
    case "SI":
      aridad(3);
      // Evaluación perezosa: solo se calcula la rama elegida.
      return esVerdadero(evaluar(args[0]!, ctx)) ? evaluar(args[1]!, ctx) : evaluar(args[2]!, ctx);
    case "Y":
      aridad(1, Infinity);
      return args.every((a) => esVerdadero(evaluar(a, ctx)));
    case "O":
      aridad(1, Infinity);
      return args.some((a) => esVerdadero(evaluar(a, ctx)));
    case "NO":
      aridad(1);
      return !esVerdadero(evaluar(args[0]!, ctx));
    case "MIN":
      aridad(1, Infinity);
      return Decimal.min(...args.map((a) => comoNumero(evaluar(a, ctx), "MIN")));
    case "MAX":
      aridad(1, Infinity);
      return Decimal.max(...args.map((a) => comoNumero(evaluar(a, ctx), "MAX")));
    case "REDONDEAR": {
      aridad(1, 2);
      const decimales = args[1] ? comoNumero(evaluar(args[1], ctx), "REDONDEAR").toNumber() : 2;
      return redondear(comoNumero(evaluar(args[0]!, ctx), "REDONDEAR"), decimales);
    }
    case "ABS":
      aridad(1);
      return comoNumero(evaluar(args[0]!, ctx), "ABS").abs();
  }
  throw new ErrorDeFormula(`Función desconocida ${nodo.nombre}`, nodo.posicion);
}

function comoNumero(v: Valor, donde: string): Decimal {
  if (v instanceof Decimal) return v;
  throw new Error(`Se esperaba un número en ${donde} y se recibió ${JSON.stringify(v)}`);
}

function esVerdadero(v: Valor): boolean {
  if (typeof v === "boolean") return v;
  if (v instanceof Decimal) return !v.isZero();
  return v.length > 0;
}

function iguales(a: Valor, b: Valor): boolean {
  if (a instanceof Decimal && b instanceof Decimal) return a.equals(b);
  return a === b;
}

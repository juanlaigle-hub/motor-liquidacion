import { ErrorDeFormula, tokenizar, type Token } from "./lexer.js";

export type Nodo =
  | { tipo: "numero"; valor: string }
  | { tipo: "texto"; valor: string }
  | { tipo: "variable"; nombre: string; posicion: number }
  | { tipo: "unario"; operador: "-" | "+"; operando: Nodo }
  | { tipo: "binario"; operador: string; izquierda: Nodo; derecha: Nodo }
  | { tipo: "funcion"; nombre: string; argumentos: Nodo[]; posicion: number };

const COMPARACIONES = new Set(["=", "<>", "<", ">", "<=", ">="]);

/**
 * Gramática (de menor a mayor precedencia):
 *   comparacion := suma (("=" | "<>" | "<" | ">" | "<=" | ">=") suma)?
 *   suma        := producto (("+" | "-") producto)*
 *   producto    := unario (("*" | "/") unario)*
 *   unario      := ("-" | "+") unario | primario
 *   primario    := numero | texto | IDENT | IDENT "(" argumentos ")" | "(" comparacion ")"
 */
export function parsear(fuente: string): Nodo {
  const tokens = tokenizar(fuente);
  let i = 0;
  const actual = (): Token => tokens[i]!;
  const avanzar = (): Token => tokens[i++]!;

  const esperar = (tipo: Token["tipo"], descripcion: string): Token => {
    const t = actual();
    if (t.tipo !== tipo) throw new ErrorDeFormula(`Se esperaba ${descripcion}`, t.posicion);
    return avanzar();
  };

  const comparacion = (): Nodo => {
    const izquierda = suma();
    const t = actual();
    if (t.tipo === "operador" && COMPARACIONES.has(t.valor)) {
      avanzar();
      return { tipo: "binario", operador: t.valor, izquierda, derecha: suma() };
    }
    return izquierda;
  };

  const suma = (): Nodo => {
    let nodo = producto();
    while (actual().tipo === "operador" && (actual().valor === "+" || actual().valor === "-")) {
      const operador = avanzar().valor;
      nodo = { tipo: "binario", operador, izquierda: nodo, derecha: producto() };
    }
    return nodo;
  };

  const producto = (): Nodo => {
    let nodo = unario();
    while (actual().tipo === "operador" && (actual().valor === "*" || actual().valor === "/")) {
      const operador = avanzar().valor;
      nodo = { tipo: "binario", operador, izquierda: nodo, derecha: unario() };
    }
    return nodo;
  };

  const unario = (): Nodo => {
    const t = actual();
    if (t.tipo === "operador" && (t.valor === "-" || t.valor === "+")) {
      avanzar();
      return { tipo: "unario", operador: t.valor, operando: unario() };
    }
    return primario();
  };

  const primario = (): Nodo => {
    const t = avanzar();
    switch (t.tipo) {
      case "numero":
        return { tipo: "numero", valor: t.valor };
      case "texto":
        return { tipo: "texto", valor: t.valor };
      case "identificador": {
        if (actual().tipo !== "parentesis_abre") {
          return { tipo: "variable", nombre: t.valor, posicion: t.posicion };
        }
        avanzar();
        const argumentos: Nodo[] = [];
        if (actual().tipo !== "parentesis_cierra") {
          argumentos.push(comparacion());
          while (actual().tipo === "coma") {
            avanzar();
            argumentos.push(comparacion());
          }
        }
        esperar("parentesis_cierra", '")"');
        return { tipo: "funcion", nombre: t.valor, argumentos, posicion: t.posicion };
      }
      case "parentesis_abre": {
        const nodo = comparacion();
        esperar("parentesis_cierra", '")"');
        return nodo;
      }
      default:
        throw new ErrorDeFormula(
          t.tipo === "fin" ? "La fórmula termina antes de tiempo" : `Token inesperado "${t.valor}"`,
          t.posicion,
        );
    }
  };

  const raiz = comparacion();
  if (actual().tipo !== "fin") {
    throw new ErrorDeFormula(`Token inesperado "${actual().valor}"`, actual().posicion);
  }
  return raiz;
}

/** Nombres de variables que usa una fórmula, para validar dependencias y armar la traza. */
export function variablesDe(nodo: Nodo, acumulado = new Set<string>()): Set<string> {
  switch (nodo.tipo) {
    case "variable":
      acumulado.add(nodo.nombre);
      break;
    case "unario":
      variablesDe(nodo.operando, acumulado);
      break;
    case "binario":
      variablesDe(nodo.izquierda, acumulado);
      variablesDe(nodo.derecha, acumulado);
      break;
    case "funcion":
      for (const a of nodo.argumentos) variablesDe(a, acumulado);
      break;
  }
  return acumulado;
}

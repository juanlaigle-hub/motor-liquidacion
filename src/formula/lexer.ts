export type TipoToken =
  | "numero"
  | "texto"
  | "identificador"
  | "operador"
  | "parentesis_abre"
  | "parentesis_cierra"
  | "coma"
  | "fin";

export interface Token {
  tipo: TipoToken;
  valor: string;
  posicion: number;
}

export class ErrorDeFormula extends Error {
  constructor(
    mensaje: string,
    readonly posicion: number,
  ) {
    super(`${mensaje} (posición ${posicion + 1})`);
    this.name = "ErrorDeFormula";
  }
}

const OPERADORES = ["<=", ">=", "<>", "+", "-", "*", "/", "=", "<", ">"];

// Identificadores en mayúsculas o minúsculas, con dígitos y guion bajo: BASICO, HS_EXTRA_50.
const INICIO_IDENTIFICADOR = /[A-Za-zÁÉÍÓÚÑáéíóúñ_]/;
const CUERPO_IDENTIFICADOR = /[A-Za-zÁÉÍÓÚÑáéíóúñ_0-9]/;

export function tokenizar(fuente: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < fuente.length) {
    const c = fuente[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(fuente[i + 1] ?? ""))) {
      const inicio = i;
      while (i < fuente.length && /[0-9.]/.test(fuente[i]!)) i++;
      const valor = fuente.slice(inicio, i);
      if ((valor.match(/\./g) ?? []).length > 1) {
        throw new ErrorDeFormula(`Número inválido "${valor}"`, inicio);
      }
      tokens.push({ tipo: "numero", valor, posicion: inicio });
      continue;
    }
    if (c === '"') {
      const inicio = i;
      const cierre = fuente.indexOf('"', i + 1);
      if (cierre === -1) throw new ErrorDeFormula("Texto sin comilla de cierre", inicio);
      tokens.push({ tipo: "texto", valor: fuente.slice(i + 1, cierre), posicion: inicio });
      i = cierre + 1;
      continue;
    }
    if (INICIO_IDENTIFICADOR.test(c)) {
      const inicio = i;
      while (i < fuente.length && CUERPO_IDENTIFICADOR.test(fuente[i]!)) i++;
      tokens.push({ tipo: "identificador", valor: fuente.slice(inicio, i).toUpperCase(), posicion: inicio });
      continue;
    }
    if (c === "(") {
      tokens.push({ tipo: "parentesis_abre", valor: c, posicion: i++ });
      continue;
    }
    if (c === ")") {
      tokens.push({ tipo: "parentesis_cierra", valor: c, posicion: i++ });
      continue;
    }
    if (c === "," || c === ";") {
      tokens.push({ tipo: "coma", valor: ",", posicion: i++ });
      continue;
    }
    const operador = OPERADORES.find((op) => fuente.startsWith(op, i));
    if (operador) {
      tokens.push({ tipo: "operador", valor: operador, posicion: i });
      i += operador.length;
      continue;
    }
    throw new ErrorDeFormula(`Carácter inesperado "${c}"`, i);
  }
  tokens.push({ tipo: "fin", valor: "", posicion: fuente.length });
  return tokens;
}

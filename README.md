# Payroll calculation engine (Argentina)

[![CI](https://github.com/juanlaigle-hub/motor-liquidacion/actions/workflows/ci.yml/badge.svg)](https://github.com/juanlaigle-hub/motor-liquidacion/actions/workflows/ci.yml)

The calculation engine behind [sueldos.ingenieriavr.com](https://sueldos.ingenieriavr.com), a multi-tenant SaaS that accounting firms use to run payroll for their client companies.

Payroll rules are not hard-coded. Each pay item (basic salary, seniority, overtime, deductions, employer contributions) is a **formula written in Spanish**, so an accountant can read and adjust it without touching code. The engine parses those formulas, evaluates them in order and keeps a trace of how every amount was computed.

```text
SI(Y(TIPO_LIQUIDACION = "MENSUAL", NO(FUERA_CONVENIO), AUSENCIAS_INJUSTIFICADAS = 0),
   REDONDEAR((BASICO + ANTIGUEDAD) * PORC_PRESENTISMO, 2), 0)
```

## What it shows

- **A small language, built from scratch:** lexer, recursive-descent parser and evaluator, with `SI`, `Y`, `O`, `NO`, `MIN`, `MAX`, `REDONDEAR` and `ABS`, plus clear errors that point to the position in the formula.
- **Exact money math:** decimal arithmetic (`decimal.js`) with the same rounding as a spreadsheet, so results match to the cent. No floating point.
- **Dependency-aware evaluation:** items are compiled once, evaluated in order and rolled up into totals (`TOTAL_REMUNERATIVO`, `TOTAL_NO_REMUNERATIVO`, `TOTAL_DESCUENTOS`, `TOTAL_CONTRIBUCIONES`).
- **A configurable generic collective agreement:** 17 items covering basic pay, seniority, attendance bonus, absences, 50% and 100% overtime, vacation pay, 13th-month salary (SAC), capped social-security deductions and employer contributions.
- **Validation against reference cases:** 10 worked payroll cases prepared in a spreadsheet are replayed as tests and must match item by item.

## Usage

```ts
import { CONCEPTOS_CONVENIO_GENERICO, liquidar, variablesConvenioGenerico } from "./src/index.js";

const variables = variablesConvenioGenerico(
  { categoria: "C", aniosAntiguedad: 6 },
  { tipoLiquidacion: "MENSUAL", diasTrabajados: 30 },
);
const r = liquidar(CONCEPTOS_CONVENIO_GENERICO, variables);
r.totales.neto.toFixed(2); // "1320772.37"
```

## Run it

```bash
npm install
npm test          # 20 tests, including the 10 reference cases
npm run typecheck
```

Every push runs type checking and tests on GitHub Actions.

## Structure

```text
src/
  formula/lexer.ts      tokenizer
  formula/parser.ts     recursive-descent parser to an AST
  formula/evaluar.ts    evaluator and built-in functions
  liquidar.ts           compiles items and runs a payroll
  decimal.ts            decimal type and spreadsheet-style rounding
  convenios/generico.ts generic collective agreement
test/
  fixtures/casos-planilla.json  reference cases
```

The percentages and assumptions of the generic agreement are illustrative and must be checked against the actual collective agreement before use with real data.

---

**Español.** Motor de cálculo de la plataforma de liquidación de sueldos de Ingeniería VR. Los conceptos se escriben como fórmulas en español, con aritmética decimal exacta y redondeo igual al de una planilla. Incluye un convenio genérico configurable y 10 casos de referencia que se validan concepto por concepto en los tests.

Autor: [Juan Laiglecia](https://www.linkedin.com/in/juanlaiglecia) · [Ingeniería VR](https://www.ingenieriavr.com)

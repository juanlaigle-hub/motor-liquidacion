import { describe, expect, it } from "vitest";
import { ErrorDeLiquidacion, liquidar, type Concepto } from "../src/index.js";

describe("liquidar", () => {
  it("calcula en orden, acumula por tipo y guarda la traza", () => {
    const conceptos: Concepto[] = [
      { codigo: "BASICO", nombre: "Básico", tipo: "remunerativo", formula: "SUELDO" },
      { codigo: "PREMIO", nombre: "Premio", tipo: "no_remunerativo", formula: "BASICO * 0.1" },
      { codigo: "APORTE", nombre: "Aporte", tipo: "descuento", formula: "TOTAL_REMUNERATIVO * 0.17" },
      { codigo: "CONTRIB", nombre: "Contribución", tipo: "contribucion", formula: "TOTAL_REMUNERATIVO * 0.24" },
    ];
    const r = liquidar(conceptos, { SUELDO: 1000 });
    expect(r.totales.neto.toFixed(2)).toBe("930.00");
    expect(r.totales.costoEmpleador.toFixed(2)).toBe("1340.00");
    expect(r.conceptos[2]!.traza).toEqual({ TOTAL_REMUNERATIVO: "1000" });
  });

  it("rechaza un concepto que usa otro calculado después", () => {
    const conceptos: Concepto[] = [
      { codigo: "A", nombre: "A", tipo: "remunerativo", formula: "B * 2" },
      { codigo: "B", nombre: "B", tipo: "remunerativo", formula: "1" },
    ];
    expect(() => liquidar(conceptos, {})).toThrow(/usa B, que se calcula después/);
  });

  it("indica qué concepto falló", () => {
    const conceptos: Concepto[] = [{ codigo: "X", nombre: "X", tipo: "remunerativo", formula: "FALTA * 2" }];
    expect(() => liquidar(conceptos, {})).toThrow(ErrorDeLiquidacion);
    expect(() => liquidar(conceptos, {})).toThrow(/Concepto X: Variable desconocida FALTA/);
  });
});

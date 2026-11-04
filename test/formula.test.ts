import { describe, expect, it } from "vitest";
import { Decimal, ErrorDeFormula, evaluar, parsear, type Valor } from "../src/index.js";

const calc = (formula: string, vars: Record<string, Valor> = {}) =>
  evaluar(parsear(formula), { obtener: (n) => vars[n] });

describe("lenguaje de fórmulas", () => {
  it("respeta precedencia y paréntesis", () => {
    expect(String(calc("2 + 3 * 4"))).toBe("14");
    expect(String(calc("(2 + 3) * 4"))).toBe("20");
    expect(String(calc("-2 * -3"))).toBe("6");
  });

  it("opera con decimales exactos, sin errores de punto flotante", () => {
    expect(String(calc("0.1 + 0.2"))).toBe("0.3");
  });

  it("redondea como una planilla (half up, lejos del cero)", () => {
    expect(String(calc("REDONDEAR(2.345, 2)"))).toBe("2.35");
    expect(String(calc("REDONDEAR(-2.345, 2)"))).toBe("-2.35");
    expect(String(calc("REDONDEAR(10 / 3)"))).toBe("3.33");
  });

  it("evalúa SI, Y, O, NO y comparaciones", () => {
    const vars = { AUSENCIAS: new Decimal(0), TIPO: "MENSUAL", FC: false };
    expect(calc('SI(Y(TIPO = "MENSUAL", NO(FC), AUSENCIAS = 0), 1, 2)', vars).toString()).toBe("1");
    expect(calc("O(AUSENCIAS > 0, FC)", vars)).toBe(false);
    expect(calc("AUSENCIAS <> 1", vars)).toBe(true);
  });

  it("acepta minúsculas y punto y coma como separador", () => {
    expect(String(calc("si(1 > 0; max(1; 5); 0)"))).toBe("5");
  });

  it("SI solo evalúa la rama elegida", () => {
    expect(String(calc("SI(1 = 1, 7, 1 / 0)"))).toBe("7");
  });

  it("informa errores con la posición", () => {
    expect(() => parsear("BASICO * (2 + 3")).toThrow(ErrorDeFormula);
    expect(() => parsear("BASICO * (2 + 3")).toThrow(/posición 16/);
    expect(() => parsear("BASICO # 2")).toThrow(/Carácter inesperado/);
    expect(() => calc("NOEXISTE + 1")).toThrow(/Variable desconocida NOEXISTE/);
    expect(() => calc("SI(1, 2)")).toThrow(/SI espera 3 argumentos/);
    expect(() => calc("1 / 0")).toThrow(/División por cero/);
  });
});

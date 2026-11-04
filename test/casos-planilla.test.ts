import { describe, expect, it } from "vitest";
import casos from "./fixtures/casos-planilla.json";
import {
  CONCEPTOS_CONVENIO_GENERICO,
  Decimal,
  liquidar,
  variablesConvenioGenerico,
  type NovedadesGenerico,
} from "../src/index.js";

// Resultados esperados exportados de docs/casos-prueba/casos-prueba-liquidacion.xlsx.
// El motor tiene que coincidir al centavo en cada concepto y en los totales.
describe("casos de la planilla de prueba", () => {
  for (const caso of casos) {
    it(`caso ${caso.caso}: ${caso.descripcion}`, () => {
      const n = caso.novedades;
      const novedades: NovedadesGenerico = {
        ...n,
        tipoLiquidacion: n.tipoLiquidacion as NovedadesGenerico["tipoLiquidacion"],
        sumaNoRemunerativa: new Decimal(n.sumaNoRemunerativa),
        mejorRemuneracion: new Decimal(n.mejorRemuneracion),
      };
      const legajo = {
        categoria: caso.legajo.categoria,
        aniosAntiguedad: caso.legajo.aniosAntiguedad,
        sueldoFueraDeConvenio: caso.legajo.sueldoFueraDeConvenio
          ? new Decimal(caso.legajo.sueldoFueraDeConvenio)
          : undefined,
      };
      const r = liquidar(CONCEPTOS_CONVENIO_GENERICO, variablesConvenioGenerico(legajo, novedades));

      for (const [codigo, esperado] of Object.entries(caso.esperado)) {
        expect(r.importe(codigo).toFixed(2), codigo).toBe(esperado);
      }
      expect(r.totales.remunerativo.toFixed(2)).toBe(caso.totales.remunerativo);
      expect(r.totales.descuentos.toFixed(2)).toBe(caso.totales.descuentos);
      expect(r.totales.neto.toFixed(2)).toBe(caso.totales.neto);
      expect(r.totales.costoEmpleador.toFixed(2)).toBe(caso.totales.costoEmpleador);
    });
  }
});

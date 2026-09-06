import { resumenDelCurso } from "../dominio/reglas.js";
import { nombreDeArea, compararCursos } from "../dominio/areas.js";
import { fechaLarga, ordinalTrimestre } from "../salida/fecha.js";

/** Los grados que atiende la profesora, tal como los pide el formato oficial. */
export const GRADOS_POR_DEFECTO = [
  { grado: "2 A", programados: "", avanzados: "" },
  { grado: "3 A - B", programados: "", avanzados: "" },
  { grado: "4 A - B", programados: "", avanzados: "" },
  { grado: "5 A - B", programados: "", avanzados: "" },
  { grado: "6 A - B", programados: "", avanzados: "" },
];

/** "2A" → "2 A", para que la tabla se lea como en el Word oficial. */
export function etiquetaDeCurso(curso) {
  const m = /^S?([1-6])\s*([A-D])$/.exec((curso || "").toUpperCase().trim());
  return m ? `${m[1]} ${m[2]}` : curso || "";
}

/**
 * Arma el contexto del informe de porcentaje de temas avanzados.
 *
 * Manual: temas programados y avanzados por grado (eso no está en las notas).
 * Calculado: aprobados y reprobados de cada curso, contados sobre los PDF que
 * se hayan cargado. Si un curso no se cargó, no aparece: el informe no inventa
 * filas.
 */
export function prepararTemas(cursos, trimestre, manual = {}) {
  const grados = (manual.grados || GRADOS_POR_DEFECTO).map(g => {
    const programados = Number(g.programados) || 0;
    const avanzados = Number(g.avanzados) || 0;
    return {
      grado: g.grado,
      programados: g.programados === "" || g.programados === undefined ? "" : String(programados),
      avanzados: g.avanzados === "" || g.avanzados === undefined ? "" : String(avanzados),
      porcentaje: programados > 0 ? String(Math.round((avanzados / programados) * 100)) : "",
    };
  });

  const filasCursos = (cursos || []).map(curso => {
    const r = resumenDelCurso(curso.estudiantes || [], trimestre);
    return {
      curso: etiquetaDeCurso(curso.curso),
      aprobados: String(r.aprobados),
      porcentajeAprobados: String(r.porcentajeAprobados),
      reprobados: String(r.reprobados),
      porcentajeReprobados: String(r.porcentajeReprobados),
      total: r.total,
      sinDatos: r.sinDatos,
    };
  }).sort((a, b) => compararCursos(a.curso, b.curso));

  const codigo = manual.area || (cursos || [])[0]?.areas?.[0] || "";

  return {
    profesor: manual.profesor || (cursos || [])[0]?.profesor || "",
    area: nombreDeArea(codigo),
    fecha: fechaLarga(),
    trimestreCorto: ordinalTrimestre(trimestre),
    grados,
    cursos: filasCursos,
  };
}

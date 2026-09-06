import { notaNecesaria as calcular, notaDe, NOTA_MINIMA } from "../dominio/reglas.js";
import { fechaMayuscula, nombreTrimestre } from "../salida/fecha.js";

/**
 * Arma el contexto del informe de nota necesaria para aprobar.
 *
 * Sólo tiene sentido en el 1er y el 2do trimestre: en el tercero ya no queda
 * nada por delante. Una fila por estudiante y área en riesgo, con el nombre
 * completo, las notas que ya tiene y cuánto necesita.
 */
export function prepararNotaNecesaria(curso, trimestre) {
  const estudiantes = curso.estudiantes || [];
  const areas = curso.areas || [];
  const restantes = 3 - trimestre;

  const filas = [];
  const estudiantesEnRiesgo = new Set();
  let irrecuperables = 0;
  // Con el centralizador de un solo trimestre no hay notas del primero, y la
  // cuenta saldría como si todos hubieran sacado 0. Conviene avisarlo.
  const faltaT1 = trimestre >= 2 &&
    !estudiantes.some(e => Object.values(e.notas).some(n => n.t1 !== null));

  for (const est of estudiantes) {
    for (const area of areas) {
      const notas = est.notas[area];
      if (!notas) continue;
      if (notaDe(notas, trimestre) === null) continue; // sin nota en el trimestre

      const resultado = calcular(notas, trimestre);
      if (resultado.necesaria === null) continue;
      if (resultado.necesaria <= NOTA_MINIMA) continue; // ya está encaminado

      if (!resultado.alcanzable) irrecuperables++;
      estudiantesEnRiesgo.add(est.nombre);

      filas.push({
        nro: String(est.nro),
        nombre: est.nombre,
        areaT1: `${area}  ${notas.t1 ?? "-"}`,
        t2: trimestre >= 2 ? String(notas.t2 ?? "-") : "-",
        necesaria: resultado.alcanzable ? String(resultado.necesaria) : "NO ALCANZA",
      });
    }
  }

  const destino = trimestre === 1
    ? "el 2do y el 3er trimestre"
    : "el 3er trimestre";

  return {
    colegio: curso.colegio || "COLEGIO SANTA ANA",
    curso: curso.curso || "",
    cursoLargo: `Curso ${curso.curso || ""} · gestión ${curso.gestion || ""}`,
    trimestre: nombreTrimestre(trimestre),
    trimestreDestino: destino,
    fecha: fechaMayuscula(),
    tituloT1: "TRIM. 1",
    tituloT2: trimestre >= 2 ? "TRIM. 2" : "—",
    tituloNecesaria: restantes === 2
      ? "NOTA NECESARIA EN CADA UNO DE LOS TRIM. 2 Y 3\npara aprobar la materia (mín. 51 de promedio anual)"
      : "NOTA NECESARIA EN TRIM. 3\npara aprobar la materia (mín. 51 de promedio anual)",
    filas,
    faltaT1,
    // "totalFilas" son pares estudiante+área en riesgo, no materias distintas
    // (una materia como CYL puede aparecer en decenas de filas, una por cada
    // estudiante que la tenga en riesgo). Se guardan los dos números por
    // separado para no llamar "materias" a lo que en realidad son alertas.
    totalFilas: filas.length,
    totalEstudiantesEnRiesgo: estudiantesEnRiesgo.size,
    irrecuperables,
  };
}

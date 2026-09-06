import { areasReprobadas, destacados } from "../dominio/reglas.js";
import { fechaMayuscula, nombreTrimestre } from "../salida/fecha.js";

const COLUMNAS_AREAS = 8; // las que tiene la tabla del Word oficial

/**
 * Arma el contexto del informe académico de tutoría.
 *
 * Calculado: destacados por promedio y estudiantes con dificultades, todos
 * nombrados uno por uno con sus áreas y notas — sin agrupar a nadie en un
 * resumen tipo "3 estudiantes en 2 áreas".
 * Manual: destacados por valores, dificultades del curso y estrategias.
 */
export function prepararTutoria(curso, trimestre, manual = {}) {
  const estudiantes = curso.estudiantes || [];

  const mejores = destacados(estudiantes, trimestre, 3).map(e => ({
    nombre: e.nombre,
    promedio: e.promedio.toFixed(3).replace(".", ","),
  }));

  const conDificultades = [];

  for (const est of estudiantes) {
    const reprobadas = areasReprobadas(est, trimestre);
    if (reprobadas.length === 0) continue;

    const fila = { nombre: est.nombre, cantidad: reprobadas.length };
    for (let i = 1; i <= COLUMNAS_AREAS; i++) {
      const r = reprobadas[i - 1];
      fila[`a${i}`] = r ? r.area : "";
      fila[`n${i}`] = r ? String(r.nota) : "";
    }
    conDificultades.push(fila);
  }

  conDificultades.sort((a, b) => b.cantidad - a.cantidad);

  const valores = (manual.valores || [])
    .filter(v => (v.nombre || "").trim())
    .map(v => ({ nombre: v.nombre.trim(), valor: (v.valor || "").trim() }));

  const estrategias = (manual.estrategias || [])
    .filter(e => (e.dificultad || "").trim() || (e.estrategia || "").trim())
    .map(e => ({ dificultad: (e.dificultad || "").trim(), estrategia: (e.estrategia || "").trim() }));

  return {
    tutor: manual.tutor || curso.profesor || "",
    curso: curso.curso || "",
    trimestre: nombreTrimestre(trimestre),
    fecha: fechaMayuscula(),
    gestion: curso.gestion,
    colegio: curso.colegio,
    destacados: mejores,
    valores,
    dificultades: conDificultades,
    estrategias,
  };
}

import { Curso } from "./esquema.js";
import { areasReprobadas, notaDe, NOTA_MINIMA } from "./reglas.js";

/**
 * Valida el curso antes de dejar generar informes.
 *
 * Los errores bloquean; las advertencias sólo avisan. La diferencia importa:
 * un informe con un número mal leído es peor que no tener informe, pero un
 * curso con muchos aplazados puede ser simplemente un curso con muchos
 * aplazados.
 */
export function validar(curso, trimestre) {
  const errores = [];
  const advertencias = [];

  if (!curso) {
    return { valido: false, errores: ["No hay datos cargados."], advertencias };
  }

  const resultado = Curso.safeParse({ ...curso, trimestre });
  if (!resultado.success) {
    for (const problema of resultado.error.issues) {
      errores.push(`Campo [${problema.path.join(".") || "raíz"}]: ${problema.message}`);
    }
  }

  const estudiantes = curso.estudiantes || [];
  if (!estudiantes.length) errores.push("No hay estudiantes en el curso.");

  const porNro = new Map();
  const porNombre = new Map();
  for (const est of estudiantes) {
    if (porNro.has(est.nro)) errores.push(`Nº ${est.nro} repetido.`);
    porNro.set(est.nro, est);
    const n = est.nombre.trim().toUpperCase();
    if (porNombre.has(n)) advertencias.push(`"${est.nombre}" aparece dos veces.`);
    porNombre.set(n, est);
  }

  const areas = curso.areas || [];
  const conNotaDelTrimestre = estudiantes.filter(e =>
    Object.values(e.notas).some(n => notaDe(n, trimestre) !== null));

  if (!conNotaDelTrimestre.length) {
    errores.push(
      `El archivo no trae notas del ${trimestre}º trimestre. ` +
      `Revisá el trimestre elegido o cargá el centralizador que corresponde.`
    );
  } else if (conNotaDelTrimestre.length < estudiantes.length) {
    advertencias.push(
      `${estudiantes.length - conNotaDelTrimestre.length} estudiante(s) no tienen ` +
      `ninguna nota en el ${trimestre}º trimestre (bajas o traslados). No entran en los porcentajes.`
    );
  }

  for (const est of estudiantes) {
    const reprobadas = areasReprobadas(est, trimestre);
    if (areas.length >= 6 && reprobadas.length > areas.length / 2) {
      advertencias.push(
        `${est.nombre}: ${reprobadas.length} de ${areas.length} áreas por debajo de ${NOTA_MINIMA}. Verificá la fila.`
      );
    }
    const notas = Object.values(est.notas).map(n => notaDe(n, trimestre)).filter(n => n !== null);
    if (notas.length >= 6 && new Set(notas).size === 1) {
      advertencias.push(`${est.nombre}: todas las notas del trimestre son iguales (${notas[0]}). Verificá la fila.`);
    }
    if (est.nombre.includes("¿")) {
      advertencias.push(`${est.nombre}: hay caracteres sin decodificar. Corregí el nombre antes de generar.`);
    }
  }

  for (const area of areas) {
    const conNota = estudiantes
      .map(e => notaDe(e.notas[area], trimestre))
      .filter(n => n !== null);
    if (conNota.length < 5) continue;
    const bajos = conNota.filter(n => n < NOTA_MINIMA).length;
    if (bajos / conNota.length > 0.4) {
      advertencias.push(
        `${area}: ${bajos} de ${conNota.length} por debajo de ${NOTA_MINIMA} (${Math.round(bajos / conNota.length * 100)}%).`
      );
    }
  }

  return { valido: errores.length === 0, errores, advertencias };
}

// Nombre anterior, mantenido para no romper importaciones existentes.
export const validarCruzada = validar;

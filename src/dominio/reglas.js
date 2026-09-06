/**
 * Reglas de calificación del colegio. Funciones puras: reciben datos y
 * devuelven datos. Nada de React ni de pdf.js acá.
 */
export const NOTA_MINIMA = 51;
export const TRIMESTRES = 3;
const META = NOTA_MINIMA * TRIMESTRES; // 153 puntos en el año

export const clave = t => `t${t}`;

/** La nota de un área en un trimestre, o null si el centralizador no la trae. */
export function notaDe(notas, trimestre) {
  return notas ? (notas[clave(trimestre)] ?? null) : null;
}

/** Promedio anual del área. Un trimestre que falta cuenta como 0. */
export function promedioAnual({ t1, t2, t3 }) {
  return ((t1 ?? 0) + (t2 ?? 0) + (t3 ?? 0)) / TRIMESTRES;
}

export function apruebaArea(notas) {
  return promedioAnual(notas) >= NOTA_MINIMA;
}

/**
 * Cuánto necesita en cada trimestre que le queda para llegar a 51 de promedio
 * anual. Devuelve `{ necesaria, alcanzable, restantes }`; si el resultado pasa
 * de 100, `alcanzable` es false y el informe tiene que decir "no alcanza".
 */
export function notaNecesaria(notas, trimestreActual) {
  const acumulado = (notas.t1 ?? 0) + (trimestreActual >= 2 ? (notas.t2 ?? 0) : 0);
  const restantes = TRIMESTRES - trimestreActual;
  if (restantes <= 0) return { necesaria: null, alcanzable: null, restantes: 0 };
  const necesaria = Math.ceil((META - acumulado) / restantes);
  return { necesaria: Math.max(necesaria, 0), alcanzable: necesaria <= 100, restantes };
}

/**
 * Áreas reprobadas EN EL TRIMESTRE: nota del trimestre menor a 51.
 *
 * Un área sin nota en ese trimestre no cuenta como reprobada. Mezclar esto con
 * el promedio anual es lo que hacía que un estudiante con notas normales
 * apareciera con diez áreas reprobadas: al no tener todavía el tercer
 * trimestre, el promedio anual de todas sus áreas daba por debajo de 51.
 */
export function areasReprobadas(estudiante, trimestre) {
  return Object.entries(estudiante.notas)
    .map(([area, notas]) => ({ area, nota: notaDe(notas, trimestre) }))
    .filter(a => a.nota !== null && a.nota < NOTA_MINIMA);
}

export function areasAprobadas(estudiante, trimestre) {
  return Object.entries(estudiante.notas)
    .map(([area, notas]) => ({ area, nota: notaDe(notas, trimestre) }))
    .filter(a => a.nota !== null && a.nota >= NOTA_MINIMA);
}

/** Promedio del trimestre: media de las áreas que tienen nota. */
export function promedioDelTrimestre(estudiante, trimestre) {
  const notas = Object.values(estudiante.notas)
    .map(n => notaDe(n, trimestre))
    .filter(n => n !== null);
  if (!notas.length) return null;
  return notas.reduce((s, n) => s + n, 0) / notas.length;
}

/**
 * Los mejores promedios del trimestre.
 * Ante un empate en el último puesto se devuelven todos los empatados, para que
 * la decisión la tome la tutora y no el redondeo.
 */
export function destacados(estudiantes, trimestre, cantidad = 3) {
  const conPromedio = estudiantes
    .map(e => ({ ...e, promedio: promedioDelTrimestre(e, trimestre) }))
    .filter(e => e.promedio !== null)
    .sort((a, b) => b.promedio - a.promedio);
  if (conPromedio.length <= cantidad) return conPromedio;
  const corte = conPromedio[cantidad - 1].promedio;
  return conPromedio.filter((e, i) => i < cantidad || e.promedio === corte);
}

/** Aprobados y reprobados del curso en un trimestre. */
export function resumenDelCurso(estudiantes, trimestre) {
  let aprobados = 0, reprobados = 0, sinDatos = 0;
  for (const est of estudiantes) {
    const conNota = Object.values(est.notas).some(n => notaDe(n, trimestre) !== null);
    if (!conNota) { sinDatos++; continue; }
    if (areasReprobadas(est, trimestre).length === 0) aprobados++;
    else reprobados++;
  }
  const total = aprobados + reprobados;
  return {
    total,
    sinDatos,
    aprobados,
    reprobados,
    porcentajeAprobados: total ? Math.round((aprobados / total) * 100) : 0,
    porcentajeReprobados: total ? Math.round((reprobados / total) * 100) : 0,
  };
}

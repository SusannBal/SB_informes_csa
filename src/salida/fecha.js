const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

/** La fecha del día en que se genera el informe. Nunca una fecha fija. */
export function fechaMayuscula(d = new Date()) {
  return `${d.getDate()} DE ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function fechaLarga(d = new Date()) {
  const mes = MESES[d.getMonth()];
  return `${d.getDate()} de ${mes[0]}${mes.slice(1).toLowerCase()} de ${d.getFullYear()}`;
}

export function nombreTrimestre(numero) {
  return { 1: "PRIMERO", 2: "SEGUNDO", 3: "TERCERO" }[numero] || "";
}

export function ordinalTrimestre(numero) {
  return { 1: "1er", 2: "2do", 3: "3er" }[numero] || `${numero}º`;
}

export function nombreOrdinalTrimestre(numero) {
  return { 1: "PRIMER TRIMESTRE", 2: "SEGUNDO TRIMESTRE", 3: "TERCER TRIMESTRE" }[numero] || "";
}

/** Para nombrar los archivos: 2026-09-05 */
export function fechaCorta(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

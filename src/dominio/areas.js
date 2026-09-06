/**
 * Catálogo de áreas del currículo de secundaria y utilidades para reconocer
 * el área de un centralizador por área (los PDF traen el nombre completo,
 * no el código de tres letras).
 */
export const AREAS_ESTANDAR = [
  { codigo: "CYL", nombre: "COMUNICACION Y LENGUAJES", alias: ["LENGUA CASTELLANA Y ORIGINARIA", "COMUNICACION Y LENGUAJE", "LENGUAJE"] },
  { codigo: "LEX", nombre: "LENGUA EXTRANJERA", alias: ["IDIOMA EXTRANJERO", "INGLES"] },
  { codigo: "CSO", nombre: "CIENCIAS SOCIALES", alias: ["SOCIALES"] },
  { codigo: "EFD", nombre: "EDUCACION FISICA Y DEPORTES", alias: ["EDUCACION FISICA DEPORTES Y RECREACION", "EDUCACION FISICA"] },
  { codigo: "EMU", nombre: "EDUCACION MUSICAL", alias: ["MUSICA"] },
  { codigo: "APV", nombre: "ARTES PLASTICAS Y VISUALES", alias: ["ARTES PLASTICAS"] },
  { codigo: "MAT", nombre: "MATEMATICA", alias: ["MATEMATICAS"] },
  { codigo: "CNA", nombre: "CIENCIAS NATURALES", alias: ["BIOLOGIA GEOGRAFIA", "CIENCIAS NATURALES BIOLOGIA GEOGRAFIA"] },
  { codigo: "FIS", nombre: "FISICA", alias: [] },
  { codigo: "QMC", nombre: "QUIMICA", alias: [] },
  { codigo: "CFP", nombre: "COSMOVISIONES FILOSOFIA Y PSICOLOGIA", alias: ["FILOSOFIA Y PSICOLOGIA", "COSMOVISIONES"] },
  { codigo: "VER", nombre: "VALORES ESPIRITUALIDAD Y RELIGIONES", alias: ["VALORES", "RELIGION"] },
  { codigo: "TEC", nombre: "TECNICA TECNOLOGICA GENERAL", alias: ["TECNICA TECNOLOGICA"] },
];

export const CODIGOS_AREA = AREAS_ESTANDAR.map(a => a.codigo);

export function nombreDeArea(codigo) {
  return AREAS_ESTANDAR.find(a => a.codigo === codigo)?.nombre ?? codigo;
}

function normalizar(s) {
  return (s || "")
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z]/g, "");
}

/**
 * Compara dos cadenas tolerando caracteres perdidos: el decodificador de PDF
 * pierde algunos glifos del encabezado (pdf.js descarta los códigos 9 a 13),
 * así que "LENGUA EXTRANJERA" puede llegar como "LENG A EXTRANJERA".
 * Devuelve la fracción de la cadena candidata que aparece, en orden, en el texto.
 */
function cobertura(texto, candidata) {
  let i = 0, aciertos = 0;
  for (const ch of candidata) {
    const j = texto.indexOf(ch, i);
    if (j >= 0) { aciertos++; i = j + 1; }
  }
  return aciertos / candidata.length;
}

/**
 * Reconoce el área a partir del texto del encabezado del PDF.
 *
 * Recibe el encabezado COMPLETO (varias líneas), no una sola línea puntual.
 * Antes se exigía que la fila "AREA" apareciera sola en su propia línea del
 * PDF, y cuando el espaciado de un archivo distinto hacía que esa línea se
 * mezclara con la de al lado, la detección fallaba entera aunque el nombre del
 * área estuviera ahí nomás. Buscando en todo el bloque no importa con qué se
 * haya mezclado la etiqueta.
 *
 * Devuelve `{ codigo, nombre, confianza }` o null si nada llega al umbral.
 */
export function detectarArea(texto) {
  // "AREA" y "MATERIA" son la misma etiqueta en distintas versiones del
  // formato del colegio. Si ninguna aparece, se busca en el texto tal cual.
  const desdeEtiqueta = /(?:AREA|MATERIA)\b\s*[:-]?\s*([\s\S]*)/i.exec(texto || "");
  const t = normalizar(desdeEtiqueta ? desdeEtiqueta[1] : texto);
  if (!t) return null;
  let mejor = null;
  for (const area of AREAS_ESTANDAR) {
    for (const candidata of [area.nombre, ...area.alias]) {
      const n = normalizar(candidata);
      // Comparamos contra un tramo del largo de la candidata (más un margen):
      // así "FISICA" no le gana a "EDUCACION FISICA Y DEPORTES" por ser corta.
      const tramo = t.slice(0, Math.ceil(n.length * 1.25));
      const puntaje = cobertura(tramo, n) * Math.min(1, tramo.length / n.length);
      if (!mejor || puntaje > mejor.confianza) {
        mejor = { codigo: area.codigo, nombre: area.nombre, confianza: puntaje };
      }
    }
  }
  return mejor && mejor.confianza >= 0.75 ? mejor : null;
}

/**
 * Deduce el curso del nombre del archivo: "2A.pdf" → "2A", "5to B.pdf" → "5B".
 * Devuelve "" si el nombre no parece un curso, para que mande lo que diga el PDF.
 */
export function cursoDesdeNombreArchivo(nombreArchivo) {
  const base = (nombreArchivo || "").replace(/\.[^.]+$/, "").toUpperCase().trim();
  const m = /(?:^|[^A-Z0-9])(S?)([1-6])\s*(?:TO|DO|RO|ER|MO|VO)?\s*[-_ ]*([A-D])(?![A-Z0-9])/.exec(base);
  return m ? `${m[1]}${m[2]}${m[3]}` : "";
}

/**
 * Compara dos cursos en el orden natural del colegio: 1A, 1B, 2A, 2B... antes
 * que un orden alfabético puro, que pondría "10A" antes que "2A". El "S" que
 * antepone remdiz ("S4A") no afecta el orden.
 * Los que no se parecen a un curso ("", nombres de archivo raros) van al final.
 */
export function compararCursos(a, b) {
  const m = c => /^S?(\d+)\s*([A-Z]?)$/.exec((c || "").toUpperCase().trim());
  const pa = m(a), pb = m(b);
  if (pa && pb) {
    const porGrado = Number(pa[1]) - Number(pb[1]);
    return porGrado !== 0 ? porGrado : pa[2].localeCompare(pb[2]);
  }
  if (pa) return -1;
  if (pb) return 1;
  return (a || "").localeCompare(b || "");
}

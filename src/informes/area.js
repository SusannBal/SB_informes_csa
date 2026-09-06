import { notaDe, NOTA_MINIMA } from "../dominio/reglas.js";
import { nombreDeArea, compararCursos } from "../dominio/areas.js";
import { fechaMayuscula, nombreTrimestre } from "../salida/fecha.js";

/**
 * Arma el contexto del informe académico de área, consolidando varios cursos.
 *
 * El área sale de los PDF (los centralizadores por área traen el nombre en el
 * encabezado); si los archivos cargados no coinciden entre sí, se avisa.
 * La nómina de estudiantes con dificultades es calculada; el detalle de cada
 * dificultad y las estrategias son manuales.
 */
export function prepararArea(cursos, trimestre, manual = {}) {
  const lista = cursos || [];
  const codigosArea = [...new Set(lista.map(c => c.areas?.[0]).filter(Boolean))];
  const codigo = manual.area || codigosArea[0] || "";

  // Los cursos van en orden natural (1A, 1B, 2A...), no en el orden en que se
  // cargaron los PDF: así el informe consolidado se lee de menor a mayor.
  const cursosOrdenados = [...lista].sort((a, b) => compararCursos(a.curso, b.curso));

  const sinNumerar = [];
  for (const curso of cursosOrdenados) {
    for (const est of curso.estudiantes || []) {
      const nota = notaDe(est.notas[codigo] ?? Object.values(est.notas)[0], trimestre);
      if (nota === null || nota >= NOTA_MINIMA) continue;
      const detalle = manual.detalles?.[`${curso.curso}|${est.nombre}`] || "";
      sinNumerar.push({ nombre: est.nombre, curso: curso.curso, nota, dificultad: detalle });
    }
  }
  const estudiantes = sinNumerar.map((e, i) => ({ nro: i + 1, ...e }));

  const estrategias = (manual.estrategias || [])
    .filter(e => (e.dificultad || "").trim() || (e.estrategia || "").trim())
    .map(e => ({ dificultad: (e.dificultad || "").trim(), estrategia: (e.estrategia || "").trim() }));

  return {
    profesor: manual.profesor || lista[0]?.profesor || "",
    area: nombreDeArea(codigo),
    areaCodigo: codigo,
    trimestre: nombreTrimestre(trimestre),
    fecha: fechaMayuscula(),
    gestion: lista[0]?.gestion,
    colegio: lista[0]?.colegio,
    cursos: lista.map(c => c.curso).join(", "),
    estudiantes,
    estrategias,
    areasEnConflicto: codigosArea.length > 1 ? codigosArea : null,
  };
}

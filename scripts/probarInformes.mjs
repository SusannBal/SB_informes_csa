/**
 * Genera los cuatro informes desde los PDF de muestra, sin navegador, y los
 * deja en scripts/salida/ para poder abrirlos en Word.
 *
 *   node scripts/probarInformes.mjs <carpeta con los PDF>
 */
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { fuentesType3 } from "../src/entrada/type3.js";
import { leerObjetos, codigosPorPagina } from "../src/entrada/pdfCrudo.js";
import { filasDeDocumento } from "../src/entrada/filas.js";
import { analizarCentralizador } from "../src/entrada/parser.js";
import { cursoDesdeNombreArchivo } from "../src/dominio/areas.js";
import { validar } from "../src/dominio/validar.js";
import { prepararTutoria } from "../src/informes/tutoria.js";
import { prepararArea } from "../src/informes/area.js";
import { prepararTemas } from "../src/informes/temas.js";
import { prepararNotaNecesaria } from "../src/informes/notaNecesaria.js";

const ORIGEN = process.argv[2] || "..";
const SALIDA = path.join("scripts", "salida");

async function leer(archivo) {
  const datos = new Uint8Array(fs.readFileSync(path.join(ORIGEN, archivo)));
  const fuentes = await fuentesType3(datos);
  const crudos = await codigosPorPagina(datos, leerObjetos(datos));
  const pdf = await pdfjsLib.getDocument({ data: datos.slice() }).promise;
  const filas = await filasDeDocumento(pdf, fuentes, crudos);
  return analizarCentralizador(filas, { cursoPorDefecto: cursoDesdeNombreArchivo(archivo) });
}

function generar(plantilla, datos, salida) {
  const zip = new PizZip(fs.readFileSync(path.join("public", "plantillas", plantilla)));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });
  doc.render(datos);
  fs.mkdirSync(SALIDA, { recursive: true });
  const ruta = path.join(SALIDA, salida);
  fs.writeFileSync(ruta, doc.getZip().generate({ type: "nodebuffer" }));
  return ruta;
}

/** Texto plano del .docx generado, para comprobar que salió lo que tenía que salir. */
function textoDe(ruta) {
  const xml = new PizZip(fs.readFileSync(ruta)).file("word/document.xml").asText();
  return xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
}

function comprobar(etiqueta, ruta, esperados) {
  const texto = textoDe(ruta);
  const faltan = esperados.filter(e => !texto.includes(e));
  const sobran = /\{[#/]?[a-zA-Z]/.test(texto) ? ["quedaron etiquetas sin reemplazar"] : [];
  const problemas = [...faltan.map(f => `falta "${f}"`), ...sobran];
  console.log(problemas.length ? `  ✗ ${etiqueta}: ${problemas.join(", ")}` : `  ✓ ${etiqueta}`);
  return problemas.length === 0;
}

// ---------------------------------------------------------------------------

const anual = await leer("centralizador_anual_detallado.pdf");
const trimestral = await leer("centralizador_segundo_trimestrre.pdf");
const porArea = await leer("2A.pdf");

anual.curso = anual.curso || "S4A";
trimestral.curso = trimestral.curso || "S4A";

console.log("Lectura:");
for (const [nombre, d] of [["anual", anual], ["trimestral", trimestral], ["2A", porArea]]) {
  const v = validar(d, 2);
  console.log(`  ${nombre}: ${d.estudiantes.length} estudiantes, tipo ${d.tipo}, ` +
    `curso ${d.curso}, ${d.filasConError} filas sin cuadrar, ` +
    `${v.errores.length} errores, ${v.advertencias.length} advertencias`);
  v.errores.forEach(e => console.log("     ERROR:", e));
}

let todoBien = true;
console.log("\nInformes:");

todoBien &= comprobar("tutoría", generar("tutoria.docx",
  prepararTutoria(anual, 2, {
    tutor: "CASTELLANOS ORELLANO SUSANA LUISA",
    valores: [{ nombre: "ARROYO ALDANA SOFIA ABIGAIL", valor: "RESPONSABILIDAD" }],
    estrategias: [{ dificultad: "Poca lectura", estrategia: "Plan lector semanal" }],
  }), "tutoria.docx"),
  // Antes se agrupaban en "N estudiantes en 2/3 áreas"; ahora cada uno va con
  // su propia fila de áreas y notas, sin excepción — de ahí estos dos nombres,
  // que antes hubieran caído en una fila de resumen.
  ["CASTELLANOS ORELLANO", "S4A", "SEGUNDO", "ARROYO ALDANA SOFIA ABIGAIL", "Plan lector semanal",
   "ALARCON MENDOZA DAYRA ANTONE", "CARTAGENA MALDONADO MATEO JOSUE"]);

// En 2A nadie baja de 51 en el trimestre, así que la nómina queda vacía: es la
// respuesta correcta, no una falla. Para comprobar que la nómina se llena,
// consolidamos también el curso del centralizador trimestral.
todoBien &= comprobar("área (sin aplazados)", generar("area.docx",
  prepararArea([porArea], 2, {
    profesor: "CASTELLANOS ORELLANO SUSANA LUISA",
    detalles: {},
    estrategias: [{ dificultad: "Vocabulario escaso", estrategia: "Fichas de vocabulario" }],
  }), "area.docx"),
  ["LENGUA EXTRANJERA", "CASTELLANOS ORELLANO", "Fichas de vocabulario"]);

todoBien &= comprobar("área (consolidada)", generar("area.docx",
  prepararArea([porArea, trimestral], 2, {
    area: "LEX",
    profesor: "CASTELLANOS ORELLANO SUSANA LUISA",
    detalles: { "S4A|ANGULO FERNANDEZ MATEO": "No entrega tareas" },
    estrategias: [{ dificultad: "Vocabulario escaso", estrategia: "Fichas de vocabulario" }],
  }), "area-consolidada.docx"),
  ["LENGUA EXTRANJERA", "S4A", "ANGULO FERNANDEZ MATEO", "No entrega tareas"]);

todoBien &= comprobar("temas", generar("temas.docx",
  prepararTemas([porArea], 2, {
    profesor: "CASTELLANOS ORELLANO SUSANA LUISA",
    grados: [
      { grado: "2 A", programados: 3, avanzados: 3 },
      { grado: "6 A - B", programados: 2, avanzados: 1 },
    ],
  }), "temas.docx"),
  ["LENGUA EXTRANJERA", "2 A", "6 A - B", "100", "50", "2do TRIM"]);

todoBien &= comprobar("nota necesaria", generar("nota-necesaria.docx",
  prepararNotaNecesaria(anual, 2), "nota-necesaria.docx"),
  ["ANGULO FERNANDEZ MATEO", "BALANZA RUIZ PEDRO SANTIAGO", "CYL", "TRIM. 2"]);

console.log(`\nSalida en ${SALIDA}/`);
process.exit(todoBien ? 0 : 1);

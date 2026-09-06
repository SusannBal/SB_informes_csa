/** Prueba el lector de PDF fuera del navegador. Uso: node scripts/probarPdf.mjs <pdf...> */
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { fuentesType3 } from "../src/entrada/type3.js";
import { leerObjetos, codigosPorPagina } from "../src/entrada/pdfCrudo.js";
import { filasDeDocumento } from "../src/entrada/filas.js";
import { analizarCentralizador } from "../src/entrada/parser.js";
import { cursoDesdeNombreArchivo } from "../src/dominio/areas.js";

for (const archivo of process.argv.slice(2)) {
  const datos = new Uint8Array(fs.readFileSync(archivo));
  const fuentes = await fuentesType3(datos);
  const crudos = await codigosPorPagina(datos, leerObjetos(datos));
  const pdf = await pdfjsLib.getDocument({ data: datos.slice() }).promise;
  const filas = await filasDeDocumento(pdf, fuentes, crudos);
  const d = analizarCentralizador(filas, {
    cursoPorDefecto: cursoDesdeNombreArchivo(path.basename(archivo)),
  });
  console.log("=========", archivo);
  console.log({
    tipo: d.tipo, curso: d.curso, cursoDelPdf: d.cursoDelPdf, gestion: d.gestion,
    colegio: d.colegio, area: d.areaDetectada, areas: d.areas.join(","),
    trimestreDeclarado: d.trimestreDeclarado, trimestresConDatos: d.trimestresConDatos,
    estudiantes: d.estudiantes.length, filasConError: d.filasConError,
  });
  d.avisos.forEach(a => console.log("  AVISO:", a));
  for (const e of d.estudiantes) {
    console.log(" ", String(e.nro).padStart(2), e.nombre.padEnd(40), JSON.stringify(e.notas).slice(0, 110));
  }
}

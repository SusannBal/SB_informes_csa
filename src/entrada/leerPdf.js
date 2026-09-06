import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { fuentesType3 } from "./type3.js";
import { leerObjetos, codigosPorPagina } from "./pdfCrudo.js";
import { filasDeDocumento } from "./filas.js";
import { analizarCentralizador } from "./parser.js";
import { cursoDesdeNombreArchivo } from "../dominio/areas.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Lee un centralizador de remdiz y devuelve los datos tal como están en el PDF.
 *
 * No inventa nada: ni nombres, ni notas, ni cantidad de estudiantes, ni el
 * área. Lo que el archivo no dice, no aparece.
 *
 * @param {File} archivo
 * @param {Object} opciones { curso, trimestre }
 */
export async function leerCentralizador(archivo, opciones = {}) {
  const bytes = new Uint8Array(await archivo.arrayBuffer());

  const objetos = leerObjetos(bytes);
  const fuentes = await fuentesType3(bytes);
  const crudos = await codigosPorPagina(bytes, objetos);

  // pdf.js se queda con el buffer que le pasamos, así que va una copia.
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  const filas = await filasDeDocumento(pdf, fuentes, crudos);

  const cursoPorDefecto = opciones.curso || cursoDesdeNombreArchivo(archivo.name);
  const datos = analizarCentralizador(filas, { ...opciones, cursoPorDefecto });

  return { ...datos, nombreArchivo: archivo.name };
}

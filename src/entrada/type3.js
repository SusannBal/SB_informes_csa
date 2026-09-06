import { huellaBytes } from "./hash.js";
import { leerObjetos, bytesDelStream, inflar } from "./pdfCrudo.js";

/**
 * Lee las fuentes Type 3 de un PDF directamente de los bytes del archivo.
 *
 * Devuelve, por fuente, un Map código → huella del dibujo del glifo. Las
 * fuentes salen en el orden en que aparecen en el archivo, que en los
 * centralizadores de remdiz coincide con el orden de las páginas.
 */
export async function fuentesType3(buffer) {
  const bytes = new Uint8Array(buffer);
  const objetos = leerObjetos(bytes);
  const fuentes = [];

  for (const [numero, obj] of objetos) {
    if (!/\/Subtype\s*\/Type3/.test(obj.txt)) continue;
    const charProcs = /\/CharProcs\s*<<([\s\S]*?)>>/.exec(obj.txt);
    const refEnc = /\/Encoding\s+(\d+)\s+0\s+R/.exec(obj.txt);
    if (!charProcs || !refEnc) continue;

    const glifos = new Map();
    for (const g of charProcs[1].matchAll(/\/([^\s/[\]<>]+)\s+(\d+)\s+0\s+R/g)) {
      glifos.set(g[1], parseInt(g[2], 10));
    }

    const enc = objetos.get(parseInt(refEnc[1], 10));
    const dif = enc && /\/Differences\s*\[([\s\S]*?)\]/.exec(enc.txt);
    if (!dif) continue;

    const codigoAGlifo = new Map();
    let codigo = 0;
    for (const t of dif[1].trim().split(/\s+/)) {
      if (/^\d+$/.test(t)) codigo = parseInt(t, 10);
      else { codigoAGlifo.set(codigo, t.replace(/^\//, "")); codigo++; }
    }

    const codigoAHuella = new Map();
    for (const [c, nombre] of codigoAGlifo) {
      const ref = glifos.get(nombre);
      if (ref === undefined) continue;
      const s = bytesDelStream(bytes, objetos.get(ref));
      if (!s) continue;
      let datos = s.bytes;
      if (s.comprimido) {
        try { datos = await inflar(datos); } catch { continue; }
      }
      codigoAHuella.set(c, huellaBytes(datos));
    }
    fuentes.push({ objeto: numero, codigoAHuella });
  }
  return fuentes;
}

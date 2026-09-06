/**
 * Genera src/entrada/glifos.json: huella del glifo → carácter real.
 *
 * Punto de partida: el mapa del centralizador trimestral, verificado a mano
 * contra la fila conocida de ALARCON MENDOZA (sección 5 de la especificación).
 * A partir de ahí se agregan los estilos de encabezado, deducidos de textos
 * ancla ("CENTRALIZADOR", "ESTUDIANTE", los códigos de área, "TRIMESTRE"...).
 *
 * Uso:  node scripts/generarGlifos.mjs <carpeta con los PDF de muestra>
 */
import fs from "fs";
import path from "path";
import { fuentesType3 } from "../src/entrada/type3.js";
import { EXTRA, BASE_TRIMESTRAL } from "./glifosConocidos.mjs";

const dir = process.argv[2] || "..";
const tabla = new Map();
const choques = [];

async function fuentesDe(archivo) {
  return fuentesType3(fs.readFileSync(path.join(dir, archivo)).buffer);
}

function asignar(fuente, mapa, etiqueta) {
  for (const [codigo, ch] of Object.entries(mapa)) {
    const h = fuente.codigoAHuella.get(Number(codigo));
    if (!h) { choques.push(`${etiqueta} código ${codigo}: sin glifo`); continue; }
    if (tabla.has(h) && tabla.get(h) !== ch) {
      choques.push(`${etiqueta} código ${codigo}: '${ch}' choca con '${tabla.get(h)}'`);
    } else tabla.set(h, ch);
  }
}

const base = await fuentesDe("centralizador_segundo_trimestrre.pdf");
asignar(base[0], BASE_TRIMESTRAL, "base");

for (const [archivo, porFuente] of Object.entries(EXTRA)) {
  const fuentes = await fuentesDe(archivo);
  for (const [i, mapa] of Object.entries(porFuente)) {
    asignar(fuentes[Number(i)], mapa, `${archivo}[${i}]`);
  }
}

if (choques.length) { console.error("CHOQUES:", choques); process.exit(1); }
const salida = Object.fromEntries([...tabla].sort());
fs.writeFileSync(
  "src/entrada/glifos.js",
  "// Generado por scripts/generarGlifos.mjs. No editar a mano.\n" +
  "// Huella del dibujo de cada glifo Type 3 -> carácter real.\n" +
  "export default " + JSON.stringify(salida, null, 0) + ";\n"
);
console.log(`glifos.js: ${tabla.size} glifos`);

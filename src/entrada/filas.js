import glifos from "./glifos.js";

/** Códigos que pdf.js descarta por considerarlos espacios en blanco. */
const DESCARTADOS = new Set([9, 10, 11, 12, 13, 32]);

/**
 * Agrupa el texto de un PDF en filas y lo decodifica.
 *
 * Los centralizadores de remdiz salen de Nitro con fuentes Type 3 sin mapa
 * Unicode y con la página rotada 90°, así que hay tres cosas que hacer antes de
 * poder leer nada:
 *
 *   1. recuperar los caracteres que pdf.js tira (códigos 9 a 13), cruzando su
 *      salida con la secuencia cruda del flujo de contenido;
 *   2. agrupar por la coordenada correcta — con la página rotada, la "línea" es
 *      el eje X y el avance del texto, el eje Y;
 *   3. cambiar cada carácter por el que realmente dibuja, buscando la huella
 *      del glifo en `glifos.js`.
 *
 * Devuelve `[{ pagina, y, chars: [{ c, x }] }]` ordenado como se lee.
 *
 * @param {Object} pdf       documento de pdf.js
 * @param {Array}  fuentes   fuentes Type 3 leídas de los bytes del archivo
 * @param {Array}  crudos    códigos dibujados por página (opcional)
 */
export async function filasDeDocumento(pdf, fuentes, crudos = null) {
  const filas = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const contenido = await pagina.getTextContent();
    const rotada = pagina.rotate === 90 || pagina.rotate === 270;
    const fuente = fuentes[p - 1] || fuentes[0];

    const planos = aplanar(contenido.items, rotada);
    const recuperados = crudos && crudos[p - 1]
      ? reponerDescartados(planos, crudos[p - 1])
      : planos;

    const lineas = new Map();
    for (const ch of recuperados) {
      let clave = null;
      for (const k of lineas.keys()) {
        if (Math.abs(k - ch.linea) < 2.5) { clave = k; break; }
      }
      if (clave === null) { clave = ch.linea; lineas.set(clave, []); }
      lineas.get(clave).push(ch);
    }

    const claves = [...lineas.keys()].sort((a, b) => (rotada ? a - b : b - a));
    for (const k of claves) {
      // Ordenamos por el orden de dibujo, no por la posición: los caracteres
      // que repusimos sólo tienen una posición estimada, pero su lugar en la
      // secuencia es exacto. Dentro de una línea, remdiz dibuja de izquierda a
      // derecha, así que las dos cosas coinciden.
      const chars = lineas.get(k)
        .map((ch, orden) => ({ ...ch, orden }))
        .sort((a, b) => a.orden - b.orden)
        // El código 32 en la salida de pdf.js es un hueco inventado, no un
        // glifo; en cambio, si lo repusimos nosotros sí es un glifo real.
        .map(ch => ({
          c: !ch.repuesto && ch.codigo === 32 ? " " : decodificar(ch.codigo, fuente),
          x: ch.x,
          codigo: ch.codigo,
        }));
      if (chars.some(c => c.c !== " ")) filas.push({ pagina: p, y: k, chars });
    }
  }
  return filas;
}

/** Los caracteres de pdf.js, en orden de dibujo, con su posición. */
function aplanar(items, rotada) {
  const out = [];
  for (const it of items) {
    if (!it.str) continue;
    const linea = rotada ? it.transform[4] : it.transform[5];
    const inicio = rotada ? it.transform[5] : it.transform[4];
    const paso = it.width / Math.max(it.str.length, 1);
    [...it.str].forEach((ch, i) => {
      out.push({ c: ch, codigo: ch.charCodeAt(0), linea, x: inicio + i * paso, paso });
    });
  }
  return out;
}

/**
 * Reinserta los caracteres que pdf.js descartó.
 *
 * Recorre en paralelo la salida de pdf.js y la secuencia cruda del flujo de
 * contenido. Cada carácter crudo sabe de qué operador de texto salió (su
 * "trozo"), y pdf.js emite un item por operador: con eso, un carácter repuesto
 * en el límite entre dos líneas se sabe a cuál de las dos pertenece.
 *
 * Si las dos secuencias no llegan a encajar se devuelve la de pdf.js tal cual:
 * es preferible un nombre incompleto a uno inventado.
 */
function reponerDescartados(planos, crudos) {
  const salida = [];
  let pendientes = [];
  let trozoAnterior = null;
  let i = 0, j = 0;

  const volcar = (siguiente) => {
    if (!pendientes.length) return;
    const anterior = salida[salida.length - 1];
    const paso = (anterior && anterior.paso) || (siguiente && siguiente.paso) || 5;
    const alFinal = pendientes.filter(p => anterior && p.trozo === trozoAnterior);
    const alPrincipio = pendientes.filter(p => !alFinal.includes(p));

    alFinal.forEach((p, k) => {
      salida.push({ codigo: p.codigo, repuesto: true, paso, linea: anterior.linea, x: anterior.x + paso * (k + 1) });
    });
    if (alPrincipio.length && siguiente) {
      const mismaLinea = anterior && anterior.linea === siguiente.linea;
      alPrincipio.forEach((p, k) => {
        salida.push({
          codigo: p.codigo, repuesto: true, paso, linea: siguiente.linea,
          x: mismaLinea
            ? anterior.x + paso * (alFinal.length + k + 1)
            : siguiente.x - paso * (alPrincipio.length - k),
        });
      });
    }
    pendientes = [];
  };

  while (i < crudos.length && j < planos.length) {
    const crudo = crudos[i];
    if (DESCARTADOS.has(crudo.codigo)) { pendientes.push(crudo); i++; continue; }

    const plano = planos[j];
    if (plano.codigo === crudo.codigo) {
      volcar(plano);
      salida.push(plano);
      trozoAnterior = crudo.trozo;
      i++; j++;
      continue;
    }
    if (plano.codigo === 32) {
      // hueco inventado por pdf.js: si ya repusimos lo que lo causaba, sobra
      if (pendientes.length) { j++; continue; }
      salida.push(plano); j++;
      continue;
    }
    return planos; // desincronizados
  }
  volcar(planos[j] || null);
  while (j < planos.length) salida.push(planos[j++]);
  return salida;
}

function decodificar(codigo, fuente) {
  if (!fuente) return String.fromCharCode(codigo);
  const huella = fuente.codigoAHuella.get(codigo);
  if (!huella) return "¿";
  const real = glifos[huella];
  return real === undefined ? "¿" : real;
}

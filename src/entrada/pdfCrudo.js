/**
 * Lectura directa de los bytes del PDF, sin pasar por pdf.js.
 *
 * Hace falta por dos motivos:
 *
 *  1. Las fuentes Type 3 de remdiz no traen mapa Unicode. El código de cada
 *     carácter cambia en cada archivo, pero el dibujo del glifo no; hay que
 *     leer los CharProcs para poder identificarlos (ver `type3.js`).
 *  2. pdf.js descarta los caracteres cuyo código cae entre 9 y 13, porque los
 *     considera espacios en blanco. En estos PDF esos códigos son letras, y sin
 *     ellas los nombres salen mutilados ("QUISBERT ARROYO" → "QUISBE"). Por eso
 *     también leemos la secuencia cruda de códigos del flujo de contenido, para
 *     devolver a su lugar lo que pdf.js dejó afuera.
 */

/** Convierte el buffer a una cadena latin1 (1 byte = 1 carácter) para poder usar regex. */
export function comoTexto(bytes) {
  let txt = "";
  const bloque = 0x8000;
  for (let i = 0; i < bytes.length; i += bloque) {
    txt += String.fromCharCode.apply(null, bytes.subarray(i, i + bloque));
  }
  return txt;
}

/** Índice de objetos del PDF: número → { txt, desde } (desde = offset del cuerpo). */
export function leerObjetos(bytes) {
  const txt = comoTexto(bytes);
  const objetos = new Map();
  const re = /(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g;
  let m;
  while ((m = re.exec(txt))) {
    objetos.set(parseInt(m[1], 10), { txt: m[2], desde: m.index + m[0].indexOf(m[2]) });
  }
  return objetos;
}

export function bytesDelStream(bytes, obj) {
  if (!obj) return null;
  const i = obj.txt.indexOf("stream");
  if (i < 0) return null;
  let j = i + "stream".length;
  if (obj.txt[j] === "\r") j++;
  if (obj.txt[j] === "\n") j++;
  let fin = obj.txt.lastIndexOf("endstream");
  if (fin < 0) return null;
  while (fin > j && (obj.txt[fin - 1] === "\n" || obj.txt[fin - 1] === "\r")) fin--;
  return {
    bytes: bytes.subarray(obj.desde + j, obj.desde + fin),
    comprimido: /\/FlateDecode/.test(obj.txt.slice(0, i)),
  };
}

export async function inflar(bytes) {
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function contenidoDeObjeto(bytes, objetos, numero) {
  const s = bytesDelStream(bytes, objetos.get(numero));
  if (!s) return null;
  if (!s.comprimido) return s.bytes;
  try { return await inflar(s.bytes); } catch { return null; }
}

/** Números de objeto de las páginas, en orden. */
export function paginasEnOrden(objetos) {
  let raiz = null;
  for (const [n, o] of objetos) {
    if (/\/Type\s*\/Pages\b/.test(o.txt) && /\/Kids/.test(o.txt) && !/\/Parent/.test(o.txt)) {
      raiz = n; break;
    }
  }
  const orden = [];
  const visitar = (n, profundidad) => {
    const o = objetos.get(n);
    if (!o || profundidad > 8) return;
    if (/\/Type\s*\/Page\b/.test(o.txt) && !/\/Type\s*\/Pages\b/.test(o.txt)) { orden.push(n); return; }
    const kids = /\/Kids\s*\[([\s\S]*?)\]/.exec(o.txt);
    if (!kids) return;
    for (const m of kids[1].matchAll(/(\d+)\s+0\s+R/g)) visitar(parseInt(m[1], 10), profundidad + 1);
  };
  if (raiz !== null) visitar(raiz, 0);
  if (orden.length) return orden;
  // sin árbol de páginas usable: las tomamos en el orden en que aparecen
  return [...objetos].filter(([, o]) => /\/Type\s*\/Page\b/.test(o.txt) && !/\/Type\s*\/Pages\b/.test(o.txt)).map(([n]) => n);
}

function buscar(datos, texto, desde) {
  const codigos = [...texto].map(c => c.charCodeAt(0));
  for (let i = desde; i <= datos.length - codigos.length; i++) {
    let ok = true;
    for (let k = 0; k < codigos.length; k++) if (datos[i + k] !== codigos[k]) { ok = false; break; }
    if (ok) return i;
  }
  return -1;
}

const ES_BLANCO = c => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
const ES_DELIM = c => "()<>[]{}/%".includes(String.fromCharCode(c));

/** Diccionario /XObject de un objeto con recursos: nombre → número de objeto. */
function xobjetosDe(objetos, txtConRecursos) {
  const mapa = new Map();
  let cuerpo = null;
  const ref = /\/XObject\s+(\d+)\s+0\s+R/.exec(txtConRecursos);
  if (ref) cuerpo = objetos.get(parseInt(ref[1], 10))?.txt;
  else {
    const inline = /\/XObject\s*<<([\s\S]*?)>>/.exec(txtConRecursos);
    if (inline) cuerpo = inline[1];
  }
  if (!cuerpo) return mapa;
  for (const m of cuerpo.matchAll(/\/([^\s/[\]<>]+)\s+(\d+)\s+0\s+R/g)) {
    mapa.set(m[1], parseInt(m[2], 10));
  }
  return mapa;
}

/**
 * Devuelve, en orden, los códigos de todos los caracteres que el flujo de
 * contenido dibuja (operadores Tj, TJ, ' y "), entrando en los XObject de
 * formulario que el flujo invoque con `Do`.
 */
export async function codigosDibujados(datos, contexto = null, inicioTrozo = 0) {
  const codigos = [];
  let trozo = inicioTrozo;
  let pendientes = [];
  let ultimoNombre = null;
  let i = 0;
  const n = datos.length;

  function leerLiteral() {
    const out = [];
    let nivel = 1;
    i++; // (
    while (i < n) {
      const c = datos[i];
      if (c === 0x5c) { // barra invertida
        i++;
        const e = datos[i];
        const simples = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 };
        if (e in simples) { out.push(simples[e]); i++; }
        else if (e >= 0x30 && e <= 0x37) {
          let v = 0, k = 0;
          while (k < 3 && datos[i] >= 0x30 && datos[i] <= 0x37) { v = v * 8 + (datos[i] - 0x30); i++; k++; }
          out.push(v & 0xff);
        } else if (e === 0x0a) { i++; }
        else if (e === 0x0d) { i++; if (datos[i] === 0x0a) i++; }
        else { out.push(e); i++; }
        continue;
      }
      if (c === 0x28) nivel++;
      if (c === 0x29) { nivel--; if (nivel === 0) { i++; break; } }
      out.push(c); i++;
    }
    return out;
  }

  function leerHex() {
    const out = [];
    i++; // <
    let digitos = "";
    while (i < n && datos[i] !== 0x3e) {
      const ch = String.fromCharCode(datos[i]);
      if (/[0-9a-fA-F]/.test(ch)) digitos += ch;
      i++;
    }
    i++; // >
    if (digitos.length % 2) digitos += "0";
    for (let k = 0; k < digitos.length; k += 2) out.push(parseInt(digitos.slice(k, k + 2), 16));
    return out;
  }

  while (i < n) {
    const c = datos[i];
    if (ES_BLANCO(c)) { i++; continue; }
    if (c === 0x28) { pendientes.push(leerLiteral()); continue; }
    if (c === 0x3c && datos[i + 1] !== 0x3c) { pendientes.push(leerHex()); continue; }
    if (c === 0x25) { while (i < n && datos[i] !== 0x0a) i++; continue; } // comentario
    if (ES_DELIM(c)) {
      // nombre (/X) o corchetes de TJ: no rompen la lista de cadenas pendientes
      if (c === 0x2f) {
        const ini = ++i;
        while (i < n && !ES_BLANCO(datos[i]) && !ES_DELIM(datos[i])) i++;
        ultimoNombre = comoTexto(datos.subarray(ini, i));
        continue;
      }
      i++; continue;
    }
    // token normal (operador o número)
    let ini = i;
    while (i < n && !ES_BLANCO(datos[i]) && !ES_DELIM(datos[i])) i++;
    const token = comoTexto(datos.subarray(ini, i));
    if (token === "BI") {
      // imagen en línea: los bytes crudos entre ID y EI romperían el análisis
      const id = buscar(datos, "ID", i);
      if (id < 0) break;
      i = id + 2;
      while (i < n) {
        if (ES_BLANCO(datos[i - 1]) && datos[i] === 0x45 && datos[i + 1] === 0x49 &&
            (i + 2 >= n || ES_BLANCO(datos[i + 2]) || ES_DELIM(datos[i + 2]))) { i += 2; break; }
        i++;
      }
      pendientes = [];
      continue;
    }
    if (token === "Tj" || token === "TJ" || token === "'" || token === '"') {
      // Cada operador de texto es un "trozo": pdf.js emite un item por cada uno,
      // así sabemos a qué línea pertenece cada carácter que repongamos.
      trozo++;
      for (const cad of pendientes) for (const b of cad) codigos.push({ codigo: b, trozo });
      pendientes = [];
    } else if (token === "Do" && contexto && ultimoNombre) {
      const anidados = await contexto.dibujarXObject(ultimoNombre, trozo);
      for (const b of anidados) { codigos.push(b); trozo = Math.max(trozo, b.trozo); }
      pendientes = [];
    } else if (!/^[-+.\d]+$/.test(token)) {
      pendientes = [];
    }
  }
  return codigos;
}

/** Códigos dibujados por cada página, en orden de página. */
export async function codigosPorPagina(bytes, objetos) {
  const salida = [];

  async function recorrer(datos, txtConRecursos, profundidad, inicioTrozo = 0) {
    if (profundidad > 6) return [];
    const xobjetos = xobjetosDe(objetos, txtConRecursos);
    return codigosDibujados(datos, {
      async dibujarXObject(nombre, desdeTrozo) {
        const ref = xobjetos.get(nombre);
        if (ref === undefined) return [];
        const obj = objetos.get(ref);
        if (!obj || !/\/Subtype\s*\/Form/.test(obj.txt)) return [];
        const contenido = await contenidoDeObjeto(bytes, objetos, ref);
        if (!contenido) return [];
        return recorrer(contenido, obj.txt, profundidad + 1, desdeTrozo);
      },
    }, inicioTrozo);
  }

  for (const numero of paginasEnOrden(objetos)) {
    const pagina = objetos.get(numero);
    const refs = [];
    const uno = /\/Contents\s+(\d+)\s+0\s+R/.exec(pagina.txt);
    if (uno) refs.push(parseInt(uno[1], 10));
    else {
      const arr = /\/Contents\s*\[([\s\S]*?)\]/.exec(pagina.txt);
      if (arr) for (const m of arr[1].matchAll(/(\d+)\s+0\s+R/g)) refs.push(parseInt(m[1], 10));
    }
    let codigos = [];
    for (const ref of refs) {
      const datos = await contenidoDeObjeto(bytes, objetos, ref);
      const ultimo = codigos.length ? codigos[codigos.length - 1].trozo : 0;
      if (datos) codigos = codigos.concat(await recorrer(datos, pagina.txt, 0, ultimo));
    }
    salida.push(codigos);
  }
  return salida;
}

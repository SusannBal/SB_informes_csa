/**
 * Interpreta las filas ya decodificadas de un centralizador de remdiz.
 *
 * Reconoce tres formatos:
 *
 *   "anual"       centralizador anual detallado: 12 áreas x (T1 T2 T3 PA) + PROM
 *   "trimestral"  centralizador de un trimestre: 12 áreas + PROM
 *   "area"        centralizador de una sola área: 3 trimestres x
 *                 (SER SABER HACER AUTOEV NOTA)
 *
 * Nada se asume: el área, el curso, la gestión, el número de estudiantes y los
 * trimestres con datos salen del archivo. Todo lo que se lee se verifica con la
 * aritmética que el propio centralizador declara (la nota es la suma de sus
 * dimensiones; el promedio, el promedio de las notas). Si la verificación falla
 * se avisa: un informe con un número mal leído es peor que no tener informe.
 */
import { CODIGOS_AREA, detectarArea } from "../dominio/areas.js";

const RE_NUM = /^\d{1,3}(?:\.\d+)?$/;

/** Corta una fila en celdas usando los espacios que ya inserta pdf.js. */
function celdasPorEspacios(chars) {
  const out = [];
  let act = null;
  for (const ch of chars) {
    if (ch.c === " ") { act = null; continue; }
    if (!act) { act = { texto: "", x: ch.x }; out.push(act); }
    act.texto += ch.c;
  }
  return out;
}

/**
 * Corta una fila usando las columnas del encabezado.
 * Hace falta cuando dos celdas contiguas quedan pegadas: "32" y "100" salen del
 * PDF como "32100" y sólo la posición horizontal las separa.
 */
function celdasPorColumnas(chars, columnas) {
  const limites = columnas.map((x, i) =>
    i === 0 ? -Infinity : (columnas[i - 1] + x) / 2);
  const out = columnas.map(() => "");
  const margenIzquierdo = columnas[0] - 12;
  for (const ch of chars) {
    // Las columnas de notas sólo llevan números: así el nombre, que en algunas
    // filas se mete debajo de la primera columna, no ensucia la lectura.
    if (!/[0-9.]/.test(ch.c)) continue;
    if (ch.x < margenIzquierdo) continue; // columna Nº y nombre
    let i = 0;
    while (i + 1 < columnas.length && ch.x >= limites[i + 1]) i++;
    out[i] += ch.c;
  }
  return out.map((texto, i) => ({ texto, x: columnas[i] }));
}

const aNumero = t => (t && RE_NUM.test(t) ? parseFloat(t) : null);

function textoDe(fila) {
  return fila.chars.map(c => c.c).join("");
}

/** ¿Es una línea suelta con parte de un nombre? (formato anual) */
function esLineaDeNombre(fila) {
  const t = textoDe(fila).trim();
  return t.length >= 3 && /^[A-ZÑ¿.' -]+$/.test(t) && /[A-Z]{3}/.test(t);
}

function localizarEncabezados(filas) {
  let filaAreas = null, filaTrimestres = null;
  for (const fila of filas) {
    if (fila.pagina !== 1) continue;
    const t = textoDe(fila).toUpperCase();
    const celdas = celdasPorEspacios(fila.chars);
    const codigos = celdas.filter(c => CODIGOS_AREA.includes(c.texto));
    if (codigos.length >= 8 && !filaAreas) filaAreas = { fila, celdas };
    if (!filaTrimestres) {
      const compacto = t.replace(/\s+/g, " ");
      if ((compacto.match(/T1 T2 T3/g) || []).length >= 2) filaTrimestres = { fila, celdas };
    }
  }
  return { filaAreas, filaTrimestres };
}

/** Filas de estudiante: primera celda 1..N consecutiva y muchas celdas numéricas. */
function localizarFilasDeEstudiante(filas, minCeldas) {
  const candidatas = [];
  filas.forEach((fila, i) => {
    const celdas = celdasPorEspacios(fila.chars);
    if (!celdas.length) return;
    const nro = aNumero(celdas[0].texto);
    if (nro === null || !Number.isInteger(nro) || nro < 1 || nro > 99) return;
    const numericas = celdas.slice(1).filter(c => RE_NUM.test(c.texto)).length;
    if (numericas < minCeldas) return;
    candidatas.push({ i, fila, celdas, nro });
  });

  // La corrida más larga que numere 1, 2, 3, ... sin saltos.
  let mejor = [];
  for (let ini = 0; ini < candidatas.length; ini++) {
    if (candidatas[ini].nro !== 1) continue;
    const corrida = [];
    let esperado = 1;
    for (let k = ini; k < candidatas.length; k++) {
      if (candidatas[k].nro !== esperado) continue;
      corrida.push(candidatas[k]);
      esperado++;
    }
    if (corrida.length > mejor.length) mejor = corrida;
  }
  return mejor.length ? mejor : candidatas;
}

/** Índice donde arranca la corrida final de celdas numéricas. */
function inicioDeNumeros(celdas) {
  let k = celdas.length;
  while (k > 1 && RE_NUM.test(celdas[k - 1].texto)) k--;
  return k;
}

function nombreDeFila(filas, indice, celdas, fila, columnas) {
  // Con columnas conocidas, el nombre es todo lo que queda a la izquierda de la
  // primera columna de notas: así los números no se le pegan al apellido.
  let propio;
  if (columnas) {
    // Todo lo que hay antes de la primera cifra que ya cae en la zona de notas.
    const limite = columnas[0] - 12;
    const letras = [];
    for (const ch of fila.chars) {
      if (/[0-9.]/.test(ch.c) && ch.x >= limite) break;
      letras.push(ch.c);
    }
    propio = letras.join("").replace(/^\s*\d+\s*/, "").replace(/\s+/g, " ").trim();
  } else {
    propio = celdas.slice(1, inicioDeNumeros(celdas))
      .map(c => c.texto).join(" ").replace(/\s+/g, " ").trim();
  }
  if (/[A-ZÑ¿]{3}/.test(propio)) return propio;
  // anual: el nombre está partido entre la fila de arriba y la de abajo
  const partes = [];
  const antes = filas[indice - 1];
  const despues = filas[indice + 1];
  if (antes && esLineaDeNombre(antes)) partes.push(textoDe(antes).trim());
  if (despues && esLineaDeNombre(despues)) partes.push(textoDe(despues).trim());
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

function numeroDeTrimestreDelTexto(texto) {
  const t = texto.toUpperCase();
  if (/PRIMER\s*TRIMESTRE|TRIMESTRE\s*PRIMER/.test(t)) return 1;
  if (/SEGUND\w*\s*TRIMESTRE|TRIMESTRE\s*SEGUND/.test(t)) return 2;
  if (/TERCER\s*TRIMESTRE|TRIMESTRE\s*TERCER/.test(t)) return 3;
  return null;
}

/**
 * @param {Array}  filas     filas decodificadas: { pagina, y, chars: [{ c, x }] }
 * @param {Object} opciones  { cursoPorDefecto, trimestre }
 */
export function analizarCentralizador(filas, opciones = {}) {
  const avisos = [];
  const enc = localizarEncabezados(filas);
  const tipo = enc.filaTrimestres ? "anual" : enc.filaAreas ? "trimestral" : "area";
  const filasEst = localizarFilasDeEstudiante(filas, tipo === "anual" ? 24 : 8);

  if (filasEst.length === 0) {
    throw new Error("No se reconoció ninguna fila de estudiantes. ¿Es un centralizador de remdiz?");
  }

  // ---- metadatos del encabezado -------------------------------------------
  const indicesEst = new Set(filasEst.map(e => e.i));
  const textoEncabezado = filas
    .filter((f, i) => f.pagina === 1 && !indicesEst.has(i))
    .map(textoDe).join("\n");

  const mGestion = /\b(20\d{2})\b/.exec(textoEncabezado);
  const gestion = mGestion ? parseInt(mGestion[1], 10) : new Date().getFullYear();

  const mCurso = /\((S?[1-6][A-D])\)/.exec(textoEncabezado);
  const cursoDelPdf = mCurso ? mCurso[1] : "";
  const curso = opciones.cursoPorDefecto || cursoDelPdf;

  let colegio = "COLEGIO SANTA ANA";
  const mColegio = /"\s*([A-ZÑ .'-]{4,60}?)\s*"?\s*$/m.exec(textoEncabezado);
  if (mColegio) colegio = mColegio[1].replace(/\s+/g, " ").trim();

  // "TUTOR  APELLIDOS NOMBRES" o "MAESTRO(A)  APELLIDOS NOMBRES"
  let profesor = "";
  const mProfesor = /^\s*(?:TUTOR|MAESTR[OA]\(?A?\)?|PROFESOR\(?A?\)?)[:\s]+([A-ZÑ .'-]{6,})$/m
    .exec(textoEncabezado);
  if (mProfesor) profesor = mProfesor[1].replace(/\s+/g, " ").trim();

  const trimestreDeclarado = numeroDeTrimestreDelTexto(textoEncabezado);

  // ---- columnas y áreas ---------------------------------------------------
  let areas, columnas = null, areaDetectada = null;
  if (tipo === "anual") {
    columnas = enc.filaTrimestres.celdas.map(c => c.x);
    areas = enc.filaAreas
      ? enc.filaAreas.celdas.filter(c => CODIGOS_AREA.includes(c.texto)).map(c => c.texto)
      : CODIGOS_AREA.slice(0, Math.floor(columnas.length / 4));
  } else if (tipo === "trimestral") {
    const codigos = enc.filaAreas.celdas.filter(c => CODIGOS_AREA.includes(c.texto));
    areas = codigos.map(c => c.texto);
    columnas = codigos.map(c => c.x);
  } else {
    // Se busca en TODO el encabezado, no en una sola línea: la fila "AREA" a
    // veces se mezcla con la de al lado según cómo el PDF acomode el
    // espaciado, y exigir una línea exacta hacía fallar archivos con el mismo
    // formato pero maquetados unos píxeles distinto.
    areaDetectada = detectarArea(textoEncabezado);
    if (!areaDetectada) {
      avisos.push("No se pudo leer el nombre del área en el encabezado del PDF. Elegila a mano antes de generar.");
    }
    areas = [areaDetectada ? areaDetectada.codigo : "AREA"];
  }

  // ---- estudiantes --------------------------------------------------------
  const estudiantes = [];
  let filasConError = 0;

  for (const est of filasEst) {
    const celdas = columnas
      ? celdasPorColumnas(est.fila.chars, columnas)
      : est.celdas.slice(inicioDeNumeros(est.celdas));
    const valores = celdas.map(c => aNumero(c.texto));
    const valor = i => (i < valores.length ? valores[i] : null);
    const nombre = nombreDeFila(filas, est.i, est.celdas, est.fila, columnas);

    const notas = {};
    let cuadra = true;

    if (tipo === "anual") {
      areas.forEach((codigo, a) => {
        const t1 = valor(a * 4), t2 = valor(a * 4 + 1), t3 = valor(a * 4 + 2);
        const pa = valor(a * 4 + 3);
        notas[codigo] = { t1, t2, t3 };
        if (pa !== null) {
          const esperado = Math.round(((t1 ?? 0) + (t2 ?? 0) + (t3 ?? 0)) / 3);
          if (Math.abs(esperado - pa) > 1) cuadra = false;
        }
      });
    } else if (tipo === "trimestral") {
      const t = trimestreDeclarado || opciones.trimestre || 2;
      areas.forEach((codigo, a) => {
        notas[codigo] = { t1: null, t2: null, t3: null };
        notas[codigo][`t${t}`] = valor(a);
      });
      const conNota = valores.slice(0, areas.length).filter(v => v !== null);
      const prom = valor(areas.length);
      if (prom !== null && conNota.length === areas.length) {
        const esperado = conNota.reduce((s, v) => s + v, 0) / conNota.length;
        if (Math.abs(esperado - prom) > 0.01) cuadra = false;
      }
    } else {
      const codigo = areas[0];
      notas[codigo] = { t1: null, t2: null, t3: null };
      for (let t = 0; t < 3; t++) {
        const bloque = valores.slice(t * 5, t * 5 + 5);
        const nota = bloque.length === 5 ? bloque[4] : null;
        notas[codigo][`t${t + 1}`] = nota;
        if (nota !== null && bloque.slice(0, 4).every(v => v !== null)) {
          const suma = bloque.slice(0, 4).reduce((s, v) => s + v, 0);
          if (suma !== nota) cuadra = false;
        }
      }
    }

    if (!cuadra) filasConError++;
    estudiantes.push({ nro: est.nro, nombre: nombre || `(sin nombre) ${est.nro}`, notas });
  }

  const trimestresConDatos = [1, 2, 3].filter(t =>
    estudiantes.some(e => Object.values(e.notas).some(n => n[`t${t}`] !== null))
  );

  if (filasConError > 0) {
    avisos.push(
      `${filasConError} de ${estudiantes.length} filas no cuadran con la aritmética del ` +
      `centralizador. Revisalas en el paso de revisión antes de generar los informes.`
    );
  }
  const conIncognitas = estudiantes.filter(e => e.nombre.includes("¿"));
  if (conIncognitas.length) {
    avisos.push(
      `${conIncognitas.length} nombre(s) traen caracteres que no se pudieron decodificar ` +
      `(marcados con ¿). Corregilos en el paso de revisión.`
    );
  }

  return {
    tipo,
    colegio,
    gestion,
    curso,
    cursoDelPdf,
    profesor,
    areas,
    areaDetectada,
    trimestreDeclarado,
    trimestresConDatos,
    estudiantes,
    avisos,
    filasConError,
  };
}

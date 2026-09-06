import { useState } from "react";
import { leerCentralizador } from "../entrada/leerPdf";
import { nombreDeArea } from "../dominio/areas";

const TRIMESTRES = [1, 2, 3];
const NOMBRES = { 1: "Primer", 2: "Segundo", 3: "Tercer" };

/**
 * Paso 1: elegir el trimestre y cargar los centralizadores.
 *
 * El trimestre lo elige la profesora — es distinto para cada informe y el
 * sistema no tiene por qué adivinarlo. El curso de cada archivo también:
 * se propone el que se deduce del nombre del archivo ("2A.pdf" → 2A) o el que
 * declara el PDF, y se puede corregir.
 */
export default function PasoCargar({ modo, varios, trimestre, setTrimestre, archivos, setArchivos, avanzar }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const subir = async (evento) => {
    const seleccionados = Array.from(evento.target.files || []);
    evento.target.value = "";
    if (!seleccionados.length) return;

    setError(null);
    setCargando(true);
    const nuevos = [];
    try {
      for (const archivo of seleccionados) {
        if (!archivo.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`"${archivo.name}" no es un PDF.`);
        }
        const datos = await leerCentralizador(archivo, { trimestre });
        nuevos.push({ nombre: archivo.name, datos });
      }
      setArchivos(varios ? [...archivos, ...nuevos] : nuevos.slice(0, 1));
    } catch (e) {
      console.error(e);
      setError(e.message || "No se pudo leer el archivo.");
    } finally {
      setCargando(false);
    }
  };

  const quitar = (indice) => setArchivos(archivos.filter((_, i) => i !== indice));

  const cambiarCurso = (indice, curso) => {
    setArchivos(archivos.map((a, i) =>
      i === indice ? { ...a, datos: { ...a.datos, curso: curso.toUpperCase() } } : a));
  };

  const listo = trimestre !== null
    && archivos.length > 0
    && archivos.every(a => (a.datos.curso || "").trim());

  return (
    <div className="paso">
      <h2>Paso 1 · Elegí el trimestre y cargá los centralizadores</h2>

      <section className="bloque">
        <h3>¿De qué trimestre es este informe?</h3>
        <div className="botonera">
          {TRIMESTRES.map(t => (
            <button
              key={t}
              type="button"
              className={`chip ${trimestre === t ? "chip-activo" : ""}`}
              onClick={() => setTrimestre(t)}
            >
              {NOMBRES[t]} trimestre
            </button>
          ))}
        </div>
        {trimestre === null && (
          <p className="ayuda">Hace falta elegirlo antes de seguir: cambia las notas que se leen y la fecha del informe.</p>
        )}
      </section>

      <section className="bloque">
        <h3>{varios ? "Centralizadores (uno por curso)" : "Centralizador"}</h3>
        <p className="ayuda">
          {varios && "Puedes cargar varios: 2A.pdf, 3A.pdf, 5B.pdf… El curso se toma del nombre del archivo y se puede corregir."}
          {!varios && modo === "nota" &&
            "Para este informe hace falta el centralizador ANUAL DETALLADO (el que trae los tres trimestres juntos). " +
            "El centralizador de un solo trimestre no alcanza: no tiene la nota del trimestre anterior para calcular cuánto falta."}
          {!varios && modo !== "nota" &&
            "El centralizador anual detallado o el del trimestre, tal como sale de remdiz."}
        </p>
        <input type="file" accept=".pdf" multiple={varios} onChange={subir} disabled={cargando} />
        {cargando && <p className="cargando">Leyendo y verificando el PDF…</p>}
        {error && <div className="error-alert">{error}</div>}
      </section>

      {archivos.length > 0 && (
        <section className="bloque">
          <h3>Archivos cargados</h3>
          <table className="tabla-archivos">
            <thead>
              <tr>
                <th>Archivo</th><th>Curso</th><th>Área</th>
                <th>Estudiantes</th><th>Trimestres con notas</th><th></th>
              </tr>
            </thead>
            <tbody>
              {archivos.map((a, i) => (
                <tr key={a.nombre + i}>
                  <td>{a.nombre}</td>
                  <td>
                    <input
                      className="celda-editable"
                      value={a.datos.curso || ""}
                      onChange={e => cambiarCurso(i, e.target.value)}
                      placeholder="2A"
                      size={5}
                    />
                  </td>
                  <td>
                    {a.datos.tipo === "area"
                      ? (a.datos.areaDetectada
                          ? nombreDeArea(a.datos.areaDetectada.codigo)
                          : <span className="aviso-inline">sin detectar</span>)
                      : `${a.datos.areas.length} áreas`}
                  </td>
                  <td>{a.datos.estudiantes.length}</td>
                  <td>
                    {a.datos.trimestresConDatos.length
                      ? a.datos.trimestresConDatos.join(", ")
                      : <span className="aviso-inline">ninguno</span>}
                  </td>
                  <td><button className="btn-quitar" onClick={() => quitar(i)}>quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          {archivos.flatMap(a => a.datos.avisos.map(t => `${a.nombre}: ${t}`)).map((t, i) => (
            <div key={i} className="warning-alert">{t}</div>
          ))}

          {trimestre !== null && archivos.some(a => !a.datos.trimestresConDatos.includes(trimestre)) && (
            <div className="warning-alert">
              Alguno de los archivos no trae notas del {NOMBRES[trimestre].toLowerCase()} trimestre.
              Revisá el trimestre elegido o el archivo cargado.
            </div>
          )}

          {modo === "nota" && trimestre >= 2 && archivos.some(a => {
            const necesarios = Array.from({ length: trimestre }, (_, i) => i + 1);
            return !necesarios.every(t => a.datos.trimestresConDatos.includes(t));
          }) && (
            <div className="warning-alert">
              Este archivo no trae todos los trimestres anteriores al {NOMBRES[trimestre].toLowerCase()}.
              "Nota necesaria" necesita compararlos todos: usá el centralizador anual detallado, no el de un
              solo trimestre.
            </div>
          )}
        </section>
      )}

      <div className="acciones">
        <button className="btn-primary" disabled={!listo} onClick={avanzar}>
          Revisar los datos →
        </button>
      </div>
    </div>
  );
}

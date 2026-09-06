import { GRADOS_POR_DEFECTO } from "../informes/temas";
import { notaDe, NOTA_MINIMA } from "../dominio/reglas";
import { compararCursos } from "../dominio/areas";
import { DIFICULTADES_FRECUENTES } from "../dominio/catalogos";

/**
 * Paso 4: lo único que no está en las notas.
 *
 * Cada informe pide lo suyo y nada más: el de tutoría no pregunta por temas
 * avanzados, y el de temas no pregunta por valores ético-morales.
 */
export default function PasoManual({ modo, cursos, trimestre, manual, setManual, avanzar, retroceder }) {
  const set = (campo, valor) => setManual({ ...manual, [campo]: valor });

  const lista = (campo, porDefecto) => manual[campo] ?? porDefecto;

  const cambiarEnLista = (campo, porDefecto, indice, clave, valor) => {
    const actual = [...lista(campo, porDefecto)];
    actual[indice] = { ...actual[indice], [clave]: valor };
    set(campo, actual);
  };

  const agregar = (campo, porDefecto, fila) => set(campo, [...lista(campo, porDefecto), fila]);
  const quitar = (campo, porDefecto, indice) =>
    set(campo, lista(campo, porDefecto).filter((_, i) => i !== indice));

  const parejas = (campo, etiquetas) => {
    const filas = lista(campo, [{ dificultad: "", estrategia: "" }]);
    return (
      <>
        <table className="tabla-manual">
          <thead><tr><th>{etiquetas[0]}</th><th>{etiquetas[1]}</th><th /></tr></thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td><textarea rows={2} value={f.dificultad || ""}
                  onChange={e => cambiarEnLista(campo, filas, i, "dificultad", e.target.value)} /></td>
                <td><textarea rows={2} value={f.estrategia || ""}
                  onChange={e => cambiarEnLista(campo, filas, i, "estrategia", e.target.value)} /></td>
                <td><button className="btn-quitar" onClick={() => quitar(campo, filas, i)}>quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn-secundario"
          onClick={() => agregar(campo, filas, { dificultad: "", estrategia: "" })}>
          + agregar fila
        </button>
      </>
    );
  };

  return (
    <div className="paso">
      <h2>Paso 4 · Lo que no sale de las notas</h2>

      {modo === "tutoria" && (
        <>
          <section className="bloque">
            <h3>Tutor/a</h3>
            <input
              className="ancho-total"
              value={manual.tutor ?? cursos[0]?.profesor ?? ""}
              onChange={e => set("tutor", e.target.value.toUpperCase())}
              placeholder="APELLIDOS Y NOMBRES"
            />
          </section>

          <section className="bloque">
            <h3>Estudiantes destacados por valores ético-morales</h3>
            <p className="ayuda">Esto no se puede calcular: lo elegís vos.</p>
            {(() => {
              const filas = lista("valores", [{ nombre: "", valor: "" }]);
              return (
                <>
                  <table className="tabla-manual">
                    <thead><tr><th>Nombre</th><th>Valor destacado</th><th /></tr></thead>
                    <tbody>
                      {filas.map((f, i) => (
                        <tr key={i}>
                          <td>
                            <input list="nomina" value={f.nombre || ""}
                              onChange={e => cambiarEnLista("valores", filas, i, "nombre", e.target.value)} />
                          </td>
                          <td>
                            <input value={f.valor || ""} placeholder="RESPONSABILIDAD / LIDERAZGO"
                              onChange={e => cambiarEnLista("valores", filas, i, "valor", e.target.value)} />
                          </td>
                          <td><button className="btn-quitar" onClick={() => quitar("valores", filas, i)}>quitar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <datalist id="nomina">
                    {(cursos[0]?.estudiantes || []).map(e => <option key={e.nro} value={e.nombre} />)}
                  </datalist>
                  <button className="btn-secundario"
                    onClick={() => agregar("valores", filas, { nombre: "", valor: "" })}>
                    + agregar estudiante
                  </button>
                </>
              );
            })()}
          </section>

          <section className="bloque">
            <h3>Dificultades del curso y estrategias</h3>
            {parejas("estrategiasTutoria", ["Dificultad del curso", "Estrategia innovadora"])}
          </section>
        </>
      )}

      {modo === "area" && (
        <>
          <section className="bloque">
            <h3>Profesor/a</h3>
            <input
              className="ancho-total"
              value={manual.profesor ?? cursos[0]?.profesor ?? ""}
              onChange={e => set("profesor", e.target.value.toUpperCase())}
              placeholder="APELLIDOS Y NOMBRES"
            />
          </section>

          <section className="bloque">
            <h3>Dificultad presentada por cada estudiante</h3>
            <p className="ayuda">
              La nómina es la de quienes reprobaron el área en el {trimestre}º trimestre. Elegí una
              dificultad frecuente para completar rápido, o escribí la tuya en el recuadro de abajo.
            </p>
            <table className="tabla-manual">
              <thead><tr><th>Curso</th><th>Estudiante</th><th>Nota</th><th>Dificultad presentada</th></tr></thead>
              <tbody>
                {[...cursos].sort((a, b) => compararCursos(a.curso, b.curso)).flatMap(curso =>
                  (curso.estudiantes || [])
                    .map(est => ({ curso, est, nota: notaDe(est.notas[curso.areas[0]], trimestre) }))
                    .filter(x => x.nota !== null && x.nota < NOTA_MINIMA)
                    .map(({ curso: c, est, nota }) => {
                      const clave = `${c.curso}|${est.nombre}`;
                      const detalles = manual.detalles || {};
                      return (
                        <tr key={clave}>
                          <td>{c.curso}</td>
                          <td>{est.nombre}</td>
                          <td>{nota}</td>
                          <td>
                            <select
                              className="ancho-total"
                              value=""
                              onChange={e => {
                                if (!e.target.value) return;
                                set("detalles", { ...detalles, [clave]: e.target.value });
                              }}
                            >
                              <option value="">Elegí una dificultad frecuente…</option>
                              {DIFICULTADES_FRECUENTES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <textarea rows={2} value={detalles[clave] || ""}
                              placeholder="O escribí la dificultad acá"
                              onChange={e => set("detalles", { ...detalles, [clave]: e.target.value })} />
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </section>

          <section className="bloque">
            <h3>Estrategias de superación de dificultades del área</h3>
            {parejas("estrategiasArea", ["Dificultad", "Estrategia innovadora"])}
          </section>
        </>
      )}

      {modo === "temas" && (
        <>
          <section className="bloque">
            <h3>Profesor/a</h3>
            <input
              className="ancho-total"
              value={manual.profesor ?? cursos[0]?.profesor ?? ""}
              onChange={e => set("profesor", e.target.value.toUpperCase())}
              placeholder="APELLIDOS Y NOMBRES"
            />
          </section>

          <section className="bloque">
            <h3>Temas programados y avanzados por grado</h3>
            <p className="ayuda">
              El porcentaje se calcula solo. Los aprobados y reprobados de cada curso salen de los PDF cargados.
            </p>
            {(() => {
              const filas = lista("grados", GRADOS_POR_DEFECTO);
              return (
                <>
                  <table className="tabla-manual">
                    <thead>
                      <tr><th>Grado</th><th>Programados</th><th>Avanzados</th><th>%</th><th /></tr>
                    </thead>
                    <tbody>
                      {filas.map((f, i) => {
                        const p = Number(f.programados) || 0;
                        const a = Number(f.avanzados) || 0;
                        return (
                          <tr key={i}>
                            <td><input value={f.grado || ""} size={8}
                              onChange={e => cambiarEnLista("grados", filas, i, "grado", e.target.value)} /></td>
                            <td><input type="number" min="0" value={f.programados ?? ""} size={4}
                              onChange={e => cambiarEnLista("grados", filas, i, "programados", e.target.value)} /></td>
                            <td><input type="number" min="0" value={f.avanzados ?? ""} size={4}
                              onChange={e => cambiarEnLista("grados", filas, i, "avanzados", e.target.value)} /></td>
                            <td>{p > 0 ? `${Math.round((a / p) * 100)}%` : "—"}</td>
                            <td><button className="btn-quitar" onClick={() => quitar("grados", filas, i)}>quitar</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button className="btn-secundario"
                    onClick={() => agregar("grados", filas, { grado: "", programados: "", avanzados: "" })}>
                    + agregar grado
                  </button>
                </>
              );
            })()}
          </section>
        </>
      )}

      <div className="acciones">
        <button className="btn-back" onClick={retroceder}>← Atrás</button>
        <button className="btn-primary" onClick={avanzar}>Generar informe →</button>
      </div>
    </div>
  );
}

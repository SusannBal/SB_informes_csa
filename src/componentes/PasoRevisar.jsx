import { useState } from "react";
import { AREAS_ESTANDAR, nombreDeArea } from "../dominio/areas";
import { notaDe, NOTA_MINIMA } from "../dominio/reglas";

/**
 * Paso 2: la red de seguridad.
 *
 * Todo lo que se leyó del PDF se puede corregir acá antes de generar nada:
 * nombres, notas, curso, área, profesor y gestión. Es barato de programar y es
 * lo único que separa un error de lectura de un documento oficial equivocado.
 */
export default function PasoRevisar({ archivos, trimestre, actualizarCurso, avanzar, retroceder }) {
  const [abierto, setAbierto] = useState(0);

  if (!archivos.length) return <p>No hay archivos cargados.</p>;

  const cambiarCampo = (indice, campo, valor) => {
    actualizarCurso(indice, { ...archivos[indice].datos, [campo]: valor });
  };

  const cambiarArea = (indice, codigo) => {
    const datos = archivos[indice].datos;
    const anterior = datos.areas[0];
    const estudiantes = datos.estudiantes.map(e => ({
      ...e,
      notas: { [codigo]: e.notas[anterior] },
    }));
    actualizarCurso(indice, {
      ...datos,
      areas: [codigo],
      areaDetectada: { codigo, nombre: nombreDeArea(codigo), confianza: 1 },
      estudiantes,
    });
  };

  const cambiarNombre = (indice, nro, nombre) => {
    const datos = archivos[indice].datos;
    actualizarCurso(indice, {
      ...datos,
      estudiantes: datos.estudiantes.map(e => (e.nro === nro ? { ...e, nombre } : e)),
    });
  };

  const cambiarNota = (indice, nro, area, texto) => {
    const datos = archivos[indice].datos;
    const limpio = texto.trim();
    const valor = limpio === "" ? null : Number(limpio);
    if (limpio !== "" && (Number.isNaN(valor) || valor < 0 || valor > 100)) return;
    actualizarCurso(indice, {
      ...datos,
      estudiantes: datos.estudiantes.map(e =>
        e.nro === nro
          ? { ...e, notas: { ...e.notas, [area]: { ...e.notas[area], [`t${trimestre}`]: valor } } }
          : e),
    });
  };

  return (
    <div className="paso">
      <h2>Paso 2 · Revisá lo que se leyó</h2>
      <p className="ayuda">
        Corregí cualquier celda que no coincida con el centralizador. Las notas que ves son las
        del {trimestre}º trimestre.
      </p>

      {archivos.map((a, indice) => {
        const datos = a.datos;
        const desplegado = abierto === indice;
        return (
          <section key={a.nombre + indice} className="bloque">
            <h3 className="cabecera-plegable" onClick={() => setAbierto(desplegado ? -1 : indice)}>
              {desplegado ? "▾" : "▸"} {datos.curso || "(sin curso)"} · {a.nombre} ·{" "}
              {datos.estudiantes.length} estudiantes
            </h3>

            {desplegado && (
              <>
                <div className="campos">
                  <label>
                    Curso
                    <input value={datos.curso || ""} onChange={e => cambiarCampo(indice, "curso", e.target.value.toUpperCase())} />
                  </label>
                  <label>
                    Gestión
                    <input
                      type="number"
                      value={datos.gestion}
                      onChange={e => cambiarCampo(indice, "gestion", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Profesor/a
                    <input value={datos.profesor || ""} onChange={e => cambiarCampo(indice, "profesor", e.target.value.toUpperCase())} />
                  </label>
                  {datos.tipo === "area" && (
                    <label>
                      Área
                      <select value={datos.areas[0]} onChange={e => cambiarArea(indice, e.target.value)}>
                        {AREAS_ESTANDAR.map(x => (
                          <option key={x.codigo} value={x.codigo}>{x.codigo} · {x.nombre}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="tabla-scroll">
                  <table className="tabla-notas">
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Estudiante</th>
                        {datos.areas.map(area => <th key={area}>{area}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {datos.estudiantes.map(est => (
                        <tr key={est.nro}>
                          <td>{est.nro}</td>
                          <td>
                            <input
                              className={`celda-editable ancha ${est.nombre.includes("¿") ? "celda-alerta" : ""}`}
                              value={est.nombre}
                              onChange={e => cambiarNombre(indice, est.nro, e.target.value)}
                            />
                          </td>
                          {datos.areas.map(area => {
                            const nota = notaDe(est.notas[area], trimestre);
                            return (
                              <td key={area}>
                                <input
                                  className={`celda-editable nota ${nota !== null && nota < NOTA_MINIMA ? "celda-baja" : ""}`}
                                  value={nota ?? ""}
                                  onChange={e => cambiarNota(indice, est.nro, area, e.target.value)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        );
      })}

      <div className="acciones">
        <button className="btn-back" onClick={retroceder}>← Atrás</button>
        <button className="btn-primary" onClick={avanzar}>Validar →</button>
      </div>
    </div>
  );
}

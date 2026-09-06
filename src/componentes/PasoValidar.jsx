import { useMemo } from "react";
import { validar } from "../dominio/validar";
import { resumenDelCurso } from "../dominio/reglas";
import { compararCursos } from "../dominio/areas";

/**
 * Paso 3: los errores bloquean, las advertencias sólo avisan.
 * Sin esto el sistema produciría informes que parecen bien y están mal.
 */
export default function PasoValidar({ cursos, trimestre, avanzar, retroceder }) {
  const cursosOrdenados = useMemo(
    () => [...cursos].sort((a, b) => compararCursos(a.curso, b.curso)),
    [cursos]
  );
  const resultados = useMemo(
    () => cursosOrdenados.map(c => ({ curso: c, ...validar(c, trimestre) })),
    [cursosOrdenados, trimestre]
  );

  const errores = resultados.flatMap(r => r.errores.map(t => `${r.curso.curso}: ${t}`));
  const advertencias = resultados.flatMap(r => r.advertencias.map(t => `${r.curso.curso}: ${t}`));

  return (
    <div className="paso">
      <h2>Paso 3 · Validación</h2>

      <table className="tabla-archivos">
        <thead>
          <tr><th>Curso</th><th>Estudiantes</th><th>Aprobados</th><th>Reprobados</th><th>Sin notas</th></tr>
        </thead>
        <tbody>
          {cursosOrdenados.map(c => {
            const r = resumenDelCurso(c.estudiantes, trimestre);
            return (
              <tr key={c.curso}>
                <td>{c.curso}</td>
                <td>{c.estudiantes.length}</td>
                <td>{r.aprobados} ({r.porcentajeAprobados}%)</td>
                <td>{r.reprobados} ({r.porcentajeReprobados}%)</td>
                <td>{r.sinDatos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {errores.length === 0 && advertencias.length === 0 && (
        <div className="ok-alert">Todo cuadra. Puedes seguir.</div>
      )}

      {errores.map((t, i) => <div key={i} className="error-alert">{t}</div>)}
      {advertencias.map((t, i) => <div key={i} className="warning-alert">{t}</div>)}

      {advertencias.length > 0 && errores.length === 0 && (
        <p className="ayuda">
          Las advertencias no impiden generar el informe, pero conviene revisarlas en el paso anterior.
        </p>
      )}

      <div className="acciones">
        <button className="btn-back" onClick={retroceder}>← Corregir datos</button>
        <button className="btn-primary" disabled={errores.length > 0} onClick={avanzar}>
          Continuar →
        </button>
      </div>
    </div>
  );
}

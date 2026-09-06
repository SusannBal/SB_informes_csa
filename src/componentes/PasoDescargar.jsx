import { useState } from "react";
import { generar } from "../salida/generar";
import { fechaCorta } from "../salida/fecha";
import { prepararTutoria } from "../informes/tutoria";
import { prepararArea } from "../informes/area";
import { prepararTemas } from "../informes/temas";
import { prepararNotaNecesaria } from "../informes/notaNecesaria";

const PLANTILLAS = {
  tutoria: { archivo: "tutoria.docx", base: "Informe_Tutoria" },
  area: { archivo: "area.docx", base: "Informe_Area" },
  temas: { archivo: "temas.docx", base: "Porcentaje_Temas" },
  nota: { archivo: "nota-necesaria.docx", base: "Nota_Necesaria" },
};

function contexto(modo, cursos, trimestre, manual) {
  switch (modo) {
    case "tutoria":
      return prepararTutoria(cursos[0], trimestre, {
        tutor: manual.tutor,
        valores: manual.valores,
        estrategias: manual.estrategiasTutoria,
      });
    case "area":
      return prepararArea(cursos, trimestre, {
        profesor: manual.profesor,
        detalles: manual.detalles,
        estrategias: manual.estrategiasArea,
      });
    case "temas":
      return prepararTemas(cursos, trimestre, {
        profesor: manual.profesor,
        grados: manual.grados,
      });
    case "nota":
      return prepararNotaNecesaria(cursos[0], trimestre);
    default:
      throw new Error(`Informe desconocido: ${modo}`);
  }
}

export default function PasoDescargar({ modo, cursos, trimestre, manual, retroceder }) {
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  const datos = (() => {
    try { return contexto(modo, cursos, trimestre, manual); }
    catch (e) { return { _error: e.message }; }
  })();

  const descargar = async () => {
    setError(null);
    try {
      const plantilla = PLANTILLAS[modo];
      const cursoEtiqueta = modo === "area" || modo === "temas"
        ? cursos.map(c => c.curso).join("-")
        : cursos[0]?.curso || "";
      const nombre = `${plantilla.base}_${cursoEtiqueta}_T${trimestre}_${fechaCorta()}.docx`;
      await generar(`plantillas/${plantilla.archivo}`, datos, nombre);
      setListo(true);
    } catch (e) {
      console.error(e);
      setError(e.message || "No se pudo generar el documento.");
    }
  };

  if (modo === "nota" && trimestre === 3) {
    return (
      <div className="paso">
        <h2>Nota necesaria para aprobar</h2>
        <div className="warning-alert">
          Este informe sólo tiene sentido en el primer y el segundo trimestre: en el tercero
          ya no queda ningún trimestre por delante para recuperar.
        </div>
        <div className="acciones">
          <button className="btn-back" onClick={retroceder}>← Atrás</button>
        </div>
      </div>
    );
  }

  return (
    <div className="paso">
      <h2>Descargar</h2>

      {datos._error && <div className="error-alert">{datos._error}</div>}

      {!datos._error && <Resumen modo={modo} datos={datos} trimestre={trimestre} />}

      {error && <div className="error-alert">{error}</div>}
      {listo && <div className="ok-alert">Documento descargado. Revisalo antes de entregarlo.</div>}

      <div className="acciones">
        <button className="btn-back" onClick={retroceder}>← Atrás</button>
        <button className="btn-primary" disabled={!!datos._error} onClick={descargar}>
          Descargar .docx
        </button>
      </div>
    </div>
  );
}

function Resumen({ modo, datos, trimestre }) {
  if (modo === "tutoria") {
    return (
      <ul className="resumen">
        <li>Tutor/a: <strong>{datos.tutor || "(sin completar)"}</strong></li>
        <li>Curso {datos.curso} · {datos.trimestre} trimestre · {datos.fecha}</li>
        <li>{datos.destacados.length} destacados por promedio</li>
        <li>{datos.dificultades.length} estudiante(s) con dificultades, cada uno con sus áreas y notas</li>
        <li>{datos.valores.length} destacados por valores · {datos.estrategias.length} estrategias</li>
      </ul>
    );
  }
  if (modo === "area") {
    return (
      <ul className="resumen">
        <li>Profesor/a: <strong>{datos.profesor || "(sin completar)"}</strong></li>
        <li>Área: <strong>{datos.area}</strong></li>
        <li>Cursos: {datos.cursos}</li>
        <li>{datos.estudiantes.length} estudiante(s) con dificultades en el {trimestre}º trimestre</li>
        {datos.areasEnConflicto && (
          <li className="aviso-inline">
            Los archivos cargados no son todos de la misma área ({datos.areasEnConflicto.join(", ")}).
          </li>
        )}
      </ul>
    );
  }
  if (modo === "temas") {
    return (
      <ul className="resumen">
        <li>Profesor/a: <strong>{datos.profesor || "(sin completar)"}</strong></li>
        <li>Área: <strong>{datos.area}</strong></li>
        <li>{datos.grados.length} grados · {datos.cursos.length} cursos con notas</li>
        <li>{datos.fecha}</li>
      </ul>
    );
  }
  return (
    <ul className="resumen">
      <li>Curso {datos.curso} · {datos.trimestre} trimestre</li>
      <li>{datos.totalEstudiantesEnRiesgo} estudiante(s) con al menos una materia en riesgo</li>
      <li>{datos.totalFilas} alerta(s) en total (una por cada estudiante y materia en riesgo)</li>
      <li>{datos.irrecuperables} de ellas ya no se pueden recuperar</li>
      {datos.faltaT1 && (
        <li className="aviso-inline">
          El archivo cargado no trae notas del primer trimestre, así que la cuenta las toma
          como 0. Para este informe conviene el centralizador anual detallado.
        </li>
      )}
    </ul>
  );
}

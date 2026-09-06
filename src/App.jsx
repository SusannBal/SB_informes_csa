import { useMemo, useState } from "react";
import Dashboard from "./componentes/Dashboard";
import PasoCargar from "./componentes/PasoCargar";
import PasoRevisar from "./componentes/PasoRevisar";
import PasoValidar from "./componentes/PasoValidar";
import PasoManual from "./componentes/PasoManual";
import PasoDescargar from "./componentes/PasoDescargar";
import { useDatosManuales } from "./hooks/useDatosManuales";
import "./App.css";

/** Qué pasos tiene cada informe y cuántos centralizadores necesita. */
const INFORMES = {
  tutoria: {
    titulo: "Informe de tutoría",
    varios: false,
    pasos: ["Cargar", "Revisar", "Validar", "Datos manuales", "Descargar"],
  },
  nota: {
    titulo: "Nota necesaria para aprobar",
    varios: false,
    pasos: ["Cargar", "Revisar", "Validar", "Descargar"],
  },
  area: {
    titulo: "Informe de área",
    varios: true,
    pasos: ["Cargar", "Revisar", "Validar", "Datos manuales", "Descargar"],
  },
  temas: {
    titulo: "Porcentaje de temas avanzados",
    varios: true,
    pasos: ["Cargar", "Revisar", "Validar", "Datos manuales", "Descargar"],
  },
};

export default function App() {
  const [informe, setInforme] = useState(null);
  const [paso, setPaso] = useState(0);
  const [trimestre, setTrimestre] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [manual, setManual] = useDatosManuales();

  const config = informe ? INFORMES[informe] : null;
  const cursos = useMemo(() => archivos.map(a => a.datos), [archivos]);

  const volverAlMenu = () => {
    setInforme(null);
    setPaso(0);
    setArchivos([]);
  };

  const avanzar = () => setPaso(p => Math.min(p + 1, config.pasos.length - 1));
  const retroceder = () => setPaso(p => Math.max(p - 1, 0));

  const actualizarCurso = (indice, datos) => {
    setArchivos(previos => previos.map((a, i) => (i === indice ? { ...a, datos } : a)));
  };

  return (
    <div className="app-container">
      <header>
        <h1>Generador de informes</h1>
        <p className="subtitulo">Colegio Santa Ana · gestión {new Date().getFullYear()}</p>
      </header>

      <main>
        {!informe && <Dashboard alElegir={setInforme} />}

        {informe && (
          <div className="flow-container">
            <div className="barra-superior">
              <button className="btn-back" onClick={paso === 0 ? volverAlMenu : retroceder}>
                ← {paso === 0 ? "Volver al menú" : "Atrás"}
              </button>
              <span className="nombre-informe">{config.titulo}</span>
            </div>

            <ol className="pasos-indicador">
              {config.pasos.map((p, i) => (
                <li key={p} className={i === paso ? "activo" : i < paso ? "completado" : ""}>
                  <span className="numero">{i + 1}</span> {p}
                </li>
              ))}
            </ol>

            <div className="glass-panel">
              {paso === 0 && (
                <PasoCargar
                  modo={informe}
                  varios={config.varios}
                  trimestre={trimestre}
                  setTrimestre={setTrimestre}
                  archivos={archivos}
                  setArchivos={setArchivos}
                  avanzar={avanzar}
                />
              )}

              {paso === 1 && (
                <PasoRevisar
                  archivos={archivos}
                  trimestre={trimestre}
                  actualizarCurso={actualizarCurso}
                  avanzar={avanzar}
                  retroceder={retroceder}
                />
              )}

              {paso === 2 && (
                <PasoValidar
                  cursos={cursos}
                  trimestre={trimestre}
                  avanzar={avanzar}
                  retroceder={retroceder}
                />
              )}

              {paso === 3 && config.pasos.length === 5 && (
                <PasoManual
                  modo={informe}
                  cursos={cursos}
                  trimestre={trimestre}
                  manual={manual}
                  setManual={setManual}
                  avanzar={avanzar}
                  retroceder={retroceder}
                />
              )}

              {paso === config.pasos.length - 1 && (
                <PasoDescargar
                  modo={informe}
                  cursos={cursos}
                  trimestre={trimestre}
                  manual={manual}
                  retroceder={retroceder}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="pie">
        Las notas se procesan en esta computadora: no se sube nada a ningún servidor.
      </footer>
    </div>
  );
}

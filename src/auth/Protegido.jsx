import { useState } from "react";

const CLAVE_ALMACENADA = "informes_acceso_ok";

/**
 * Puerta de entrada simple, sin ningún servicio externo: un usuario y una
 * contraseña de prueba fijos, compartidos con quien tenga que probar la app.
 *
 * No es el login definitivo (uno por profesor) ni pretende ser seguridad de
 * verdad — es sólo una traba liviana antes de armar eso. Cualquiera con algo
 * de conocimiento técnico puede saltearla mirando el código publicado; sirve
 * para que un visitante casual no entre, no para proteger datos sensibles.
 * (Por suerte no hay datos sensibles del otro lado: el generador de informes
 * sigue siendo 100% local, nada se sube a ningún lado.)
 */
export default function Protegido({ children }) {
  const usuarioEsperado = import.meta.env.VITE_APP_USER;
  const claveEsperada = import.meta.env.VITE_APP_PASSWORD;
  const configurado = Boolean(usuarioEsperado && claveEsperada);

  const [desbloqueado, setDesbloqueado] = useState(
    () => configurado && localStorage.getItem(CLAVE_ALMACENADA) === "1"
  );
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);

  if (!configurado) {
    return (
      <div className="app-container">
        <header><h1>Generador de informes</h1></header>
        <main>
          <div className="glass-panel">
            <h2>Falta configurar el acceso</h2>
            <p className="ayuda">
              No están definidas <code>VITE_APP_USER</code> y{" "}
              <code>VITE_APP_PASSWORD</code>. Copiá <code>.env.example</code> a{" "}
              <code>.env</code> y completá las dos, con el usuario y la
              contraseña que quieras compartir.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (desbloqueado) {
    return (
      <>
        {children}
        <button
          className="btn-cerrar-sesion"
          onClick={() => { localStorage.removeItem(CLAVE_ALMACENADA); setDesbloqueado(false); }}
        >
          Cerrar sesión
        </button>
      </>
    );
  }

  const entrar = (evento) => {
    evento.preventDefault();
    if (usuario === usuarioEsperado && clave === claveEsperada) {
      localStorage.setItem(CLAVE_ALMACENADA, "1");
      setDesbloqueado(true);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Generador de informes</h1>
        <p className="subtitulo">Colegio Santa Ana · acceso de prueba</p>
      </header>
      <main>
        <form className="glass-panel login-panel" onSubmit={entrar}>
          <h2>Ingresar</h2>

          <div className="credenciales-prueba">
            Usuario: <strong>{usuarioEsperado}</strong> · Contraseña: <strong>{claveEsperada}</strong>
          </div>

          <label>
            Usuario
            <input
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="text"
              autoComplete="current-password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              required
            />
          </label>

          {error && <div className="error-alert">{error}</div>}

          <button className="btn-primary ancho-total" type="submit">Entrar</button>
        </form>
      </main>
    </div>
  );
}

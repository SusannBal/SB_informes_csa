import { useState } from "react";

const CLAVE_ALMACENADA = "informes_acceso_ok";

async function sha256Hex(texto) {
  const datos = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Puerta de entrada simple, sin ningún servicio externo: una única
 * contraseña de prueba, compartida con quien tenga que probar la app.
 *
 * No es el login definitivo (uno por profesor) ni pretende ser seguridad de
 * verdad — es sólo una traba liviana antes de armar eso. Cualquiera con algo
 * de conocimiento técnico puede saltearla mirando el código publicado; sirve
 * para que un visitante casual no entre, no para proteger datos sensibles.
 * (Por suerte no hay datos sensibles del otro lado: el generador de informes
 * sigue siendo 100% local, nada se sube a ningún lado.)
 *
 * La contraseña no queda en texto plano en el código: se compara la huella
 * SHA-256 de lo que se escribe contra VITE_APP_PASSWORD_HASH.
 */
export default function Protegido({ children }) {
  const hashEsperado = import.meta.env.VITE_APP_PASSWORD_HASH;
  const [desbloqueado, setDesbloqueado] = useState(
    () => Boolean(hashEsperado) && localStorage.getItem(CLAVE_ALMACENADA) === hashEsperado
  );
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  if (!hashEsperado) {
    return (
      <div className="app-container">
        <header><h1>Generador de informes</h1></header>
        <main>
          <div className="glass-panel">
            <h2>Falta configurar el acceso</h2>
            <p className="ayuda">
              No está definida <code>VITE_APP_PASSWORD_HASH</code>. Copiá{" "}
              <code>.env.example</code> a <code>.env</code> y generá una huella con:
            </p>
            <pre>node scripts/hashearClave.mjs "tu-contraseña"</pre>
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

  const entrar = async (evento) => {
    evento.preventDefault();
    setVerificando(true);
    setError(null);
    const huella = await sha256Hex(clave);
    setVerificando(false);
    if (huella === hashEsperado) {
      localStorage.setItem(CLAVE_ALMACENADA, huella);
      setDesbloqueado(true);
    } else {
      setError("Contraseña incorrecta.");
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
          <p className="ayuda">Usá la contraseña de prueba que te compartieron.</p>

          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              autoFocus
              required
            />
          </label>

          {error && <div className="error-alert">{error}</div>}

          <button className="btn-primary ancho-total" type="submit" disabled={verificando}>
            {verificando ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}

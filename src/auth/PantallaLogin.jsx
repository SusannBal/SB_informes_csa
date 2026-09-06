import { useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Puerta de entrada con la cuenta de prueba compartida.
 *
 * No es el login definitivo (uno por profesor): es una única cuenta que se
 * crea a mano en el panel de Supabase (Authentication → Users → Add user) y
 * se comparte con quien tenga que probar la app. Mientras tanto, nada de lo
 * que hay del otro lado de esta pantalla cambia: sigue siendo 100% local.
 */
export default function PantallaLogin() {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (evento) => {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    });
    setEnviando(false);
    if (err) setError(err.message === "Invalid login credentials"
      ? "Usuario o contraseña incorrectos."
      : err.message);
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
          <p className="ayuda">Usá la cuenta de prueba que te compartieron.</p>

          <label>
            Correo
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={clave}
              onChange={e => setClave(e.target.value)}
              required
            />
          </label>

          {error && <div className="error-alert">{error}</div>}

          <button className="btn-primary ancho-total" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}

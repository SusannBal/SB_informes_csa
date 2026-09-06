import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabaseClient";
import PantallaLogin from "./PantallaLogin";

/**
 * Envuelve la app con la cuenta de prueba compartida.
 *
 * No toca en nada el generador de informes: una vez adentro, `children` se
 * renderiza tal cual, sin pasar por Supabase para nada más que esto.
 */
export default function Protegido({ children }) {
  const [cargando, setCargando] = useState(supabaseConfigurado);
  const [sesion, setSesion] = useState(null);

  useEffect(() => {
    if (!supabaseConfigurado) return;

    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSesion(s);
    });

    return () => suscripcion.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigurado) {
    return (
      <div className="app-container">
        <header><h1>Generador de informes</h1></header>
        <main>
          <div className="glass-panel">
            <h2>Falta configurar el acceso</h2>
            <p className="ayuda">
              No están definidas <code>VITE_SUPABASE_URL</code> y{" "}
              <code>VITE_SUPABASE_ANON_KEY</code>. Copiá <code>.env.example</code> a{" "}
              <code>.env</code> y completá los dos valores de tu proyecto de Supabase.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (cargando) return null;

  if (!sesion) return <PantallaLogin />;

  return (
    <>
      {children}
      <button
        className="btn-cerrar-sesion"
        onClick={() => supabase.auth.signOut()}
        title={sesion.user?.email || ""}
      >
        Cerrar sesión
      </button>
    </>
  );
}

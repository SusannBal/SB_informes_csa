import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase, usado ÚNICAMENTE para autenticación (una cuenta de
 * prueba compartida, mientras no existe el login definitivo).
 *
 * No hay ninguna tabla ni base de datos de por medio: el generador de
 * informes sigue funcionando exactamente igual que antes — todo se procesa
 * en el navegador, ninguna nota ni nombre de estudiante se sube a ningún
 * lado. Supabase sólo decide si se puede entrar a la pantalla de la app.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && anonKey);

export const supabase = supabaseConfigurado
  ? createClient(url, anonKey)
  : null;

import { useEffect, useState } from "react";

const CLAVE = "informes_datos_manuales";

/**
 * Guarda los datos que se escriben a mano para no perderlos al cerrar la
 * pestaña. Sólo texto propio: acá no van nombres ni notas de estudiantes.
 */
export function useDatosManuales() {
  const [manual, setManual] = useState(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado ? JSON.parse(guardado) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(manual)); } catch { /* sin espacio */ }
  }, [manual]);

  return [manual, setManual];
}

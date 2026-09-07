/**
 * Genera la huella SHA-256 de una contraseña, para VITE_APP_PASSWORD_HASH.
 *
 * La contraseña en sí nunca queda escrita en el código ni en el repositorio:
 * sólo esta huella, que la pantalla de acceso usa para comparar.
 *
 *   node scripts/hashearClave.mjs "la-contraseña-que-elijas"
 */
import { createHash } from "crypto";

const clave = process.argv[2];
if (!clave) {
  console.error('Uso: node scripts/hashearClave.mjs "tu-contraseña"');
  process.exit(1);
}

console.log(createHash("sha256").update(clave, "utf8").digest("hex"));

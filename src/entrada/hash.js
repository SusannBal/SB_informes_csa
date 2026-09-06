/**
 * Huella estable de un glifo Type 3.
 *
 * Los PDF de remdiz vienen con fuentes Type 3 sin mapa Unicode: el código de
 * cada carácter cambia en cada archivo, pero el *dibujo* del glifo es siempre
 * el mismo. Hasheamos ese dibujo y lo buscamos en `glifos.json`.
 *
 * No hace falta un hash criptográfico: son ~150 glifos por archivo.
 */
export function huellaBytes(bytes) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < bytes.length; i++) {
    a = Math.imul(a ^ bytes[i], 0x01000193) >>> 0;
    b = Math.imul((b + bytes[i]) ^ (b >>> 13), 0x85ebca6b) >>> 0;
  }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

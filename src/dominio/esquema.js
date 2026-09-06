import { z } from "zod";
import { CODIGOS_AREA } from "./areas.js";

export const AREAS = CODIGOS_AREA;

const Nota = z.number().min(0).max(100).nullable();

export const NotasArea = z.object({
  t1: Nota,
  t2: Nota,
  t3: Nota,
});

export const Estudiante = z.object({
  nro: z.number().int().positive(),
  nombre: z.string().min(3, "el nombre quedó vacío o incompleto"),
  notas: z.record(z.string(), NotasArea),
});

/**
 * El curso tal como sale del centralizador, ya normalizado.
 *
 * No se guardan promedios: se calculan siempre a partir de t1/t2/t3. Si se
 * guardaran, tarde o temprano el JSON se contradiría a sí mismo.
 */
export const Curso = z.object({
  colegio: z.string(),
  gestion: z.number().int().min(2000).max(2100),
  curso: z.string().min(1, "falta indicar el curso"),
  trimestre: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  profesor: z.string().optional().default(""),
  areas: z.array(z.string()).min(1),
  estudiantes: z.array(Estudiante).min(1),
});

# Sistema de informes trimestrales — Colegio Santa Ana

Especificación técnica y plan de trabajo.
Versión 1 · gestión 2026

---

## 1. Qué resuelve

Cada fin de trimestre hay que producir cuatro documentos Word a partir de las mismas
notas. Hoy se hacen a mano: se leen los centralizadores, se cuenta quién reprobó qué,
se calcula cuánto le falta a cada aplazado y se llenan las plantillas.

El sistema automatiza **el cálculo y el llenado**. No automatiza el criterio pedagógico
(destacados por valores, estrategias de superación, temas avanzados): eso lo seguís
escribiendo vos, pero una sola vez y en un formulario, no repartido entre cuatro Word.

**Entrada:** las notas del trimestre.
**Salida:** cuatro `.docx` con el formato exacto que acepta dirección.

---

## 2. Decisión de arquitectura

Vos manejás React, así que la pregunta real es si hace falta un backend.

**No hace falta.** Todo el trabajo (leer el archivo, calcular, rellenar el Word) se
puede hacer en el navegador. Esto no es solo comodidad:

- **Las notas de menores nunca salen de tu computadora.** No hay servidor que hostear,
  ni base de datos que proteger, ni backups que puedan filtrarse. El navegador abre el
  archivo, lo procesa en memoria y descarga el resultado.
- No hay nada que desplegar ni mantener. Es un sitio estático: lo subís a Netlify o
  GitHub Pages, o lo corrés con `npm run dev` cuando lo necesitás.
- Un solo lenguaje. No tenés que sostener un Python que no vas a tocar en tres meses.

La contra: `docxtpl` es de Python y no lo vas a poder usar. El equivalente en JS es
`docxtemplater`, que hace lo mismo (rellena plantillas `.docx` preservando formato) y
tiene una API muy parecida.

> **Cuándo sí necesitarías backend:** si algún día querés que el sistema entre solo a
> remdiz a bajar las notas. El navegador no puede hacer ese login por CORS. Pero eso es
> una mejora futura y opcional — mientras tanto, copiar la tabla toma 20 segundos.

---

## 3. Stack

| Para | Librería | Por qué |
|---|---|---|
| Base | React 18 + Vite | Lo que ya conocés; Vite arranca en segundos |
| Leer PDF | `pdfjs-dist` | El único parser de PDF serio en JS |
| Leer Excel/CSV | `xlsx` (SheetJS) | Lee `.xlsx` y `.csv` con la misma API |
| Rellenar Word | `docxtemplater` + `pizzip` | Preserva formato, logos, tablas y marca de agua |
| Descargar | `file-saver` | Un `saveAs()` y listo |
| Validar datos | `zod` | Define el esquema una vez y te avisa exactamente qué campo está mal |
| Estado | `useState` / `useReducer` | El flujo es lineal, no necesitás Redux ni Zustand |

```bash
npm create vite@latest informes -- --template react
cd informes
npm i pdfjs-dist xlsx docxtemplater pizzip file-saver zod
```

**Lo que NO necesitás:** router (es una sola pantalla con pasos), librería de
componentes, backend, base de datos, autenticación.

---

## 4. El flujo

```
[1] Cargar        →  [2] Extraer      →  [3] Normalizar   →  [4] Validar
    PDF/CSV/pegar     texto crudo         notas.json          cruzada
                                                                  ↓
[7] Descargar     ←  [6] Rellenar     ←  [5] Completar    ←  ¿pasa?
    4 .docx           plantillas           datos manuales
```

Cada paso es una pantalla. El usuario no puede avanzar si el anterior falló — eso es
deliberado: un informe con un número mal leído es peor que no tener informe.

### Paso 1 — Cargar

Tres formas de entrar, en orden de preferencia:

1. **Pegar la tabla** (recomendado). Abrís el centralizador en remdiz, seleccionás la
   tabla, Ctrl+C, y la pegás en un `<textarea>`. El navegador recibe HTML con filas y
   columnas ya separadas. Cero ambigüedad, cero decodificación.
2. **Subir CSV o Excel** exportado de esa misma tabla.
3. **Subir el PDF**. Funciona, pero es la ruta frágil (ver sección 5).

Implementá la 1 primero. Es la que menos código necesita y la que menos se rompe.

### Paso 2 — Extraer

Convertir lo que entró en una matriz de celdas. Nada más. No interpretar todavía.

### Paso 3 — Normalizar

Pasar la matriz al esquema canónico (sección 6). Acá se detectan las áreas, se asocia
cada estudiante con su fila y se convierten las notas a números.

### Paso 4 — Validar

Sección 8. Si algo falla, se muestra qué fila y qué columna, y no se avanza.

### Paso 5 — Completar datos manuales

Un formulario con lo que no está en las notas: destacados por valores, dificultades del
curso, estrategias, temas programados vs. avanzados. Se guarda en `localStorage` para
que no lo pierdas si cerrás la pestaña.

### Paso 6 — Rellenar plantillas

`docxtemplater` toma las cuatro plantillas y les inyecta los datos.

### Paso 7 — Descargar

Cuatro archivos, o un `.zip` con los cuatro.

---

## 5. El problema del PDF (leer antes de programar el parser)

Los PDF que exporta remdiz están generados con Nitro PDF y usan **fuentes Type 3 sin
mapa Unicode**. Si les sacás el texto tal cual, obtenés esto:

```
;;<=<>?@A;BCAD@E<;D<F><;<AG@AC     HI JK HL KJ LH LM LI KM JI JL LJ KN LOPHIQ
```

Que en realidad es:

```
ALARCON MENDOZA DAYRA ANTONE       58 47 56 74 65 62 68 72 48 46 64 79 61.583
```

No es basura aleatoria: es una **sustitución 1 a 1 consistente** dentro del documento.
Cada carácter original tiene siempre el mismo reemplazo. El problema es que el mapa
**cambia en cada PDF**, porque depende del orden en que aparecen los caracteres.

### Cómo derivar el mapa automáticamente

1. **Anclar en texto conocido.** Estos strings aparecen siempre, iguales, en todos los
   centralizadores:
   - `UNIDAD EDUCATIVA`
   - `COLEGIO SANTA ANA`
   - `CENTRALIZADOR`
   - `PROMEDIO DE AREAS`
   - `PROMOVIDOS` / `RETENIDOS`
   - los códigos de área: `CYL LEX CSO EFD EMU APV MAT CNA FIS QMC CFP VER`

   Buscás en el texto crudo cadenas con el mismo *patrón de repetición de letras* que
   estas (por ejemplo `PROMOVIDOS` tiene la forma `ABCDCEFGCH` — la O se repite en las
   posiciones 2, 5 y 9). Con eso sacás casi todas las letras.

2. **Resolver los dígitos con aritmética.** Los dígitos no aparecen en texto fijo, pero
   hay una restricción fuerte: en cada fila, la columna **PROM** es el promedio de las
   12 columnas de área. Probás asignaciones de dígitos y te quedás con la única que
   hace cuadrar **todas** las filas. Con 39 filas la solución es única.

3. **Verificar.** Antes de aceptar el mapa, comprobá que el 100% de las filas cumplen
   la relación del promedio. Si aunque sea una falla, **abortá y pedí CSV**. Nunca
   entregues un informe con un mapa dudoso.

### El atajo que deberías probar primero

Imprimí la misma página desde **Chrome** en vez de Nitro (Ctrl+P → Guardar como PDF).
Chrome sí escribe el mapa Unicode, y el texto sale legible sin nada de esto. Si te
funciona, todo el módulo decodificador pasa a ser un plan B.

---

## 6. Esquema canónico

Todo lo demás depende de este formato. Una vez que tenés esto, la fuente deja de
importar.

```js
// src/dominio/esquema.js
import { z } from "zod";

export const AREAS = ["CYL","LEX","CSO","EFD","EMU","APV",
                      "MAT","CNA","FIS","QMC","CFP","VER"];

const Nota = z.number().int().min(0).max(100).nullable();

export const NotasArea = z.object({
  t1: Nota,
  t2: Nota,
  t3: Nota,
});

export const Estudiante = z.object({
  nro: z.number().int().positive(),
  nombre: z.string().min(3),
  notas: z.record(z.enum(AREAS), NotasArea),
});

export const Curso = z.object({
  colegio:    z.string(),
  gestion:    z.number().int().min(2000).max(2100),
  curso:      z.string(),          // "S4A"
  trimestre:  z.union([z.literal(1), z.literal(2), z.literal(3)]),
  tutor:      z.string(),
  areas:      z.array(z.enum(AREAS)).min(1),
  estudiantes: z.array(Estudiante).min(1),
});
```

**Regla importante: no guardes promedios.** El promedio anual, el estado de aprobación
y la nota necesaria se calculan siempre a partir de t1/t2/t3. Si los guardás, tarde o
temprano el JSON se va a contradecir a sí mismo.

Ejemplo:

```json
{
  "colegio": "La Salle - Santa Ana",
  "gestion": 2026,
  "curso": "S4A",
  "trimestre": 2,
  "tutor": "CASTELLANOS ORELLANO SUSANA LUISA",
  "areas": ["CYL","LEX","CSO","EFD","EMU","APV","MAT","CNA","FIS","QMC","CFP","VER"],
  "estudiantes": [
    {
      "nro": 2,
      "nombre": "ANGULO FERNANDEZ MATEO",
      "notas": {
        "CYL": { "t1": 40, "t2": 51, "t3": null },
        "LEX": { "t1": 53, "t2": 43, "t3": null }
      }
    }
  ]
}
```

---

## 7. Reglas de negocio

Todas verificadas contra el centralizador real de S4A, gestión 2026.

| Regla | Fórmula |
|---|---|
| Promedio anual de un área | `(t1 + t2 + t3) / 3`, trimestre faltante cuenta como **0** |
| Aprueba el área | `promedioAnual >= 51` |
| Reprobado del trimestre | nota del trimestre `< 51` |
| Nota necesaria en T3 | `ceil(153 − t1 − t2)` |
| Nota necesaria en T2 y T3 (informe del 1er trimestre) | `ceil((153 − t1) / 2)` en cada uno |
| Irrecuperable | el resultado da `> 100` |
| Promedio general del estudiante | media de los promedios anuales de sus áreas |
| % aprobados del curso | `aprobados / total * 100`, redondeado a 1 decimal |

El `153` sale de `51 × 3`: el mínimo de puntos acumulados para que el promedio anual
llegue a 51.

```js
// src/dominio/reglas.js
export const NOTA_MINIMA = 51;
export const TRIMESTRES = 3;
const META = NOTA_MINIMA * TRIMESTRES; // 153

export function promedioAnual({ t1, t2, t3 }) {
  return ((t1 ?? 0) + (t2 ?? 0) + (t3 ?? 0)) / TRIMESTRES;
}

export function apruebaArea(notas) {
  return promedioAnual(notas) >= NOTA_MINIMA;
}

/**
 * Cuánto necesita en cada trimestre que le queda.
 * Devuelve { necesaria, alcanzable, restantes }.
 */
export function notaNecesaria(notas, trimestreActual) {
  const acumulado   = (notas.t1 ?? 0) + (trimestreActual >= 2 ? (notas.t2 ?? 0) : 0);
  const restantes   = TRIMESTRES - trimestreActual;
  if (restantes <= 0) return { necesaria: null, alcanzable: null, restantes: 0 };

  const necesaria = Math.ceil((META - acumulado) / restantes);
  return {
    necesaria: Math.max(necesaria, 0),
    alcanzable: necesaria <= 100,
    restantes,
  };
}

export function areasReprobadas(estudiante, trimestre) {
  const clave = `t${trimestre}`;
  return Object.entries(estudiante.notas)
    .filter(([, n]) => n[clave] !== null && n[clave] < NOTA_MINIMA)
    .map(([area, n]) => ({ area, nota: n[clave] }));
}

export function destacados(estudiantes, cantidad = 3) {
  return [...estudiantes]
    .map(e => ({
      ...e,
      promedio: Object.values(e.notas).reduce((s, n) => s + promedioAnual(n), 0)
                / Object.keys(e.notas).length,
    }))
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, cantidad);
}
```

### Casos borde que tenés que manejar

- **Nota necesaria > 100.** No escribas `112`. El informe debe decir "no alcanza".
  Va a pasar: si alguien sacó 30 y 35, necesita 88 en T3; si sacó 20 y 25, necesita 108.
- **Estudiante sin nota en un área** (se cambió de colegio, o el área no aplica). No
  cuenta como reprobado ni entra en el porcentaje. `null` no es `0`.
- **Áreas que no están en las 12 estándar.** El colegio puede agregar una. No hardcodees
  la lista: leela del encabezado del centralizador y usá `AREAS` solo para validar.
- **Empate en el tercer puesto de destacados.** Decidí una regla y dejala escrita
  (sugerencia: mostrar los cuatro y que vos decidas).
- **Nombres con caracteres raros.** En el PDF, `JESÚS` sale como `JES�S` y `GARZÓN`
  como `GARZ�N`. Los acentos se pierden en la codificación. Ofrecé corregirlos a mano
  antes de generar.

---

## 8. Validaciones

Separalas en dos niveles. Esto es lo más importante de todo el sistema: **un error
silencioso es peor que un error ruidoso**.

### Bloqueantes — no se genera nada

| Validación | Cómo |
|---|---|
| El esquema es válido | `Curso.parse(datos)` con zod |
| Toda nota está entre 0 y 100 | incluido en el esquema |
| No hay estudiantes duplicados | comparar por `nro` y por `nombre` |
| Todos tienen las mismas áreas | comparar `Object.keys(notas)` contra `areas` |
| El mapa del PDF es correcto | el 100% de las filas cumple `PROM == media(áreas)` |
| El total de estudiantes coincide | contra el que declara el centralizador |

### Verificación cruzada (la que de verdad te salva)

Si cargaste el `trimestral` y el `anualdetallado`, comparalos:

- El promedio por área que calculás vs. la fila `PROMEDIO DE AREAS`
- Tu conteo de aprobados vs. la fila `PROMOVIDOS`
- Tu conteo de reprobados vs. la fila `RETENIDOS`

Si no coinciden, **algo se leyó mal**. Mostrá exactamente qué área y qué diferencia.
Esta comprobación es la razón por la que podés confiar en el resultado.

### Advertencias — se genera, pero avisando

- Un estudiante con más de 6 áreas reprobadas (¿está bien leída la fila?)
- Un curso con más del 40% de reprobados en un área
- Notas que se repiten sospechosamente (toda una fila con el mismo número)
- Nombres con `�` sin corregir
- Campos manuales vacíos

---

## 9. Los cuatro informes

### 9.1 Informe académico de tutoría

| Sección | Origen |
|---|---|
| Tutor, curso, trimestre, fecha | encabezado + fecha del sistema |
| Estudiantes destacados por promedio (3) | calculado |
| Destacados por valores ético-morales | **manual** |
| Estudiantes con dificultades: áreas reprobadas y notas | calculado |
| Dificultades del curso y estrategias | **manual** |

Cada estudiante con al menos un área reprobada va en su propia fila, con el detalle de
áreas y notas — sin excepción. No se agrupa a nadie en un resumen tipo "3 estudiantes en
2 áreas": eso obligaba a ir a buscar el detalle a otro lado.

### 9.2 Informe académico de área

Uno por profesor y área. Lista de estudiantes con dificultades en esa área, con curso y
detalle. El detalle es **manual**; la lista es calculada.

### 9.3 Porcentaje de temas avanzados

| Sección | Origen |
|---|---|
| Temas programados vs. avanzados por grado | **manual** |
| % de aprobados y reprobados por curso | calculado |
| Fecha | fecha del sistema |

Ojo: este informe cubre varios cursos a la vez, no solo el tuyo. Si solo cargás S4A,
las demás filas quedan vacías. Decidí si querés cargar todos los cursos o llenar el
resto a mano.

### 9.4 Nota necesaria para aprobar

Solo para 1er y 2do trimestre. Por cada estudiante con al menos un área en riesgo:
las áreas, las notas que tiene, y cuánto necesita. Los irrecuperables se marcan aparte.

---

## 10. Plantillas Word

Tomá los `.docx` que ya usás y metéles las variables. El formato, los logos, los bordes
y la marca de agua se mantienen intactos.

Sintaxis de `docxtemplater`:

```
Tutor: {tutor}          Curso: {curso}
Trimestre: {trimestre}  Fecha: {fecha}
```

Para filas repetidas, los tags van solos en la primera y última celda de la fila:

```
| {#destacados} {nombre} | {promedio} {/destacados} |
```

```js
// src/salida/generar.js
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export async function generar(rutaPlantilla, datos, nombreSalida) {
  const buffer = await fetch(rutaPlantilla).then(r => r.arrayBuffer());
  const zip = new PizZip(buffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(datos);

  const salida = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(salida, nombreSalida);
}
```

### La marca de agua

El año de la marca de agua **no** vive en el texto del documento: está en un atributo
XML dentro de `word/header1.xml`, `header2.xml` y `header3.xml`:

```xml
<v:textpath string="U.E. LA SALLE -  SANTA ANA 3 2026"/>
```

`docxtemplater` no llega ahí. Hay que corregirlo sobre el ZIP, después de renderizar:

```js
// src/salida/marcaAgua.js
export function actualizarMarcaAgua(zip, gestion) {
  zip.file(/word\/header\d*\.xml/).forEach(archivo => {
    const xml = archivo.asText().replace(
      /(<v:textpath[^>]*string="[^"]*?)\b(19|20)\d{2}\b/g,
      (_, antes) => antes + gestion
    );
    zip.file(archivo.name, xml);
  });
  return zip;
}
```

Si la plantilla no tiene año en la marca de agua, no hace nada y no rompe nada.

### La fecha

No la escribas fija. Que salga del día en que generás:

```js
const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
               "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

export function fechaLarga(d = new Date()) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
```

---

## 11. Estructura del proyecto

```
informes/
├── public/
│   └── plantillas/
│       ├── tutoria.docx
│       ├── area.docx
│       ├── temas.docx
│       └── nota-necesaria.docx
│
├── src/
│   ├── main.jsx
│   ├── App.jsx                    ← el asistente por pasos
│   │
│   ├── entrada/                   ← de archivo a matriz de celdas
│   │   ├── pegarTabla.js          ← parsea HTML pegado
│   │   ├── leerExcel.js           ← SheetJS
│   │   ├── leerPdf.js             ← pdf.js, texto con coordenadas
│   │   └── decodificador.js       ← el mapa de sustitución
│   │
│   ├── dominio/                   ← lógica pura, sin React
│   │   ├── esquema.js             ← zod
│   │   ├── normalizar.js          ← matriz → notas.json
│   │   ├── reglas.js              ← promedios, aplazados, nota necesaria
│   │   └── validar.js             ← bloqueantes + cruzada + advertencias
│   │
│   ├── informes/                  ← arma el contexto de cada plantilla
│   │   ├── tutoria.js
│   │   ├── area.js
│   │   ├── temas.js
│   │   └── notaNecesaria.js
│   │
│   ├── salida/
│   │   ├── generar.js
│   │   ├── marcaAgua.js
│   │   └── fecha.js
│   │
│   ├── componentes/
│   │   ├── PasoCargar.jsx
│   │   ├── PasoRevisar.jsx        ← tabla editable, corregís errores acá
│   │   ├── PasoValidar.jsx        ← muestra errores y advertencias
│   │   ├── PasoManual.jsx         ← formulario de datos no calculables
│   │   └── PasoDescargar.jsx
│   │
│   └── hooks/
│       └── useDatosManuales.js    ← persiste en localStorage
│
└── package.json
```

**La regla que hace que esto funcione:** `dominio/` no importa nada de React ni de
`pdfjs`. Son funciones puras que reciben datos y devuelven datos. Eso te permite
probarlas sin abrir el navegador, y cambiar de fuente (PDF → CSV → API) sin tocar la
lógica.

### El estado de la app

```jsx
// src/App.jsx
import { useState } from "react";

const PASOS = ["cargar", "revisar", "validar", "manual", "descargar"];

export default function App() {
  const [paso, setPaso]           = useState(0);
  const [curso, setCurso]         = useState(null);   // el notas.json
  const [problemas, setProblemas] = useState({ errores: [], avisos: [] });
  const [manual, setManual]       = useState({});

  const avanzar  = () => setPaso(p => Math.min(p + 1, PASOS.length - 1));
  const retroceder = () => setPaso(p => Math.max(p - 1, 0));

  // ...
}
```

No necesitás más que esto. Cinco piezas de estado, dos funciones.

---

## 12. Orden de trabajo

Cada etapa deja algo que funciona. No pases a la siguiente sin terminar la anterior.

**Etapa 1 — El núcleo (empezá acá).**
`esquema.js` y `reglas.js`, con un `notas.json` escrito a mano con 5 estudiantes.
Comprobá que la nota necesaria da lo mismo que tu PDF de reprobados. Sin React todavía.

**Etapa 2 — Un informe completo.**
Convertí la plantilla de *nota necesaria* en template y generala desde ese JSON de
prueba. Es el informe más simple y el que más tiempo te ahorra. Cuando descargues ese
Word y esté bien, ya tenés el circuito entero probado.

**Etapa 3 — Entrada real.**
`pegarTabla.js` primero. Ahora podés generar el informe con datos de verdad.

**Etapa 4 — Validaciones.**
Bloqueantes y verificación cruzada. Recién acá el sistema es confiable.

**Etapa 5 — Los otros tres informes.**
Más el formulario de datos manuales.

**Etapa 6 — PDF (opcional).**
Solo si el atajo de Chrome no te sirve.

---

## 13. Recomendaciones

**Hacé el paso "revisar" editable.** Después de extraer y antes de validar, mostrá la
tabla de notas en pantalla y dejá que se corrija cualquier celda. Es tu red de
seguridad contra cualquier error de lectura, y cuesta poco código.

**Guardá el `notas.json` de cada trimestre.** Un botón de "descargar datos". Al año
siguiente, cuando alguien pregunte de dónde salió un número, lo tenés.

**Congelá las plantillas.** Cuando dirección apruebe un formato, guardalo con fecha
(`tutoria-2026-03.docx`). Si el año que viene cambia el formato, no perdés el anterior.

**Escribí pruebas para `reglas.js`.** Son diez funciones puras. Con Vitest y quince
casos cubrís todo, incluidos los borde. Es la única parte del sistema donde un error
produce un documento oficial equivocado.

**No metas nombres de estudiantes en el código ni en el repositorio.** Si subís esto a
GitHub, que el `.gitignore` incluya cualquier `.json`, `.csv`, `.pdf` y `.xlsx` de
datos. Poné un `ejemplo.json` con nombres inventados.

### Errores a evitar

- **Guardar promedios en el JSON.** Se desincronizan. Calculalos siempre.
- **Hardcodear las 12 áreas.** Leelas del encabezado.
- **Tratar `null` como `0`.** Un estudiante sin nota no es un estudiante con cero.
- **Generar el Word desde cero con una librería.** Vas a pasar días peleando con el
  formato. Usá tus plantillas.
- **Confiar en el parser sin la verificación cruzada.** Es el error que produce informes
  que parecen bien y están mal.
- **Empezar por la interfaz.** La lógica primero; la UI es la parte fácil.

---

## 14. Privacidad

Esto maneja nombres y calificaciones de menores. Dos reglas simples:

1. **Los datos no salen del navegador.** Sin backend, sin analytics, sin subir nada.
2. **El repositorio no contiene datos reales.** Nunca. Ni de ejemplo, ni "solo para
   probar".

Si algún día agregás el login automático a remdiz, las credenciales van en un `.env`
local que está en `.gitignore`, y ese script corre en tu máquina — nunca en un servidor
compartido ni pegado en un chat.

---

## 15. Nota sobre la sección 5 (cómo se leyó el PDF, al final)

La sección 5 proponía derivar el mapa de sustitución con textos ancla y resolver
los dígitos por aritmética. Se implementó algo más simple y más firme.

El código de cada carácter cambia en cada archivo, pero **el dibujo del glifo no**:
los `CharProcs` de la fuente Type 3 son byte por byte los mismos en todos los
centralizadores que salen de remdiz. Así que el sistema lee esos dibujos
directamente de los bytes del PDF, los identifica por su huella y los busca en
una tabla (`src/entrada/glifos.js`). No hay que adivinar nada por archivo.

Esa tabla se construyó una vez, con anclas y aritmética como decía la sección 5
(`scripts/generarGlifos.mjs`), y se congeló. Si algún día aparece un glifo nuevo,
sale marcado como `¿`, se agrega a `scripts/glifosConocidos.mjs` y se regenera.

Apareció además un problema que la sección 5 no preveía: **pdf.js descarta los
caracteres con código 9 a 13 y 32**, porque los toma por espacios en blanco. En
estos PDF esos códigos son letras, y sin ellas los nombres salen mutilados
("QUISBERT ARROYO" → "QUISBE"). Por eso `src/entrada/pdfCrudo.js` lee también la
secuencia cruda del flujo de contenido y `src/entrada/filas.js` devuelve a su
lugar lo que faltaba, usando el operador de texto del que salió cada carácter
para saber a qué línea pertenece.

La verificación que pedía la sección 5 se mantiene y es la que da confianza: el
100% de las filas de los tres centralizadores de prueba cumple la aritmética que
el propio documento declara (la nota es la suma de sus dimensiones; el promedio,
el promedio de las notas). Si una fila no cuadra, se avisa antes de generar nada.

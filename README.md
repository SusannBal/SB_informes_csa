# Informes trimestrales — Colegio Santa Ana

Genera los cuatro informes trimestrales a partir de los centralizadores de
remdiz, sin copiar números a mano.

```bash
npm install
cp .env.example .env   # completá los dos valores, ver "Acceso" más abajo
npm run dev
```

Todo pasa en el navegador: las notas nunca salen de esta computadora.

## Los cuatro informes

| Informe | Entrada | Qué calcula |
|---|---|---|
| Tutoría | un centralizador del curso | destacados, áreas reprobadas y agrupaciones |
| Área | uno o varios centralizadores por área (`2A.pdf`, `5B.pdf`…) | nómina de estudiantes con dificultades en el área |
| Porcentaje de temas | uno o varios centralizadores | aprobados y reprobados de cada curso |
| Nota necesaria | un centralizador del curso | cuánto necesita cada aplazado en lo que queda |

El trimestre lo elegís vos en el primer paso. El curso de cada archivo se
propone a partir del nombre (`2A.pdf` → 2A) y se puede corregir. El área, la
gestión, la cantidad de estudiantes y las notas salen del PDF: nada se asume.

## Cómo se leen los PDF

Los centralizadores salen de Nitro con fuentes Type 3 sin mapa Unicode: el
código de cada carácter cambia en cada archivo, pero el dibujo del glifo no.
`src/entrada/type3.js` lee esos dibujos de los bytes del PDF y los busca en
`src/entrada/glifos.js`, una tabla de huella → carácter.

pdf.js descarta los caracteres cuyo código cae entre 9 y 13 y el 32 porque los
toma por espacios en blanco; en estos PDF son letras. `src/entrada/pdfCrudo.js`
lee la secuencia real del flujo de contenido y `src/entrada/filas.js` devuelve a
su lugar lo que faltaba.

Todo lo leído se verifica contra la aritmética que declara el propio
centralizador (la nota es la suma de sus dimensiones; el promedio, el promedio
de las notas). Si una fila no cuadra, se avisa antes de generar nada.

```bash
node scripts/probarPdf.mjs ../2A.pdf        # qué se leyó de un PDF
node scripts/probarInformes.mjs ..          # genera los cuatro informes
npx vitest run                              # reglas de calificación
```

Si aparece un glifo nuevo (un carácter que sale como `¿`), se agrega a
`scripts/glifosConocidos.mjs` y se regenera la tabla:

```bash
node scripts/generarGlifos.mjs <carpeta con los PDF>
```

## Las plantillas Word

`public/plantillas/*.docx` son los mismos Word que usa el colegio, con etiquetas
de docxtemplater en lugar del texto variable. Encabezado, logos, marca de agua y
bordes quedan intactos. Para regenerarlas desde los originales:

```bash
python scripts/prepararPlantillas.py <carpeta con los Word>
```

## Acceso (cuenta de prueba)

Mientras no existe el login definitivo (uno por profesor), la app queda detrás
de una única cuenta de prueba en Supabase — **Supabase se usa sólo para esto**:
no hay ninguna tabla, y el generador de informes sigue funcionando exactamente
igual que antes (100% local, nada se sube).

1. En el panel de Supabase: **Authentication → Users → Add user**, con un
   correo y una contraseña. Esa es la cuenta que se comparte con quien tenga
   que entrar a probar.
2. En **Project Settings → API** copiá la **Project URL** y la **clave
   publicable** ("Publishable key" — es la que Supabase dice que es segura de
   exponer en el navegador).
3. Completá `.env` (local) o los *secrets* del repositorio (para el deploy,
   ver abajo) con esos dos valores:

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

Si algún día hace falta revocar el acceso, se borra o se cambia la contraseña
de ese usuario en el mismo panel — no hay que tocar código.

## Desplegar (GitHub Pages, gratis)

El repositorio ya trae el workflow (`.github/workflows/deploy.yml`): cada
`push` a `main` compila el sitio y lo publica en GitHub Pages. Dos pasos
únicos, la primera vez:

1. **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
2. **Settings → Secrets and variables → Actions → New repository secret**,
   una vez por cada valor:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Después de eso, cualquier `push` a `main` despliega solo. La URL queda en
Settings → Pages una vez que corre el primer deploy.

## Privacidad

No hay servidor propio, ni base de datos de informes, ni analytics. El
repositorio no contiene datos reales: `.gitignore` excluye `.pdf`, `.csv`,
`.xlsx`, los `.json` de datos y el `.env` con las claves de Supabase.

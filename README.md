# Informes trimestrales — Colegio Santa Ana

Genera los cuatro informes trimestrales a partir de los centralizadores de
remdiz, sin copiar números a mano.

```bash
npm install
cp .env.example .env   # completá VITE_APP_PASSWORD_HASH, ver "Acceso" más abajo
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

## Acceso (contraseña de prueba)

Mientras no existe el login definitivo (uno por profesor), la app queda detrás
de una única contraseña de prueba — **sin ningún servicio externo**: no hay
Supabase, ni cuentas, ni base de datos de por medio. El generador de informes
sigue funcionando exactamente igual que antes (100% local, nada se sube). La
contraseña se compara por huella SHA-256, así que no queda escrita tal cual en
el código que se publica.

1. Elegí una contraseña y generá su huella:

   ```bash
   node scripts/hashearClave.mjs "la-contraseña-que-elijas"
   ```

2. Completá `.env` (local) o el *secret* del repositorio (para el deploy, ver
   abajo) con esa huella:

   ```
   VITE_APP_PASSWORD_HASH=<lo que imprimió el comando de arriba>
   ```

Para cambiar la contraseña más adelante, se genera una huella nueva y se
reemplaza el valor — no hay que tocar el resto del código.

> Esto **no es seguridad de verdad**: quien tenga algo de conocimiento técnico
> puede saltear esta pantalla mirando el código publicado. Alcanza para que un
> visitante casual no entre; no alcanza para proteger datos sensibles — por
> eso el generador de informes nunca sube nada a ningún lado, con o sin esta
> pantalla.

## Desplegar (Netlify, gratis)

El repositorio ya trae `netlify.toml` con el comando de build (`npm run
build`) y la carpeta a publicar (`dist`), así que Netlify los detecta solo.
Pasos únicos, la primera vez:

1. En [app.netlify.com](https://app.netlify.com): **Add new site → Import an
   existing project → GitHub** y elegí `SusannBal/SB_informes_csa`.
2. Netlify va a proponer el build command y el publish directory ya
   completos (los toma de `netlify.toml`) — no hace falta tocarlos.
3. Antes de desplegar (o después, en **Site configuration → Environment
   variables → Add a variable**): agregá
   - `VITE_APP_PASSWORD_HASH` (la huella del paso anterior).
4. **Deploy site**.

Después de eso, cualquier `push` a `main` despliega solo. La URL la asigna
Netlify (`algo.netlify.app`) y se puede cambiar por una propia desde **Site
configuration → Domain management**.

## Privacidad

No hay servidor propio, ni base de datos, ni analytics, ni ningún servicio
externo (ni siquiera para el acceso). El repositorio no contiene datos reales:
`.gitignore` excluye `.pdf`, `.csv`, `.xlsx`, los `.json` de datos y el `.env`.

# -*- coding: utf-8 -*-
"""
Convierte los cuatro Word oficiales en plantillas de docxtemplater.

Parte de los archivos que usa el colegio y sólo cambia el TEXTO por etiquetas:
encabezado, logos, marca de agua, bordes, tipografías y márgenes quedan intactos
porque nunca se toca esa parte del documento.

    python scripts/prepararPlantillas.py <carpeta con los Word>

Salida: public/plantillas/{tutoria,area,temas,nota-necesaria}.docx
"""
import copy
import os
import sys

from docx import Document

ORIGEN = sys.argv[1] if len(sys.argv) > 1 else ".."
DESTINO = os.path.join("public", "plantillas")


# ---------------------------------------------------------------- utilidades

def poner_texto(parrafo, texto):
    """Reemplaza el texto de un párrafo dejando una sola corrida.

    docxtemplater necesita que cada etiqueta viva entera en una corrida; Word
    parte el texto en cuantas corridas quiera. Conservamos el formato de la
    primera y borramos el resto.
    """
    if not parrafo.runs:
        parrafo.add_run(texto)
        return
    parrafo.runs[0].text = texto
    for run in parrafo.runs[1:]:
        run.text = ""


def celda(fila, i, texto):
    poner_texto(fila.cells[i].paragraphs[0], texto)
    for p in fila.cells[i].paragraphs[1:]:
        poner_texto(p, "")


def escribir_fila(fila, valores):
    """Escribe una fila salteando las celdas combinadas ya escritas.

    En una combinación, python-docx devuelve la misma celda varias veces; si no
    lo tuviéramos en cuenta, el último valor pisaría a los anteriores.
    """
    celdas = fila.cells
    escritas = []
    for i, texto in enumerate(valores):
        if i >= len(celdas):
            break
        if texto is None or any(celdas[i]._tc is tc for tc in escritas):
            continue
        escritas.append(celdas[i]._tc)
        poner_texto(celdas[i].paragraphs[0], texto)
        for extra in celdas[i].paragraphs[1:]:
            poner_texto(extra, "")


def borrar_fila(tabla, fila):
    tabla._tbl.remove(fila._tr)


def dejar_filas(tabla, cuantas):
    """Borra las filas sobrantes; deja las primeras `cuantas`."""
    for fila in list(tabla.rows)[cuantas:]:
        borrar_fila(tabla, fila)


def clonar_fila(tabla, indice):
    tr = copy.deepcopy(tabla.rows[indice]._tr)
    tabla.rows[indice]._tr.addnext(tr)
    return tabla.rows[indice + 1]


def borrar_parrafo(p):
    p._element.getparent().remove(p._element)


def guardar(doc, nombre):
    os.makedirs(DESTINO, exist_ok=True)
    ruta = os.path.join(DESTINO, nombre)
    doc.save(ruta)
    print("escrito", ruta)


# ------------------------------------------------------------------ tutoría

def tutoria():
    doc = Document(os.path.join(ORIGEN, "INFORME TUTORES.docx"))

    for p in doc.paragraphs:
        t = p.text.strip().upper()
        if t.startswith("TUTOR (A)"):
            poner_texto(p, "TUTOR (A):\t{tutor}\t\tCURSO:\t{curso}")
        elif t.startswith("TRIMESTRE"):
            poner_texto(p, "TRIMESTRE:\t{trimestre}\t\tFECHA:\t{fecha}")

    # 0 · destacados por promedio  (encabezado + 1 fila de bucle)
    t0 = doc.tables[0]
    dejar_filas(t0, 2)
    escribir_fila(t0.rows[1], ["{#destacados}{nombre}", "{promedio}{/destacados}"])

    # 1 · destacados por valores (sin encabezado en el original)
    t1 = doc.tables[1]
    dejar_filas(t1, 1)
    escribir_fila(t1.rows[0], ["{#valores}{nombre}", "{valor}{/valores}"])

    # 2 · estudiantes con dificultades: por cada uno, una fila de áreas y otra
    #     de notas. Todos nombrados uno por uno, sin agrupar a nadie en un
    #     resumen tipo "3 estudiantes en 2 áreas" — por eso la fila de
    #     agrupación del Word original se borra directamente.
    #     La celda del nombre está combinada verticalmente entre las dos filas,
    #     así que se escribe una sola vez (por eso `escribir_fila` saltea las
    #     celdas repetidas: en una combinación, python-docx devuelve la misma).
    t2 = doc.tables[2]
    dejar_filas(t2, 3)   # encabezado + fila de áreas + fila de notas
    n = len(t2.columns)
    escribir_fila(t2.rows[1], ["{#dificultades}{nombre}"] + ["{a%d}" % i for i in range(1, n)])
    # la celda del nombre está combinada con la fila de arriba: no se reescribe
    escribir_fila(t2.rows[2], [None] +
                  [("{n%d}" % i) + ("{/dificultades}" if i == n - 1 else "") for i in range(1, n)])

    # 3 · dificultades del curso y estrategias
    t3 = doc.tables[3]
    dejar_filas(t3, 2)
    escribir_fila(t3.rows[1], ["{#estrategias}{dificultad}", "{estrategia}{/estrategias}"])

    guardar(doc, "tutoria.docx")


# --------------------------------------------------------------------- área

def area():
    doc = Document(os.path.join(ORIGEN, "INF. DE ÁREA -TRIMESTRAL CSA.docx"))

    for p in doc.paragraphs:
        t = p.text.strip().upper()
        if t.startswith("PROFESOR"):
            poner_texto(p, "PROFESOR/A\t{profesor}\t\tÁREA:\t{area}")
        elif t.startswith("TRIMESTRE"):
            poner_texto(p, "TRIMESTRE:\t{trimestre}\t\tFECHA:\t{fecha}")

    t0 = doc.tables[0]
    dejar_filas(t0, 2)
    escribir_fila(t0.rows[1], ["{#estudiantes}{nro}", "{nombre}", "{curso}", "{dificultad}{/estudiantes}"])

    t1 = doc.tables[1]
    dejar_filas(t1, 2)
    escribir_fila(t1.rows[1], ["{#estrategias}{dificultad}", "{estrategia}{/estrategias}"])

    guardar(doc, "area.docx")


# -------------------------------------------------------------------- temas

def temas():
    doc = Document(os.path.join(ORIGEN, "% DE TEMAS.docx"))

    # El original trae el informe repetido para dos áreas; dejamos uno solo.
    for tabla in list(doc.tables)[2:]:
        tabla._tbl.getparent().remove(tabla._tbl)

    visto_firma = False
    for p in list(doc.paragraphs):
        t = p.text.strip().upper()
        if visto_firma:
            borrar_parrafo(p)
            continue
        if t.startswith("PROFESOR"):
            poner_texto(p, "PROFESOR/A {profesor}\t\tÁREA: {area}")
        elif t.startswith("TARIJA"):
            poner_texto(p, "Tarija, {fecha}")
        elif "FIRMA PROFESOR" in t:
            visto_firma = True

    t0 = doc.tables[0]
    escribir_fila(t0.rows[0], ["GRADO", "N° TEMAS PROGRAMADOS / {trimestreCorto} TRIM", "N° TEMAS AVANZADOS", "%"])
    dejar_filas(t0, 2)
    escribir_fila(t0.rows[1], ["{#grados}{grado}", "{programados}", "{avanzados}", "{porcentaje}{/grados}"])

    t1 = doc.tables[1]
    dejar_filas(t1, 2)
    escribir_fila(t1.rows[1], ["{#cursos}{curso}", "{aprobados}", "{porcentajeAprobados}", "{reprobados}", "{porcentajeReprobados}{/cursos}"])

    guardar(doc, "temas.docx")


# ----------------------------------------------------------- nota necesaria

def nota_necesaria():
    doc = Document(os.path.join(ORIGEN, "Reprobados_Trim3.docx"))

    parrafos = [p for p in doc.paragraphs if p.text.strip()]
    if parrafos:
        poner_texto(parrafos[0], "{colegio} — {cursoLargo}")
    if len(parrafos) > 1:
        poner_texto(
            parrafos[1],
            "Materias en riesgo y nota necesaria en {trimestreDestino} "
            "para aprobar la materia (mínimo 51 de promedio anual). "
            "{curso} · {trimestre} trimestre · {fecha}",
        )

    t0 = doc.tables[0]
    escribir_fila(t0.rows[0], ["Nro.", "ESTUDIANTE", "{tituloT1}", "{tituloT2}", "{tituloNecesaria}"])
    dejar_filas(t0, 2)
    escribir_fila(t0.rows[1], ["{#filas}{nro}", "{nombre}", "{areaT1}", "{t2}", "{necesaria}{/filas}"])

    guardar(doc, "nota-necesaria.docx")


tutoria()
area()
temas()
nota_necesaria()

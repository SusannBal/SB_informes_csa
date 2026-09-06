import { describe, it, expect } from "vitest";
import { compararCursos, detectarArea } from "./areas";

describe("compararCursos", () => {
  it("ordena por grado y después por letra", () => {
    const cursos = ["3B", "1A", "2A", "3A", "1B", "6A"];
    expect([...cursos].sort(compararCursos)).toEqual(["1A", "1B", "2A", "3A", "3B", "6A"]);
  });

  it("no ordena alfabéticamente cuando hay dos dígitos", () => {
    // Con localeCompare puro, "10A" quedaría antes que "2A". Acá no.
    expect([...["10A", "2A"]].sort(compararCursos)).toEqual(["2A", "10A"]);
  });

  it("ignora la S que antepone remdiz", () => {
    expect(compararCursos("S4A", "4A")).toBe(0);
  });

  it("manda al final lo que no se parece a un curso", () => {
    expect([...["2A", ""]].sort(compararCursos)).toEqual(["2A", ""]);
  });
});

describe("detectarArea", () => {
  it("encuentra el área en un encabezado de varias líneas, no sólo en una fila exacta", () => {
    const encabezado = "UNIDAD EDUCATIVA\nCURSO (3A)\nAREA   LENGUA EXTRANJERA\nTUTOR ...";
    expect(detectarArea(encabezado)?.codigo).toBe("LEX");
  });

  it("también reconoce la etiqueta MATERIA", () => {
    expect(detectarArea("MATERIA: MATEMATICA")?.codigo).toBe("MAT");
  });

  it("no rompe si la línea del área se mezcló con la de al lado", () => {
    // Caso real que fallaba: la fila "AREA" se pegó al texto de otro campo.
    const encabezado = "CURSO (5A) AREA CIENCIAS SOCIALES TRIMESTRE SEGUNDO";
    expect(detectarArea(encabezado)?.codigo).toBe("CSO");
  });
});

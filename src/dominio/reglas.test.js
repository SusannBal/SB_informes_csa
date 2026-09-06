import { describe, it, expect } from "vitest";
import {
  promedioAnual, apruebaArea, notaNecesaria, areasReprobadas,
  destacados, promedioDelTrimestre, resumenDelCurso,
} from "./reglas";

describe("promedio anual", () => {
  it("cuenta como 0 el trimestre que falta", () => {
    expect(promedioAnual({ t1: 50, t2: 60, t3: 70 })).toBe(60);
    expect(promedioAnual({ t1: 50, t2: 60, t3: null })).toBe(110 / 3);
    expect(promedioAnual({ t1: null, t2: null, t3: null })).toBe(0);
  });

  it("aprueba el área con 51 de promedio anual", () => {
    expect(apruebaArea({ t1: 51, t2: 51, t3: 51 })).toBe(true);
    expect(apruebaArea({ t1: 50, t2: 50, t3: 50 })).toBe(false);
    expect(apruebaArea({ t1: 100, t2: 53, t3: 0 })).toBe(true); // 153/3
  });
});

describe("nota necesaria", () => {
  it("con un solo trimestre por delante", () => {
    expect(notaNecesaria({ t1: 51, t2: 51 }, 2).necesaria).toBe(51);
    expect(notaNecesaria({ t1: 100, t2: 100 }, 2).necesaria).toBe(0);
    expect(notaNecesaria({ t1: 30, t2: 35 }, 2))
      .toEqual({ necesaria: 88, alcanzable: true, restantes: 1 });
  });

  it("marca como inalcanzable lo que pasa de 100", () => {
    expect(notaNecesaria({ t1: 20, t2: 25 }, 2))
      .toEqual({ necesaria: 108, alcanzable: false, restantes: 1 });
  });

  it("con dos trimestres por delante reparte lo que falta", () => {
    expect(notaNecesaria({ t1: 51 }, 1))
      .toEqual({ necesaria: 51, alcanzable: true, restantes: 2 });
    expect(notaNecesaria({ t1: 30 }, 1))
      .toEqual({ necesaria: 62, alcanzable: true, restantes: 2 });
  });

  it("en el tercer trimestre ya no queda nada por delante", () => {
    expect(notaNecesaria({ t1: 40, t2: 40, t3: 40 }, 3).necesaria).toBe(null);
  });
});

describe("áreas reprobadas del trimestre", () => {
  const estudiante = {
    notas: {
      MAT: { t1: 30, t2: 51, t3: 60 },
      FIS: { t1: 55, t2: 40, t3: 50 },
      QMC: { t1: null, t2: null, t3: null },
    },
  };

  it("mira la nota del trimestre, no el promedio anual", () => {
    expect(areasReprobadas(estudiante, 1)).toEqual([{ area: "MAT", nota: 30 }]);
    expect(areasReprobadas(estudiante, 2)).toEqual([{ area: "FIS", nota: 40 }]);
    expect(areasReprobadas(estudiante, 3)).toEqual([{ area: "FIS", nota: 50 }]);
  });

  it("no cuenta como reprobada un área sin nota", () => {
    expect(areasReprobadas(estudiante, 1).some(a => a.area === "QMC")).toBe(false);
  });

  it("no reprueba a nadie por tener el tercer trimestre vacío", () => {
    // El caso que rompía el informe: notas normales en el segundo trimestre y
    // el tercero todavía sin cargar. El promedio anual da menos de 51 en todas
    // las áreas, pero ninguna está reprobada en el trimestre.
    const enCurso = {
      notas: {
        CYL: { t1: 45, t2: 56, t3: null },
        LEX: { t1: 51, t2: 95, t3: null },
        MAT: { t1: 76, t2: 67, t3: null },
      },
    };
    expect(areasReprobadas(enCurso, 2)).toEqual([]);
    expect(Object.values(enCurso.notas).every(n => !apruebaArea(n))).toBe(true);
  });
});

describe("promedios y destacados", () => {
  const estudiantes = [
    { nombre: "A", notas: { MAT: { t1: 50, t2: 50, t3: 50 } } },
    { nombre: "B", notas: { MAT: { t1: 100, t2: 100, t3: 100 } } },
    { nombre: "C", notas: { MAT: { t1: 80, t2: 80, t3: 80 } } },
    { nombre: "D", notas: { MAT: { t1: 90, t2: 90, t3: 90 } } },
  ];

  it("promedia sólo las áreas con nota en el trimestre", () => {
    const est = { notas: { MAT: { t1: 60, t2: null, t3: null }, FIS: { t1: 80, t2: null, t3: null } } };
    expect(promedioDelTrimestre(est, 1)).toBe(70);
    expect(promedioDelTrimestre(est, 2)).toBe(null);
  });

  it("ordena los destacados por el promedio del trimestre", () => {
    const top = destacados(estudiantes, 1, 3);
    expect(top.map(e => e.nombre)).toEqual(["B", "D", "C"]);
  });

  it("ante un empate en el último puesto muestra a todos los empatados", () => {
    const conEmpate = [...estudiantes, { nombre: "E", notas: { MAT: { t1: 80, t2: 0, t3: 0 } } }];
    const top = destacados(conEmpate, 1, 3);
    expect(top.map(e => e.nombre)).toEqual(["B", "D", "C", "E"]);
  });
});

describe("resumen del curso", () => {
  it("deja afuera a quien no tiene ninguna nota en el trimestre", () => {
    const curso = [
      { notas: { MAT: { t1: 60, t2: null, t3: null } } },
      { notas: { MAT: { t1: 40, t2: null, t3: null } } },
      { notas: { MAT: { t1: null, t2: null, t3: null } } },
    ];
    expect(resumenDelCurso(curso, 1)).toMatchObject({
      total: 2, aprobados: 1, reprobados: 1, sinDatos: 1,
      porcentajeAprobados: 50, porcentajeReprobados: 50,
    });
  });
});

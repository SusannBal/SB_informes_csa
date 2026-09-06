const INFORMES = [
  {
    id: "tutoria",
    titulo: "Informe de tutoría",
    texto: "Destacados, estudiantes con dificultades y agrupaciones del curso a cargo. Un centralizador.",
  },
  {
    id: "area",
    titulo: "Informe de área",
    texto: "Nómina consolidada de dificultades en tu área. Varios centralizadores: 2A.pdf, 3A.pdf, 5B.pdf…",
  },
  {
    id: "temas",
    titulo: "Porcentaje de temas avanzados",
    texto: "Temas programados y avanzados por grado, más aprobados y reprobados de cada curso cargado.",
  },
  {
    id: "nota",
    titulo: "Nota necesaria para aprobar",
    texto: "Cuánto necesita cada aplazado en lo que queda del año. Sólo 1er y 2do trimestre.",
  },
];

export default function Dashboard({ alElegir }) {
  return (
    <div className="dashboard-grid">
      {INFORMES.map(inf => (
        <button key={inf.id} className="dashboard-card" onClick={() => alElegir(inf.id)}>
          <h2>{inf.titulo}</h2>
          <p>{inf.texto}</p>
          <span className="enlace">Empezar →</span>
        </button>
      ))}
    </div>
  );
}

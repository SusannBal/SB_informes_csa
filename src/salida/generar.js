import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { actualizarMarcaAgua } from "./marcaAgua";

/**
 * Rellena una de las plantillas oficiales y la descarga.
 *
 * Las plantillas son los mismos .docx que usa el colegio, con etiquetas en
 * lugar del texto variable: encabezado, logos, marca de agua y bordes salen
 * intactos porque docxtemplater no los toca.
 */
export async function generar(rutaPlantilla, datos, nombreSalida) {
  const respuesta = await fetch(rutaPlantilla);
  if (!respuesta.ok) {
    throw new Error(`No se encontró la plantilla ${rutaPlantilla}.`);
  }
  const zip = new PizZip(await respuesta.arrayBuffer());

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });

  try {
    doc.render(datos);
  } catch (e) {
    const detalle = e.properties?.errors
      ?.map(x => x.properties?.explanation)
      .filter(Boolean)
      .join("; ");
    throw new Error(detalle ? `La plantilla tiene un problema: ${detalle}` : e.message);
  }

  actualizarMarcaAgua(doc.getZip(), datos?.gestion);

  const salida = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  saveAs(salida, nombreSalida);
}

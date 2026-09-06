export function actualizarMarcaAgua(zip, gestion) {
  const anio = String(gestion || new Date().getFullYear());

  // 1. Revisar todos los headers
  zip.file(/word\/header\d*\.xml/).forEach(archivo => {
    let xml = archivo.asText();
    if (/(<v:textpath[^>]*string="[^"]*?)\b(19|20)\d{2}\b/.test(xml)) {
      xml = xml.replace(
        /(<v:textpath[^>]*string="[^"]*?)\b(19|20)\d{2}\b/g,
        (_, antes) => antes + anio
      );
    } else {
      xml = xml.replace(
        /(<v:textpath[^>]*string=")([^"]*?)(")/g,
        (_, antes, txt, cierre) => `${antes}${txt.trim()} ${anio}${cierre}`
      );
    }
    zip.file(archivo.name, xml);
  });

  // 2. Revisar si hay textpath en document.xml
  if (zip.file("word/document.xml")) {
    let docXml = zip.file("word/document.xml").asText();
    if (/(<v:textpath[^>]*string="[^"]*?)\b(19|20)\d{2}\b/.test(docXml)) {
      docXml = docXml.replace(
        /(<v:textpath[^>]*string="[^"]*?)\b(19|20)\d{2}\b/g,
        (_, antes) => antes + anio
      );
      zip.file("word/document.xml", docXml);
    }
  }

  return zip;
}


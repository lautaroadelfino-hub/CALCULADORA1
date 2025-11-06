function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);

  // Detecta delimitador automáticamente: ; o ,
  const delimiter = text.includes(";") ? ";" : ",";

  return lines.map(line => line.split(delimiter).map(cell => cell.trim()));
}

function normMes(value) {
  const raw = String(value || "").trim();
  const parts = raw.replace("/", "-").split("-");
  if (parts.length < 2) return raw;
  return `${parts[0].padStart(4, "0")}-${parts[1].padStart(2, "0")}`;
}

function toNumber(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  s = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function loadEscalasComercio() {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";

  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCSV(text);

  if (rows.length < 2) return {};

  const headers = rows.shift().map(h => h.toLowerCase());

  const idxMes = headers.findIndex(h => h.includes("mes"));
  const idxCat = headers.findIndex(h => h.includes("cat"));
  const idxBas = headers.findIndex(h => h.includes("bas"));
  const idxNRF = headers.findIndex(h => h.includes("no") && h.includes("rem"));

  if (idxMes === -1 || idxCat === -1 || idxBas === -1) {
    console.warn("⚠ No se encontraron columnas esperadas en la hoja.");
    console.warn("Encabezados encontrados:", headers);
    return {};
  }

  const escalas = {};

  for (const row of rows) {
    const mes = normMes(row[idxMes]);
    const cat = row[idxCat];
    const bas = toNumber(row[idxBas]);
    const nrf = idxNRF >= 0 ? toNumber(row[idxNRF]) : 0;

    if (!mes || !cat) continue;

    if (!escalas[mes]) {
      escalas[mes] = { categoria: {}, sumas_no_remunerativas_fijas: 0 };
    }

    escalas[mes].categoria[cat] = bas;
    if (nrf > 0) escalas[mes].sumas_no_remunerativas_fijas = nrf;
  }

  console.log("✅ Escalas Comercio cargadas:", escalas);
  return escalas;
}

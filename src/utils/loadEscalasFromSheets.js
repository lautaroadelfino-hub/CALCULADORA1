function parseCSV(text) {
  const delimiter = text.includes(";") ? ";" : ",";
  return text.trim().split(/\r?\n/).map(line => line.split(delimiter).map(v => v.trim()));
}

function normMes(v) {
  const [y, m] = String(v).replace("/", "-").split("-");
  return `${y.padStart(4,"0")}-${m.padStart(2,"0")}`;
}

function toNumber(v) {
  return Number(String(v).replace(/\./g, "").replace(/,/g, ".")) || 0;
}

export async function loadEscalasFromSheets() {
  const url = "TU_CSV_PUBLICO_AQUÍ";
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCSV(text);

  const headers = rows.shift().map(v => v.toLowerCase());

  const idxConv = headers.findIndex(h => h.includes("convenio"));
  const idxMes  = headers.findIndex(h => h.includes("mes"));
  const idxCat  = headers.findIndex(h => h.includes("cat"));
  const idxBas  = headers.findIndex(h => h.includes("bas"));
  const idxNRF  = headers.findIndex(h => h.includes("no") && h.includes("rem"));

  const result = {};

  for (const r of rows) {
    const conv = r[idxConv];
    const mes = normMes(r[idxMes]);
    const cat = r[idxCat];
    const bas = toNumber(r[idxBas]);
    const nrf = idxNRF >= 0 ? toNumber(r[idxNRF]) : 0;

    if (!conv || !mes || !cat) continue;

    if (!result[conv]) result[conv] = {};
    if (!result[conv][mes]) result[conv][mes] = { categoria: {}, sumas_no_remunerativas_fijas: 0 };

    result[conv][mes].categoria[cat] = bas;
    if (nrf > 0) result[conv][mes].sumas_no_remunerativas_fijas = nrf;
  }

  console.log("✅ Escalas cargadas:", result);
  return result;
}

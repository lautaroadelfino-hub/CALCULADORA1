// src/utils/loadEscalasComercio.js
function normMes(value) {
  if (!value) return "";
  const raw = String(value).trim();
  // Soportar "2025-1", "2025/1", "2025-01", etc.
  const parts = raw.replace("/", "-").split("-");
  if (parts.length < 2) return raw;
  const y = parts[0].padStart(4, "0");
  const m = parts[1].padStart(2, "0");
  return `${y}-${m}`;
}

function toNumber(v) {
  if (v == null) return 0;
  let s = String(v).trim();
  // Quitar separadores miles y normalizar decimal
  // "1.234.567,89" -> "1234567.89"
  s = s.replace(/\./g, "");
  s = s.replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function loadEscalasComercio() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";

  const res = await fetch(url);
  const text = await res.text();

  const rows = text.trim().split(/\r?\n/).map((r) => r.split(","));
  if (rows.length < 2) return {};

  // Encabezados case-insensitive
  const headers = rows.shift().map((h) => String(h).trim().toLowerCase());

  // Intentar mapear posibles nombres de columnas
  const idxMes = headers.findIndex((h) => ["mes", "month"].includes(h));
  const idxCat = headers.findIndex((h) => ["categoria", "categoría", "category"].includes(h));
  const idxBas = headers.findIndex((h) => ["basico", "básico", "basico$"].includes(h)); // flexible
  const idxNRF = headers.findIndex((h) =>
    ["no_rem_fijo", "no remunerativo fijo", "noremfijo", "sumas_no_remunerativas_fijas"].includes(h)
  );

  if (idxMes === -1 || idxCat === -1 || idxBas === -1) {
    // Si no encuentra columnas críticas, devolvemos vacío
    return {};
  }

  const escalas = {};

  for (const row of rows) {
    const mesRaw = row[idxMes]?.trim();
    const catRaw = row[idxCat]?.trim();
    const basRaw = row[idxBas];
    const nrfRaw = idxNRF >= 0 ? row[idxNRF] : null;

    if (!mesRaw || !catRaw) continue;

    const mes = normMes(mesRaw);
    const cat = String(catRaw).trim();
    const basico = toNumber(basRaw);
    const nrf = toNumber(nrfRaw);

    if (!escalas[mes]) {
      escalas[mes] = { categoria: {}, sumas_no_remunerativas_fijas: 0 };
    }

    escalas[mes].categoria[cat] = basico;
    // Si tu CSV trae un único valor de no remunerativo fijo por mes, guardamos el último no nulo
    if (nrf) escalas[mes].sumas_no_remunerativas_fijas = nrf;
  }

  return escalas;
}

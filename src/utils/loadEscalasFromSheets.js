export async function loadEscalasFromSheets() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";

  const res = await fetch(url);
  const csv = await res.text();

  const rows = csv.split("\n").map(r => r.trim()).filter(r => r.length > 0);
  const header = rows.shift().split(",");

  const data = rows.map(r => {
    const cols = r.split(",");
    const obj = {};
    header.forEach((h, i) => {
      obj[h.trim()] = cols[i]?.trim() ?? "";
    });
    return obj;
  });

  const escalas = {};

  for (const row of data) {
    const mes = row.Mes;
    const categoria = row.Categoria;
    const basico = Number(row.Básico || row.Basico || 0);
    const noRem = Number(row.NoRemunerativo || 0);

    if (!escalas[mes]) escalas[mes] = { categoria: {}, sumas_no_remunerativas_fijas: noRem };
    escalas[mes].categoria[categoria] = basico;
  }

  return escalas;
}

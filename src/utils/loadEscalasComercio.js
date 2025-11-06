export async function loadEscalasComercio() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";

  const res = await fetch(url);
  const text = await res.text();

  const rows = text.trim().split("\n").map((r) => r.split(","));

  // Asumimos encabezado: Mes, Categoria, Basico, ...
  const header = rows.shift();

  const idxMes = header.indexOf("Mes");
  const idxCat = header.indexOf("Categoria");
  const idxBas = header.indexOf("Basico");

  const escalas = {};

  for (const row of rows) {
    const mes = row[idxMes];
    const cat = row[idxCat];
    const bas = Number(row[idxBas]) || 0;

    if (!escalas[mes]) escalas[mes] = { categoria: {} };
    escalas[mes].categoria[cat] = bas;
  }

  return escalas;
}

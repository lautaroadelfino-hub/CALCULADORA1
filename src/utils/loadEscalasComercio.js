export async function loadEscalasComercio() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";

  const res = await fetch(url);
  const csv = await res.text();

  const filas = csv.trim().split("\n").map(r => r.split(","));
  const encabezados = filas.shift().map(h => h.trim());

  const idxMes = encabezados.indexOf("mes");
  const idxCat = encabezados.indexOf("categoria");
  const idxBas = encabezados.indexOf("basico");
  const idxNRF = encabezados.indexOf("no_rem_fijo");

  const escalas = {};

  for (const fila of filas) {
    const mes = fila[idxMes]?.trim();
    const cat = fila[idxCat]?.trim();
    const basico = Number(fila[idxBas]);
    const nrFijo = Number(fila[idxNRF]);

    if (!mes || !cat) continue;

    if (!escalas[mes]) escalas[mes] = { categoria: {}, sumas_no_remunerativas_fijas: nrFijo };

    escalas[mes].categoria[cat] = basico;
  }

  return escalas;
}

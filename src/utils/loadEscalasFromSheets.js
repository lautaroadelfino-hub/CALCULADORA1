 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/utils/loadEscalasFromSheets.js b/src/utils/loadEscalasFromSheets.js
index 04375b6f8ab8e9384beef1103a0b2ca6ce731686..4bb6def8d9cc364b26197e92c19b9683cff3def9 100644
--- a/src/utils/loadEscalasFromSheets.js
+++ b/src/utils/loadEscalasFromSheets.js
@@ -1,32 +1,91 @@
+function parseNumber(value) {
+  if (value === undefined || value === null) return NaN;
+  const normalizado = String(value).replace(/\s+/g, "").replace(/\./g, "").replace(",", ".");
+  if (normalizado === "") return NaN;
+  const numero = Number(normalizado);
+  return Number.isFinite(numero) ? numero : NaN;
+}
+
+function pickValue(obj, claves) {
+  for (const clave of claves) {
+    if (obj[clave] !== undefined && obj[clave] !== "") {
+      return obj[clave];
+    }
+  }
+  return "";
+}
+
 export async function loadEscalasFromSheets() {
-  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";
+  const url =
+    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQYdjr9D_QIKi5Jtpo7MEkndYO9pNd0KqaFdLJkJ8UM5leafD7HMZjtg3G2K6-lZVaDts1JGhBPdNI/pub?gid=0&single=true&output=csv";
+
+  try {
+    const res = await fetch(url);
+    if (!res.ok) {
+      return { ok: false, error: `Error HTTP ${res.status}` };
+    }
+
+    const csv = await res.text();
+    if (!csv.trim()) {
+      return { ok: true, escalas: {}, vacio: true };
+    }
+
+    const rows = csv
+      .split(/\r?\n/)
+      .map((r) => r.trim())
+      .filter((r) => r.length > 0);
 
-  const res = await fetch(url);
-  const csv = await res.text();
+    if (rows.length === 0) {
+      return { ok: true, escalas: {}, vacio: true };
+    }
 
-  const rows = csv.split("\n").map(r => r.trim()).filter(r => r.length > 0);
-  const header = rows.shift().split(",");
+    const header = rows.shift()?.split(",") ?? [];
+    if (header.length === 0) {
+      return { ok: false, error: "Formato de CSV inválido: falta encabezado." };
+    }
 
-  const data = rows.map(r => {
-    const cols = r.split(",");
-    const obj = {};
-    header.forEach((h, i) => {
-      obj[h.trim()] = cols[i]?.trim() ?? "";
+    const data = rows.map((r) => {
+      const cols = r.split(",");
+      const obj = {};
+      header.forEach((h, i) => {
+        obj[h.trim()] = cols[i]?.trim() ?? "";
+      });
+      return obj;
     });
-    return obj;
-  });
 
-  const escalas = {};
+    const escalas = {};
 
-  for (const row of data) {
-    const mes = row.Mes;
-    const categoria = row.Categoria;
-    const basico = Number(row.Básico || row.Basico || 0);
-    const noRem = Number(row.NoRemunerativo || 0);
+    for (const row of data) {
+      const mes = pickValue(row, ["Mes", "mes", "MES"]);
+      const categoria = pickValue(row, ["Categoria", "Categoría", "categoria", "CATEGORIA"]);
 
-    if (!escalas[mes]) escalas[mes] = { categoria: {}, sumas_no_remunerativas_fijas: noRem };
-    escalas[mes].categoria[categoria] = basico;
-  }
+      if (!mes || !categoria) continue;
+
+      const basicoValor = parseNumber(
+        pickValue(row, ["Básico", "Basico", "basico", "BASICO"])
+      );
+      const noRemValor = parseNumber(
+        pickValue(row, ["NoRemunerativo", "No Remunerativo", "No remunerativo", "noRemunerativo"])
+      );
+
+      const entrada = escalas[mes] ?? {
+        categoria: {},
+        sumas_no_remunerativas_fijas: 0,
+      };
+
+      entrada.categoria[categoria] = Number.isFinite(basicoValor) ? basicoValor : 0;
 
-  return escalas;
+      if (Number.isFinite(noRemValor)) {
+        entrada.sumas_no_remunerativas_fijas = noRemValor;
+      } else if (entrada.sumas_no_remunerativas_fijas === undefined) {
+        entrada.sumas_no_remunerativas_fijas = 0;
+      }
+
+      escalas[mes] = entrada;
+    }
+
+    return { ok: true, escalas, vacio: Object.keys(escalas).length === 0 };
+  } catch (error) {
+    return { ok: false, error: error?.message || "No se pudo descargar el CSV de escalas." };
+  }
 }
 
EOF
)

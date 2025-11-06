 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/hooks/useCalculosSueldo.js b/src/hooks/useCalculosSueldo.js
new file mode 100644
index 0000000000000000000000000000000000000000..9866ecf8e5ad4a84de9553e0648e205b9240b8f6
--- /dev/null
+++ b/src/hooks/useCalculosSueldo.js
@@ -0,0 +1,261 @@
+import { useMemo } from "react";
+
+const HORAS_SEMANALES = {
+  "35": 35,
+  "40": 40,
+  "48": 48,
+};
+
+const TITULO_PORCENTAJES = {
+  ninguno: 0,
+  terciario: 0.15,
+  universitario: 0.2,
+};
+
+const clamp = (value, min = 0, max = Number.POSITIVE_INFINITY) =>
+  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
+
+const valorHora = (base, horasSem) => (horasSem > 0 ? base / (horasSem * 4.33) : 0);
+
+const toNumber = (value) => (Number.isFinite(value) ? value : 0);
+
+export function useCalculosSueldo({
+  sector,
+  datosConvenio,
+  mes,
+  categoria,
+  regimen,
+  aniosAntiguedad,
+  titulo,
+  funcion,
+  horas50,
+  horas100,
+  descuentosExtras,
+  noRemunerativo,
+}) {
+  return useMemo(() => {
+    if (!datosConvenio) {
+      return createResultadoVacio();
+    }
+
+    const safeAntiguedad = clamp(Number(aniosAntiguedad) || 0);
+    const safeFuncion = clamp(Number(funcion) || 0, 0, 100);
+    const safeHoras50 = clamp(Number(horas50) || 0, 0);
+    const safeHoras100 = clamp(Number(horas100) || 0, 0);
+    const extras = clamp(Number(descuentosExtras) || 0, 0);
+    const adicionalNR = clamp(Number(noRemunerativo) || 0, 0);
+
+    let basico = 0;
+    let adicionalHorario = 0;
+    let antiguedadPesos = 0;
+    let presentismoPesos = 0;
+    let adicionalTitulo = 0;
+    let adicionalFuncion = 0;
+    let horasExtras50 = 0;
+    let horasExtras100 = 0;
+    let totalRemunerativo = 0;
+    let totalNoRemunerativo = 0;
+    let noRemuFijo = 0;
+    let valorHoraReferencia = 0;
+    let valorHoraExtras = 0;
+    let infoAntiguedad = "";
+    let infoPresentismo = "";
+    let deducciones = [];
+
+    if (sector === "publico") {
+      const escala = datosConvenio?.escalas?.[mes] || {};
+      const categorias = escala?.categoria || {};
+      basico = clamp(Number(categorias?.[categoria]) || 0, 0);
+
+      const plus = clamp(Number(escala?.plusHorarios?.[regimen]) || 0, 0);
+      adicionalHorario = basico * plus;
+
+      const antPct = clamp(Number(escala?.antiguedad_porcentaje) || 0.02, 0, 1);
+      antiguedadPesos = basico * antPct * safeAntiguedad;
+      infoAntiguedad = `${(antPct * 100).toFixed(2)}% por año`;
+
+      const presentismoFijo = clamp(Number(escala?.presentismo_fijo) || 0, 0);
+      const esCargoPolitico = (escala?.cargosPoliticos || [])
+        .map(String)
+        .includes(String(categoria));
+      presentismoPesos = esCargoPolitico ? 0 : presentismoFijo;
+      infoPresentismo = esCargoPolitico
+        ? "La categoría figura como cargo político y no percibe presentismo"
+        : "Valor fijo provisto por la escala";
+
+      adicionalTitulo = basico * (TITULO_PORCENTAJES[titulo] || 0);
+      adicionalFuncion = basico * (safeFuncion / 100);
+
+      const horasSem = HORAS_SEMANALES[regimen] || HORAS_SEMANALES["35"];
+      valorHoraReferencia = valorHora(basico, horasSem);
+      valorHoraExtras = valorHora(basico + adicionalHorario, horasSem);
+      horasExtras50 = valorHoraExtras * 1.5 * safeHoras50;
+      horasExtras100 = valorHoraExtras * 2 * safeHoras100;
+
+      totalRemunerativo =
+        basico +
+        adicionalHorario +
+        antiguedadPesos +
+        presentismoPesos +
+        adicionalTitulo +
+        adicionalFuncion +
+        horasExtras50 +
+        horasExtras100;
+
+      totalNoRemunerativo = adicionalNR;
+
+      deducciones = [
+        {
+          key: "ips",
+          label: "IPS",
+          porcentaje: 0.14,
+          valor: totalRemunerativo * 0.14,
+        },
+        {
+          key: "ioma",
+          label: "IOMA",
+          porcentaje: 0.048,
+          valor: totalRemunerativo * 0.048,
+        },
+      ];
+    } else {
+      const escala = datosConvenio?.escalas?.[mes] || {};
+      const categorias = escala?.categoria || {};
+      basico = clamp(Number(categorias?.[categoria]) || 0, 0);
+
+      noRemuFijo = clamp(Number(escala?.sumas_no_remunerativas_fijas) || 0, 0);
+
+      antiguedadPesos = (basico + noRemuFijo) * safeAntiguedad * 0.01;
+      infoAntiguedad = "1% anual sobre (básico + NR fijo)";
+
+      presentismoPesos = (basico + antiguedadPesos + noRemuFijo) / 12;
+      infoPresentismo = "Equivale a un doceavo del subtotal sin presentismo";
+
+      adicionalTitulo = basico * (TITULO_PORCENTAJES[titulo] || 0);
+      adicionalFuncion = basico * (safeFuncion / 100);
+
+      valorHoraReferencia = valorHora(basico, HORAS_SEMANALES["48"]);
+      valorHoraExtras = valorHora(basico, HORAS_SEMANALES["48"]);
+      horasExtras50 = valorHoraExtras * 1.5 * safeHoras50;
+      horasExtras100 = valorHoraExtras * 2 * safeHoras100;
+
+      totalRemunerativo =
+        basico +
+        antiguedadPesos +
+        presentismoPesos +
+        adicionalTitulo +
+        adicionalFuncion +
+        horasExtras50 +
+        horasExtras100;
+
+      totalNoRemunerativo = noRemuFijo + adicionalNR;
+
+      deducciones = [
+        {
+          key: "jubilacion",
+          label: "Jubilación",
+          porcentaje: 0.11,
+          valor: totalRemunerativo * 0.11,
+        },
+        {
+          key: "obraSocial",
+          label: "Obra social",
+          porcentaje: 0.03,
+          valor: totalRemunerativo * 0.03,
+        },
+        {
+          key: "faecys",
+          label: "FAECYS",
+          porcentaje: 0.02,
+          valor: totalRemunerativo * 0.02,
+        },
+      ];
+    }
+
+    const deduccionesItems = extras > 0
+      ? [
+          ...deducciones,
+          {
+            key: "extras",
+            label: "Otros descuentos",
+            porcentaje: null,
+            valor: extras,
+          },
+        ]
+      : deducciones;
+
+    const deduccionesTotales = deduccionesItems
+      .map((item) => toNumber(item.valor))
+      .reduce((acc, valor) => acc + valor, 0);
+
+    const liquido = totalRemunerativo + totalNoRemunerativo - deduccionesTotales;
+
+    return {
+      basico,
+      adicionalHorario,
+      antiguedadPesos,
+      presentismoPesos,
+      adicionalTitulo,
+      adicionalFuncion,
+      horasExtras50,
+      horasExtras100,
+      totalRemunerativo,
+      totalNoRemunerativo,
+      liquido,
+      deducciones: deduccionesItems,
+      deduccionesTotales,
+      noRemuFijo,
+      valorHoraReferencia,
+      valorHoraExtras,
+      infoAntiguedad,
+      infoPresentismo,
+      extrasIngresados: extras,
+    };
+  }, [
+    sector,
+    datosConvenio,
+    mes,
+    categoria,
+    regimen,
+    aniosAntiguedad,
+    titulo,
+    funcion,
+    horas50,
+    horas100,
+    descuentosExtras,
+    noRemunerativo,
+  ]);
+}
+
+function createResultadoVacio() {
+  return {
+    basico: 0,
+    adicionalHorario: 0,
+    antiguedadPesos: 0,
+    presentismoPesos: 0,
+    adicionalTitulo: 0,
+    adicionalFuncion: 0,
+    horasExtras50: 0,
+    horasExtras100: 0,
+    totalRemunerativo: 0,
+    totalNoRemunerativo: 0,
+    liquido: 0,
+    deducciones: [],
+    deduccionesTotales: 0,
+    noRemuFijo: 0,
+    valorHoraReferencia: 0,
+    valorHoraExtras: 0,
+    infoAntiguedad: "",
+    infoPresentismo: "",
+    extrasIngresados: 0,
+  };
+}
+
+export function moneyFormatter() {
+  return new Intl.NumberFormat("es-AR", {
+    style: "currency",
+    currency: "ARS",
+    minimumFractionDigits: 2,
+    maximumFractionDigits: 2,
+  });
+}
 
EOF
)

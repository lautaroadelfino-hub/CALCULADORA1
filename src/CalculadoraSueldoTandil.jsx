 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/CalculadoraSueldoTandil.jsx b/src/CalculadoraSueldoTandil.jsx
index 2410e19ce55cff660fb2d8bcc7e2fc3cea4bbe9b..f4e9dbd51f521905b073a6bf9b9b09b7fb8b5cfa 100644
--- a/src/CalculadoraSueldoTandil.jsx
+++ b/src/CalculadoraSueldoTandil.jsx
@@ -1,252 +1,240 @@
-import React, { useState, useMemo, useEffect } from "react";
+import React, { useState, useMemo, useEffect, useCallback } from "react";
 import municipio from "./datos/municipio.json";
 import obras from "./datos/obras_sanitarias.json";
 import sisp from "./datos/sisp.json";
 import comercio from "./datos/privados/comercio_130_75.json";
+import { moneyFormatter, useCalculosSueldo } from "./hooks/useCalculosSueldo";
+
+const STORAGE_KEY = "calculadora:tandil:parametros";
 
 export default function CalculadoraSueldoTandil() {
+  const readPersisted = useCallback((key, fallback) => {
+    if (typeof window === "undefined") return fallback;
+    try {
+      const raw = window.localStorage.getItem(STORAGE_KEY);
+      if (!raw) return fallback;
+      const parsed = JSON.parse(raw);
+      return parsed?.[key] ?? fallback;
+    } catch (error) {
+      console.warn("No se pudo leer almacenamiento local", error);
+      return fallback;
+    }
+  }, []);
+
   // --- Estado global UI ---
-  const [sector, setSector] = useState("publico");       // publico | privado
-  const [convenio, setConvenio] = useState("municipio"); // municipio | obras | sisp | comercio
-  const [mes, setMes] = useState("");                    // YYYY-MM (si el convenio tiene escalas)
+  const [sector, setSector] = useState(() => readPersisted("sector", "publico"));
+  const [convenio, setConvenio] = useState(() => readPersisted("convenio", "municipio"));
+  const [mes, setMes] = useState(() => readPersisted("mes", ""));
 
   // --- Parámetros de cálculo ---
-  const [categoria, setCategoria] = useState("1");
-  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
-  const [regimen, setRegimen] = useState("35");          // 35|40|48 (en público). En comercio siempre 48.
-  const [titulo, setTitulo] = useState("ninguno");       // ninguno|terciario|universitario
-  const [funcion, setFuncion] = useState(0);             // %
-  const [horas50, setHoras50] = useState(0);
-  const [horas100, setHoras100] = useState(0);
-  const [descuentosExtras, setDescuentosExtras] = useState(0);
-  const [noRemunerativo, setNoRemunerativo] = useState(0);
+  const [categoria, setCategoria] = useState(() => readPersisted("categoria", "1"));
+  const [aniosAntiguedad, setAniosAntiguedad] = useState(() => readPersisted("aniosAntiguedad", 0));
+  const [regimen, setRegimen] = useState(() => readPersisted("regimen", "35"));
+  const [titulo, setTitulo] = useState(() => readPersisted("titulo", "ninguno"));
+  const [funcion, setFuncion] = useState(() => readPersisted("funcion", 0));
+  const [horas50, setHoras50] = useState(() => readPersisted("horas50", 0));
+  const [horas100, setHoras100] = useState(() => readPersisted("horas100", 0));
+  const [descuentosExtras, setDescuentosExtras] = useState(() => readPersisted("descuentosExtras", 0));
+  const [noRemunerativo, setNoRemunerativo] = useState(() => readPersisted("noRemunerativo", 0));
 
   // --- Reporte interno ---
   const [mostrarModal, setMostrarModal] = useState(false);
   const [descripcion, setDescripcion] = useState("");
   const [mensajeEnviado, setMensajeEnviado] = useState(null);
 
   // --- Mapa de convenios por sector ---
   const convenios = useMemo(
     () => ({
       publico: { municipio, obras, sisp },
       privado: { comercio },
     }),
     []
   );
 
-  const datosConvenio = convenios[sector][convenio];
+  const datosConvenio = convenios[sector]?.[convenio];
   const tieneEscalas = Boolean(datosConvenio?.escalas);
 
   // --- Formateo moneda ---
-  const money = (v) =>
-    new Intl.NumberFormat("es-AR", {
-      minimumFractionDigits: 2,
-      maximumFractionDigits: 2,
-    }).format(Number(v) || 0);
+  const money = useMemo(() => moneyFormatter(), []);
+  const formatMoney = useCallback((value) => money.format(Number(value) || 0), [money]);
 
   // UX inputs: limpiar 0 al enfocar
   const onFocusZero = (e) => {
     if (e.target.value === "0") e.target.value = "";
   };
   const onBlurZero = (e, setter) => {
     if (e.target.value === "") {
       e.target.value = "0";
       setter(0);
     }
   };
 
-  // Al cambiar sector → convenio default
+  // Persistencia de parámetros
+  useEffect(() => {
+    if (typeof window === "undefined") return;
+    const payload = {
+      sector,
+      convenio,
+      mes,
+      categoria,
+      aniosAntiguedad,
+      regimen,
+      titulo,
+      funcion,
+      horas50,
+      horas100,
+      descuentosExtras,
+      noRemunerativo,
+    };
+    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
+  }, [
+    sector,
+    convenio,
+    mes,
+    categoria,
+    aniosAntiguedad,
+    regimen,
+    titulo,
+    funcion,
+    horas50,
+    horas100,
+    descuentosExtras,
+    noRemunerativo,
+  ]);
+
+  // Ajustes al cambiar sector
   useEffect(() => {
-    setConvenio(sector === "publico" ? "municipio" : "comercio");
-  }, [sector]);
+    if (sector === "privado") {
+      setRegimen("48");
+    }
+    const opciones = Object.keys(convenios[sector] || {});
+    if (!opciones.includes(convenio)) {
+      setConvenio(opciones[0] || "");
+    }
+  }, [sector, convenio, convenios]);
 
   // Al cambiar convenio → fijar mes válido (si hay escalas), categoría y régimen
   useEffect(() => {
     if (tieneEscalas) {
       const meses = Object.keys(datosConvenio?.escalas || {});
       if (meses.length > 0) {
         const mesValido = meses.includes(mes) ? mes : meses[0];
         if (mesValido !== mes) setMes(mesValido);
 
         const catObj = datosConvenio?.escalas?.[mesValido]?.categoria || {};
         const firstCat = Object.keys(catObj)[0] || "1";
         setCategoria(firstCat);
-        setRegimen(sector === "privado" ? "48" : "35"); // público default 35; comercio 48 fijo
+        if (sector === "publico" && regimen === "48" && !datosConvenio?.escalas?.[mesValido]?.plusHorarios?.["48"]) {
+          setRegimen("35");
+        }
       }
     } else {
-      // Si no hay escalas (no debería pasar con el nuevo formato público, pero por compat):
       const b = datosConvenio?.basicos || {};
       const first = Object.keys(b)[0] || "1";
       setCategoria(first);
-      setRegimen("35");
+      setRegimen(sector === "privado" ? "48" : "35");
       setMes("");
     }
-  }, [convenio, datosConvenio, tieneEscalas, sector]);
+  }, [convenio, datosConvenio, tieneEscalas, sector, mes, regimen]);
 
   // Al cambiar mes en convenios con escalas → asegurar categoría válida
   useEffect(() => {
     if (tieneEscalas && mes && datosConvenio?.escalas?.[mes]) {
       const catObj = datosConvenio.escalas[mes].categoria || {};
       if (!catObj[categoria]) {
         const first = Object.keys(catObj)[0] || "1";
         setCategoria(first);
       }
     }
   }, [mes, tieneEscalas, datosConvenio, categoria]);
 
-  // Helpers
-  const valorHora = (base, horasSem) => (horasSem > 0 ? base / (horasSem * 4.33) : 0);
-
-  // === CÁLCULOS ===
-  // Variables acumuladoras
-  let basico = 0;
-  let adicionalHorario = 0;
-  let antiguedadPesos = 0;
-  let presentismoPesos = 0;
-  let adicionalTitulo = 0;
-  let adicionalFuncion = 0;
-  let horasExtras50 = 0;
-  let horasExtras100 = 0;
-  let totalRemunerativo = 0;
-  let totalNoRemunerativo = 0;
-  let desc1 = 0, desc2 = 0, desc3 = 0;
-  let liquido = 0;
-  let noRemuFijo = 0;
-
-  if (sector === "publico") {
-    // ======= PÚBLICO (Admin. Central, Obras, SISP) =======
-    // Se espera formato con escalas por mes
-    const escala = datosConvenio?.escalas?.[mes] || {};
-    const bmap = escala?.categoria || {};
-    basico = Number(bmap[categoria]) || 0;
-
-    // Plus horario desde JSON por mes (0, 0.1429, 0.3714)
-    const plus = escala?.plusHorarios?.[regimen] || 0;
-    adicionalHorario = basico * plus;
-
-    // Antigüedad desde JSON por mes (porcentaje)
-    const antPct = Number(escala?.antiguedad_porcentaje) || 0.02;
-    antiguedadPesos = basico * antPct * (Number(aniosAntiguedad) || 0);
-
-    // Presentismo fijo desde JSON por mes (excluye cargos políticos)
-    const presentismoFijo = Number(escala?.presentismo_fijo) || 0;
-    const esCargoPolitico =
-      (escala?.cargosPoliticos || []).map(String).includes(String(categoria));
-    presentismoPesos = esCargoPolitico ? 0 : presentismoFijo;
-
-    // Adicional por título
-    adicionalTitulo =
-      titulo === "terciario" ? basico * 0.15 :
-      titulo === "universitario" ? basico * 0.2 : 0;
-
-    // Bonificación por función (%)
-    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);
-
-    // Horas extras sobre (básico + plus)
-    const horasSem = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
-    const vh = valorHora(basico + adicionalHorario, horasSem);
-    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
-    horasExtras100 = vh * 2.0 * (Number(horas100) || 0);
-
-    totalRemunerativo =
-      basico +
-      adicionalHorario +
-      antiguedadPesos +
-      presentismoPesos +
-      adicionalTitulo +
-      adicionalFuncion +
-      horasExtras50 +
-      horasExtras100;
-
-    totalNoRemunerativo = Number(noRemunerativo) || 0;
-
-    // Descuentos públicos: IPS 14% + IOMA 4,8% (sobre remunerativo)
-    const extras = Number(descuentosExtras) || 0;
-    desc1 = totalRemunerativo * 0.14;
-    desc2 = totalRemunerativo * 0.048;
-    const totalDeducciones = desc1 + desc2 + extras;
-
-    liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;
-
-  } else {
-    // ======= PRIVADO — COMERCIO 130/75 =======
-    const escala = datosConvenio?.escalas?.[mes] || {};
-    const bmap = escala?.categoria || {};
-    basico = Number(bmap[categoria]) || 0;
-
-    // Comercio: no hay plus horario, régimen fijo 48
-    noRemuFijo = Number(escala?.sumas_no_remunerativas_fijas) || 0;
-
-    // Antigüedad 1% sobre (básico + NR fijo) por año
-    antiguedadPesos = (basico + noRemuFijo) * (Number(aniosAntiguedad) || 0) * 0.01;
-
-    // Presentismo: 1/12 del total sin presentismo (criterio práctico)
-    presentismoPesos = (basico + antiguedadPesos + noRemuFijo) / 12;
-
-    // Adicional por título / función (opcionales)
-    adicionalTitulo =
-      titulo === "terciario" ? basico * 0.15 :
-      titulo === "universitario" ? basico * 0.2 : 0;
-    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);
-
-    // Horas extras (base: básico) 48 hs
-    const vh = valorHora(basico, 48);
-    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
-    horasExtras100 = vh * 2.0 * (Number(horas100) || 0);
-
-    totalRemunerativo =
-      basico +
-      antiguedadPesos +
-      presentismoPesos +
-      adicionalTitulo +
-      adicionalFuncion +
-      horasExtras50 +
-      horasExtras100;
-
-    totalNoRemunerativo = noRemuFijo + (Number(noRemunerativo) || 0);
-
-    // Descuentos: 11% + 3% + 2% (sobre remunerativo)
-    const extras = Number(descuentosExtras) || 0;
-    desc1 = totalRemunerativo * 0.11;
-    desc2 = totalRemunerativo * 0.03;
-    desc3 = totalRemunerativo * 0.02;
-    const totalDeducciones = desc1 + desc2 + desc3 + extras;
-
-    liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;
-  }
+  const clampNumber = useCallback((value, { min = 0, max = Number.POSITIVE_INFINITY } = {}) => {
+    const parsed = Number(value);
+    if (Number.isNaN(parsed)) return min;
+    return Math.min(Math.max(parsed, min), max);
+  }, []);
+
+  const calculos = useCalculosSueldo({
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
+  });
+
+  const warnings = useMemo(() => {
+    const list = [];
+    if (calculos.liquido < 0) {
+      list.push("El total de descuentos supera el total bruto: revise los importes cargados.");
+    }
+    if (
+      calculos.extrasIngresados > 0 &&
+      calculos.extrasIngresados > calculos.totalRemunerativo + calculos.totalNoRemunerativo
+    ) {
+      list.push("Los descuentos adicionales exceden el total devengado.");
+    }
+    return list;
+  }, [calculos]);
 
   // Opciones de convenio por sector
-  const opcionesConvenio = Object.keys(convenios[sector]).map((key) => ({
+  const opcionesConvenio = Object.keys(convenios[sector] || {}).map((key) => ({
     key,
     nombre: convenios[sector][key].nombre,
   }));
 
   // Claves de mes disponibles (si existen)
   const mesesDisponibles = tieneEscalas ? Object.keys(datosConvenio?.escalas || {}) : [];
 
+  const limpiarFormulario = () => {
+    const firstCat = tieneEscalas
+      ? Object.keys(datosConvenio?.escalas?.[mes]?.categoria || {})[0] || "1"
+      : Object.keys(datosConvenio?.basicos || {})[0] || "1";
+    setCategoria(firstCat);
+    setAniosAntiguedad(0);
+    setRegimen(sector === "publico" ? "35" : "48");
+    setTitulo("ninguno");
+    setFuncion(0);
+    setHoras50(0);
+    setHoras100(0);
+    setDescuentosExtras(0);
+    setNoRemunerativo(0);
+  };
+
+  useEffect(() => {
+    if (mostrarModal) {
+      setMensajeEnviado(null);
+    }
+  }, [mostrarModal]);
+
   return (
     <div className="min-h-screen bg-slate-100">
       <header className="bg-blue-800 text-white p-4 text-center text-xl font-semibold">
         Calculadora de Sueldos
       </header>
 
       <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
         {/* === PARÁMETROS === */}
         <section className="bg-white p-5 rounded-xl shadow">
           <h2 className="font-semibold mb-3">Parámetros</h2>
 
           <label className="block text-sm font-medium">Sector</label>
           <select
             value={sector}
             onChange={(e) => setSector(e.target.value)}
             className="w-full p-2 border rounded mb-3"
           >
             <option value="publico">Público</option>
             <option value="privado">Privado</option>
           </select>
 
           <label className="block text-sm font-medium">Convenio</label>
           <select
             value={convenio}
             onChange={(e) => setConvenio(e.target.value)}
@@ -277,298 +265,391 @@ export default function CalculadoraSueldoTandil() {
             </>
           )}
 
           <label className="block text-sm font-medium">Categoría</label>
           <select
             value={categoria}
             onChange={(e) => setCategoria(e.target.value)}
             className="w-full p-2 border rounded mb-3"
           >
             {tieneEscalas && datosConvenio?.escalas?.[mes]?.categoria
               ? Object.keys(datosConvenio.escalas[mes].categoria).map((c) => (
                   <option key={c} value={c}>
                     {c.replaceAll("_", " ")}
                   </option>
                 ))
               : Object.keys(datosConvenio?.basicos || {}).map((c) => (
                   <option key={c} value={c}>
                     {c}
                   </option>
                 ))}
           </select>
 
           <label className="block text-sm font-medium">Años de antigüedad</label>
           <input
             type="number"
+            min={0}
+            step={1}
             value={aniosAntiguedad}
             onFocus={onFocusZero}
             onBlur={(e) => onBlurZero(e, setAniosAntiguedad)}
-            onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
+            onChange={(e) => setAniosAntiguedad(clampNumber(e.target.value))}
             className="w-full p-2 border rounded mb-3"
           />
 
           {/* Público elige régimen; en Comercio queda fijo (48) */}
           {sector === "publico" && (
             <>
               <label className="block text-sm font-medium">Régimen horario semanal</label>
               <select
                 value={regimen}
                 onChange={(e) => setRegimen(e.target.value)}
                 className="w-full p-2 border rounded mb-3"
               >
                 <option value="35">35 hs (sin plus)</option>
                 <option value="40">40 hs (+14,29%)</option>
                 <option value="48">48 hs (+37,14%)</option>
               </select>
             </>
           )}
 
           <label className="block text-sm font-medium">Adicional por título</label>
           <select
             value={titulo}
             onChange={(e) => setTitulo(e.target.value)}
             className="w-full p-2 border rounded mb-3"
           >
             <option value="ninguno">Sin título</option>
             <option value="terciario">Técnico/Terciario — 15%</option>
             <option value="universitario">Universitario/Posgrado — 20%</option>
           </select>
 
           <label className="block text-sm font-medium">Bonificación por función (%)</label>
           <input
             type="number"
+            min={0}
+            max={100}
+            step={0.5}
             value={funcion}
             onFocus={onFocusZero}
             onBlur={(e) => onBlurZero(e, setFuncion)}
-            onChange={(e) => setFuncion(Number(e.target.value))}
+            onChange={(e) => setFuncion(clampNumber(e.target.value, { max: 100 }))}
             className="w-full p-2 border rounded mb-3"
           />
 
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium">Horas extras al 50%</label>
               <input
                 type="number"
+                min={0}
+                step={0.5}
                 value={horas50}
                 onFocus={onFocusZero}
                 onBlur={(e) => onBlurZero(e, setHoras50)}
-                onChange={(e) => setHoras50(Number(e.target.value))}
+                onChange={(e) => setHoras50(clampNumber(e.target.value))}
                 className="w-full p-2 border rounded mb-3"
               />
             </div>
             <div>
               <label className="block text-sm font-medium">Horas extras al 100%</label>
               <input
                 type="number"
+                min={0}
+                step={0.5}
                 value={horas100}
                 onFocus={onFocusZero}
                 onBlur={(e) => onBlurZero(e, setHoras100)}
-                onChange={(e) => setHoras100(Number(e.target.value))}
+                onChange={(e) => setHoras100(clampNumber(e.target.value))}
                 className="w-full p-2 border rounded mb-3"
               />
             </div>
           </div>
 
           <label className="block text-sm font-medium">Descuentos adicionales ($)</label>
           <input
             type="number"
+            min={0}
+            step={1}
             value={descuentosExtras}
             onFocus={onFocusZero}
             onBlur={(e) => onBlurZero(e, setDescuentosExtras)}
-            onChange={(e) => setDescuentosExtras(Number(e.target.value))}
+            onChange={(e) => setDescuentosExtras(clampNumber(e.target.value))}
             className="w-full p-2 border rounded mb-3"
           />
 
           <label className="block text-sm font-medium">Premio productividad / No remunerativo ($)</label>
           <input
             type="number"
+            min={0}
+            step={1}
             value={noRemunerativo}
             onFocus={onFocusZero}
             onBlur={(e) => onBlurZero(e, setNoRemunerativo)}
-            onChange={(e) => setNoRemunerativo(Number(e.target.value))}
+            onChange={(e) => setNoRemunerativo(clampNumber(e.target.value))}
             className="w-full p-2 border rounded mb-4"
           />
 
           <button
-            onClick={() => {
-              // Reset de parámetros (no cambia sector/convenio/mes)
-              const firstCat = tieneEscalas
-                ? Object.keys(datosConvenio?.escalas?.[mes]?.categoria || {})[0] || "1"
-                : Object.keys(datosConvenio?.basicos || {})[0] || "1";
-              setCategoria(firstCat);
-              setAniosAntiguedad(0);
-              setRegimen(sector === "publico" ? "35" : "48");
-              setTitulo("ninguno");
-              setFuncion(0);
-              setHoras50(0);
-              setHoras100(0);
-              setDescuentosExtras(0);
-              setNoRemunerativo(0);
-            }}
+            onClick={limpiarFormulario}
             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg w-full"
           >
             Limpiar formulario
           </button>
 
           <button
             onClick={() => setMostrarModal(true)}
             className="mt-3 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg w-full"
           >
             Reportar error / sugerencia
           </button>
         </section>
 
         {/* === RESULTADOS === */}
         <section className="bg-white p-5 rounded-xl shadow">
           <h2 className="font-semibold mb-3">Resultado</h2>
 
+          {warnings.length > 0 && (
+            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
+              <ul className="list-disc pl-5 space-y-1">
+                {warnings.map((w) => (
+                  <li key={w}>{w}</li>
+                ))}
+              </ul>
+            </div>
+          )}
+
           <Bloque titulo="Remunerativos">
-            <Fila label="Básico" value={basico} money={money} />
-            <Fila label="Antigüedad" value={antiguedadPesos} money={money} />
-            <Fila label="Adicional horario" value={adicionalHorario} money={money} />
-            <Fila label="Adicional por título" value={adicionalTitulo} money={money} />
-            <Fila label="Bonificación por función" value={adicionalFuncion} money={money} />
-            <Fila label="Horas extras 50%" value={horasExtras50} money={money} />
-            <Fila label="Horas extras 100%" value={horasExtras100} money={money} />
-            <Fila label="Presentismo" value={presentismoPesos} money={money} />
-            <Total label="Total remunerativo" value={totalRemunerativo} money={money} />
+            <Fila label="Básico" value={calculos.basico} money={formatMoney} />
+            <Fila
+              label="Antigüedad"
+              value={calculos.antiguedadPesos}
+              money={formatMoney}
+              hint={calculos.infoAntiguedad}
+            />
+            {sector === "publico" && (
+              <Fila
+                label="Adicional horario"
+                value={calculos.adicionalHorario}
+                money={formatMoney}
+                hint="Calculado según plus horario de la escala"
+              />
+            )}
+            <Fila
+              label="Adicional por título"
+              value={calculos.adicionalTitulo}
+              money={formatMoney}
+              hint="Porcentaje aplicado sobre el básico"
+            />
+            <Fila
+              label="Bonificación por función"
+              value={calculos.adicionalFuncion}
+              money={formatMoney}
+              hint="% definido por el usuario"
+            />
+            <Fila
+              label="Horas extras 50%"
+              value={calculos.horasExtras50}
+              money={formatMoney}
+              hint={`Valor hora extra: ${formatMoney(calculos.valorHoraExtras * 1.5)}`}
+            />
+            <Fila
+              label="Horas extras 100%"
+              value={calculos.horasExtras100}
+              money={formatMoney}
+              hint={`Valor hora extra: ${formatMoney(calculos.valorHoraExtras * 2)}`}
+            />
+            <Fila
+              label="Presentismo"
+              value={calculos.presentismoPesos}
+              money={formatMoney}
+              hint={calculos.infoPresentismo}
+            />
+            <Total label="Total remunerativo" value={calculos.totalRemunerativo} money={formatMoney} />
           </Bloque>
 
           <Bloque titulo="No remunerativos">
             {sector === "privado" && (
               <Fila
                 label="Suma no remunerativa fija (escala)"
-                value={noRemuFijo}
-                money={money}
+                value={calculos.noRemuFijo}
+                money={formatMoney}
               />
             )}
-            <Fila label="Otras no remunerativas" value={noRemunerativo} money={money} />
-            <Total label="Total no remunerativo" value={totalNoRemunerativo} money={money} />
+            <Fila label="Cargados manualmente" value={noRemunerativo} money={formatMoney} />
+            <Total label="Total no remunerativo" value={calculos.totalNoRemunerativo} money={formatMoney} />
           </Bloque>
 
           <Bloque titulo="Deducciones">
-            {sector === "publico" ? (
-              <>
-                <Fila label="IPS (14%)" value={-(totalRemunerativo * 0.14)} money={money} />
-                <Fila label="IOMA (4,8%)" value={-(totalRemunerativo * 0.048)} money={money} />
-              </>
-            ) : (
-              <>
-                <Fila label="Jubilación (11%)" value={-(totalRemunerativo * 0.11)} money={money} />
-                <Fila label="Obra social (3%)" value={-(totalRemunerativo * 0.03)} money={money} />
-                <Fila label="FAECYS (2%)" value={-(totalRemunerativo * 0.02)} money={money} />
-              </>
-            )}
-            <Fila label="Otros descuentos" value={-(Number(descuentosExtras) || 0)} money={money} />
-            <Total
-              label="Total deducciones"
-              value={
-                sector === "publico"
-                  ? totalRemunerativo * 0.14 + totalRemunerativo * 0.048 + (Number(descuentosExtras) || 0)
-                  : totalRemunerativo * 0.11 + totalRemunerativo * 0.03 + totalRemunerativo * 0.02 + (Number(descuentosExtras) || 0)
-              }
-              money={money}
+            {calculos.deducciones.map((ded) => (
+              <Fila
+                key={ded.key}
+                label={ded.label}
+                value={ded.valor}
+                money={formatMoney}
+                badge={ded.porcentaje ? `${(ded.porcentaje * 100).toFixed(1)}%` : undefined}
+                negative
+              />
+            ))}
+            <Total label="Total deducciones" value={calculos.deduccionesTotales} money={formatMoney} negative />
+          </Bloque>
+
+          <Bloque titulo="Indicadores clave">
+            <Fila
+              label="Valor hora básico"
+              value={calculos.valorHoraReferencia}
+              money={formatMoney}
+              hint="Básico dividido por horas mensuales"
+            />
+            <Fila
+              label="Valor hora con plus"
+              value={calculos.valorHoraExtras}
+              money={formatMoney}
+              hint="Base utilizada para calcular horas extras"
             />
           </Bloque>
 
           <hr className="my-4" />
           <p className="text-xl font-bold text-green-700">
-            Líquido a cobrar: $
-            {money(
-              totalRemunerativo +
-                totalNoRemunerativo -
-                (sector === "publico"
-                  ? totalRemunerativo * 0.14 + totalRemunerativo * 0.048 + (Number(descuentosExtras) || 0)
-                  : totalRemunerativo * 0.11 +
-                    totalRemunerativo * 0.03 +
-                    totalRemunerativo * 0.02 +
-                    (Number(descuentosExtras) || 0))
-            )}
+            Líquido a cobrar: {formatMoney(calculos.liquido)}
           </p>
         </section>
       </div>
 
       {mostrarModal && (
         <ReportarModal
           descripcion={descripcion}
           setDescripcion={setDescripcion}
           mensajeEnviado={mensajeEnviado}
           setMensajeEnviado={setMensajeEnviado}
           cerrar={() => setMostrarModal(false)}
         />
       )}
     </div>
   );
 }
 
 function Bloque({ titulo, children }) {
   return (
     <div className="mb-4">
       <h3 className="text-base font-semibold text-slate-700 mb-2">{titulo}</h3>
-      <div className="space-y-1">{children}</div>
+      <div className="space-y-2">{children}</div>
     </div>
   );
 }
 
-function Fila({ label, value, money }) {
+function Fila({ label, value, money, hint, badge, negative = false }) {
+  const numericValue = Number(value) || 0;
+  const displayValue = negative ? -numericValue : numericValue;
+  const formatted = money(displayValue);
   return (
-    <p className="text-slate-700">
-      <span className="font-medium">{label}:</span> ${money(value)}
-    </p>
+    <div className="text-slate-700">
+      <div className="flex items-baseline justify-between gap-3">
+        <div className="flex items-center gap-2">
+          <span className="font-medium">{label}</span>
+          {badge && <Badge>{badge}</Badge>}
+        </div>
+        <span className={negative ? "text-red-700" : "text-slate-900"}>{formatted}</span>
+      </div>
+      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
+    </div>
   );
 }
 
-function Total({ label, value, money }) {
+function Total({ label, value, money, negative = false }) {
+  const numericValue = Number(value) || 0;
+  const displayValue = negative ? -numericValue : numericValue;
+  const formatted = money(displayValue);
   return (
     <p className="mt-2 font-semibold text-slate-800">
-      {label}: ${money(value)}
+      {label}: {formatted}
     </p>
   );
 }
 
+function Badge({ children }) {
+  return (
+    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
+      {children}
+    </span>
+  );
+}
+
 function ReportarModal({ descripcion, setDescripcion, mensajeEnviado, setMensajeEnviado, cerrar }) {
+  const [enviando, setEnviando] = useState(false);
+  const [error, setError] = useState(null);
+
+  const MIN_LENGTH = 12;
+
   const enviarReporte = async () => {
-    if (!descripcion.trim()) return setMensajeEnviado("Por favor describa el problema.");
+    const texto = descripcion.trim();
+    if (texto.length < MIN_LENGTH) {
+      setMensajeEnviado(null);
+      setError(`Por favor describa el problema con al menos ${MIN_LENGTH} caracteres.`);
+      return;
+    }
+    setError(null);
+    setMensajeEnviado(null);
+    setEnviando(true);
     try {
       const res = await fetch("/api/sendReport", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
-        body: JSON.stringify({ descripcion }),
+        body: JSON.stringify({ descripcion: texto }),
       });
-      setMensajeEnviado(res.ok ? "Reporte enviado" : "Error al enviar");
-      if (res.ok) setDescripcion("");
-    } catch {
-      setMensajeEnviado("Error de conexión");
+      if (!res.ok) {
+        const message = res.status === 422 ? "Validación rechazada" : "Error al enviar";
+        setError(message);
+        return;
+      }
+      setMensajeEnviado("¡Gracias! Recibimos tu reporte.");
+      setDescripcion("");
+    } catch (err) {
+      setError("No se pudo contactar al servidor. Intente más tarde.");
+      console.error("Error al enviar reporte", err);
+    } finally {
+      setEnviando(false);
     }
   };
 
   return (
     <div className="fixed inset-0 bg-black/60 flex justify-center items-center">
       <div className="bg-white p-5 rounded-xl shadow max-w-md w-full">
         <h2 className="font-semibold mb-3">Reportar error o sugerencia</h2>
         <textarea
           className="w-full border p-2 rounded mb-3 min-h-[120px]"
           value={descripcion}
           onChange={(e) => setDescripcion(e.target.value)}
           placeholder="Describa el problema o sugerencia..."
         />
-        {mensajeEnviado && <p className="text-sm mb-3">{mensajeEnviado}</p>}
-        <button onClick={enviarReporte} className="bg-green-700 text-white px-4 py-2 rounded mr-2">
-          Enviar
+        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
+        {mensajeEnviado && <p className="mb-2 text-sm text-emerald-600">{mensajeEnviado}</p>}
+        <button
+          onClick={enviarReporte}
+          className="bg-green-700 text-white px-4 py-2 rounded mr-2 disabled:cursor-not-allowed disabled:bg-green-400"
+          disabled={enviando}
+        >
+          {enviando ? "Enviando..." : "Enviar"}
         </button>
-        <button onClick={cerrar} className="bg-slate-300 px-4 py-2 rounded">
+        <button
+          onClick={() => {
+            setError(null);
+            cerrar();
+          }}
+          className="bg-slate-300 px-4 py-2 rounded"
+        >
           Cerrar
         </button>
       </div>
     </div>
   );
 }
 
 // "2025-10" -> "octubre de 2025"
 function formatMes(key) {
   try {
     const d = new Date(key + "-01T00:00:00");
     return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
   } catch {
     return key;
   }
 }
 
EOF
)

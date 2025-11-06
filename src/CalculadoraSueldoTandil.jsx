import React, { useState, useMemo, useEffect } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";
import comercio from "./datos/privados/comercio_130_75.json";

export default function CalculadoraSueldoTandil() {
  // Estado UI
  const [sector, setSector] = useState("publico");       // publico | privado
  const [convenio, setConvenio] = useState("municipio"); // municipio | obras | sisp | comercio
  const [mes, setMes] = useState("");                    // YYYY-MM (si el convenio tiene escalas)

  // Parámetros de cálculo
  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");          // públicos: 35/40/48; comercio: 48 fijo
  const [titulo, setTitulo] = useState("ninguno");       // ninguno | terciario | universitario
  const [funcion, setFuncion] = useState(0);             // %
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  // Reporte interno
  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState(null);

  // Mapa de convenios por sector
  const convenios = useMemo(
    () => ({
      publico: { municipio, obras, sisp },
      privado: { comercio },
    }),
    []
  );

  const datosConvenio = convenios[sector][convenio];
  const tieneEscalas = Boolean(datosConvenio?.escalas);

  // Formateo moneda
  const money = (v) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

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

  // Al cambiar sector → convenio default
  useEffect(() => {
    setConvenio(sector === "publico" ? "municipio" : "comercio");
  }, [sector]);

  // Al cambiar convenio → fijar mes válido (si hay escalas), categoría y régimen
  useEffect(() => {
    if (!datosConvenio) return;

    if (datosConvenio.escalas) {
      const meses = Object.keys(datosConvenio.escalas || {});
      if (meses.length > 0) {
        const mesValido = meses.includes(mes) ? mes : meses[0];
        if (mesValido !== mes) setMes(mesValido);

        const catObj = datosConvenio.escalas[mesValido]?.categoria || {};
        const firstCat = Object.keys(catObj)[0] || "1";
        setCategoria(firstCat);

        setRegimen(sector === "privado" ? "48" : "35"); // Comercio 48; público 35 default
      }
    } else {
      // Compat (si algún JSON viejo no tiene escalas)
      const b = datosConvenio.basicos || {};
      const first = Object.keys(b)[0] || "1";
      setCategoria(first);
      setRegimen("35");
      setMes("");
    }
  }, [convenio, datosConvenio, sector]);

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

  // Helpers
  const valorHora = (base, horasSem) => (horasSem > 0 ? base / (horasSem * 4.33) : 0);

  // === CÁLCULOS ===
  let basico = 0;
  let adicionalHorario = 0;
  let antiguedadPesos = 0;
  let presentismoPesos = 0;
  let adicionalTitulo = 0;
  let adicionalFuncion = 0;
  let horasExtras50 = 0;
  let horasExtras100 = 0;
  let totalRemunerativo = 0;
  let totalNoRemunerativo = 0;
  let liquido = 0;
  let noRemuFijo = 0;

  if (sector === "publico") {
    // ======= PÚBLICO (Admin. Central, Obras, SISP) =======
    const escala = datosConvenio?.escalas?.[mes] || {};
    const bmap = escala?.categoria || {};
    basico = Number(bmap[categoria]) || 0;

    // Plus horario por mes
    const plus = escala?.plusHorarios?.[regimen] || 0;
    adicionalHorario = basico * plus;

    // Antigüedad % por mes (default 2%)
    const antPct = Number(escala?.antiguedad_porcentaje) || 0.02;
    antiguedadPesos = basico * antPct * (Number(aniosAntiguedad) || 0);

    // Presentismo fijo por mes (excluye cargos políticos)
    const presentismoFijo = Number(escala?.presentismo_fijo) || 0;
    const esCargoPolitico =
      (escala?.cargosPoliticos || []).map(String).includes(String(categoria));
    presentismoPesos = esCargoPolitico ? 0 : presentismoFijo;

    // Adicional por título
    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.2 : 0;

    // Bonificación por función (%)
    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    // Horas extras sobre (básico + plus)
    const horasSem = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
    const vh = valorHora(basico + adicionalHorario, horasSem);
    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
    horasExtras100 = vh * 2.0 * (Number(horas100) || 0);

    totalRemunerativo =
      basico +
      adicionalHorario +
      antiguedadPesos +
      presentismoPesos +
      adicionalTitulo +
      adicionalFuncion +
      horasExtras50 +
      horasExtras100;

    totalNoRemunerativo = Number(noRemunerativo) || 0;

    // Descuentos públicos: IPS 14% + IOMA 4,8%
    const extras = Number(descuentosExtras) || 0;
    const descIPS = totalRemunerativo * 0.14;
    const descIOMA = totalRemunerativo * 0.048;

    const totalDeducciones = descIPS + descIOMA + extras;
    liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  } else {
    // ======= PRIVADO — COMERCIO 130/75 =======
    const escala = datosConvenio?.escalas?.[mes] || {};
    const bmap = escala?.categoria || {};
    basico = Number(bmap[categoria]) || 0;

    // NR fijo por mes (si existiera en la escala)
    noRemuFijo = Number(escala?.sumas_no_remunerativas_fijas) || 0;

    // ✅ Antigüedad: 1% del básico por año
    antiguedadPesos = basico * (Number(aniosAntiguedad) || 0) * 0.01;

    // ✅ Presentismo: (básico + antigüedad) / 12
    presentismoPesos = (basico + antiguedadPesos) / 12;

    // Adicional por título / función (opcionales)
    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.2 : 0;
    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    // Horas extras (base: básico), 48hs
    const vh = valorHora(basico, 48);
    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
    horasExtras100 = vh * 2.0 * (Number(horas100) || 0);

    totalRemunerativo =
      basico +
      antiguedadPesos +
      presentismoPesos +
      adicionalTitulo +
      adicionalFuncion +
      horasExtras50 +
      horasExtras100;

    totalNoRemunerativo = noRemuFijo + (Number(noRemunerativo) || 0);

    // ✅ Descuentos: 11% + 3% (OS) + 3% (PAMI) + 2% (FAECYS) + 0,5% (Aporte solidario)
    const extras = Number(descuentosExtras) || 0;
    const descJubilacion = totalRemunerativo * 0.11;
    const descObraSocial = totalRemunerativo * 0.03;
    const descLey19032 = totalRemunerativo * 0.03;
    const descSindicato = totalRemunerativo * 0.02;
    const descAporteSolidario = totalRemunerativo * 0.005;

    const totalDeducciones =
      descJubilacion +
      descObraSocial +
      descLey19032 +
      descSindicato +
      descAporteSolidario +
      extras;

    liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;
  }

  // Opciones de convenio por sector
  const opcionesConvenio = Object.keys(convenios[sector]).map((key) => ({
    key,
    nombre: convenios[sector][key].nombre,
  }));

  const mesesDisponibles = tieneEscalas ? Object.keys(datosConvenio?.escalas || {}) : [];

  // Guardita por si todavía no hay mes válido cargado
  const escalaActual = tieneEscalas ? datosConvenio?.escalas?.[mes] : null;
  const requiereMes = tieneEscalas && !escalaActual;

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
            className="w-full p-2 border rounded mb-3"
          >
            {opcionesConvenio.map((o) => (
              <option key={o.key} value={o.key}>
                {o.nombre}
              </option>
            ))}
          </select>

          {tieneEscalas && (
            <>
              <label className="block text-sm font-medium">Mes</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-full p-2 border rounded mb-3"
                disabled={!tieneEscalas}
              >
                {mesesDisponibles.map((k) => (
                  <option key={k} value={k}>
                    {formatMes(k)}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="block text-sm font-medium">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            disabled={requiereMes}
          >
            {tieneEscalas && datosConvenio?.escalas?.[mes]?.categoria
              ? Object.keys(datosConvenio.escalas[mes].categoria).map((c) => (
                  <option key={c} value={c}>
                    {c}
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
            value={aniosAntiguedad}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setAniosAntiguedad)}
            onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
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
            value={funcion}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setFuncion)}
            onChange={(e) => setFuncion(Number(e.target.value))}
            className="w-full p-2 border rounded mb-3"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Horas extras al 50%</label>
              <input
                type="number"
                value={horas50}
                onFocus={onFocusZero}
                onBlur={(e) => onBlurZero(e, setHoras50)}
                onChange={(e) => setHoras50(Number(e.target.value))}
                className="w-full p-2 border rounded mb-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Horas extras al 100%</label>
              <input
                type="number"
                value={horas100}
                onFocus={onFocusZero}
                onBlur={(e) => onBlurZero(e, setHoras100)}
                onChange={(e) => setHoras100(Number(e.target.value))}
                className="w-full p-2 border rounded mb-3"
              />
            </div>
          </div>

          <label className="block text-sm font-medium">Descuentos adicionales ($)</label>
          <input
            type="number"
            value={descuentosExtras}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setDescuentosExtras)}
            onChange={(e) => setDescuentosExtras(Number(e.target.value))}
            className="w-full p-2 border rounded mb-3"
          />

          <label className="block text-sm font-medium">Premio productividad / No remunerativo ($)</label>
          <input
            type="number"
            value={noRemunerativo}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setNoRemunerativo)}
            onChange={(e) => setNoRemunerativo(Number(e.target.value))}
            className="w-full p-2 border rounded mb-4"
          />

          <button
            onClick={() => {
              // Reset de parámetros (no cambia sector/convenio/mes)
              const firstCat = datosConvenio?.escalas?.[mes]?.categoria
                ? Object.keys(datosConvenio.escalas[mes].categoria)[0] || "1"
                : Object.keys(datosConvenio?.basicos || {})[0] || "1";
              setCategoria(firstCat);
              setAniosAntiguedad(0);
              setRegimen(sector === "publico" ? "35" : "48");
              setTitulo("ninguno");
              setFuncion(0);
              setHoras50(0);
              setHoras100(0);
              setDescuentosExtras(0);
              setNoRemunerativo(0);
            }}
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

          <Bloque titulo="Remunerativos">
            <Fila label="Básico" value={basico} money={money} />
            <Fila label="Antigüedad" value={antiguedadPesos} money={money} />
            <Fila label="Adicional horario" value={adicionalHorario} money={money} />
            <Fila label="Adicional por título" value={adicionalTitulo} money={money} />
            <Fila label="Bonificación por función" value={adicionalFuncion} money={money} />
            <Fila label="Horas extras 50%" value={horasExtras50} money={money} />
            <Fila label="Horas extras 100%" value={horasExtras100} money={money} />
            <Fila label="Presentismo" value={presentismoPesos} money={money} />
            <Total label="Total remunerativo" value={totalRemunerativo} money={money} />
          </Bloque>

          <Bloque titulo="No remunerativos">
            {sector === "privado" && (
              <Fila label="Suma no remunerativa fija (escala)" value={noRemuFijo} money={money} />
            )}
            <Fila label="Otras no remunerativas" value={noRemunerativo} money={money} />
            <Total label="Total no remunerativo" value={totalNoRemunerativo} money={money} />
          </Bloque>

          <Bloque titulo="Deducciones">
            {sector === "publico" ? (
              <>
                <Fila label="IPS (14%)" value={-(totalRemunerativo * 0.14)} money={money} />
                <Fila label="IOMA (4,8%)" value={-(totalRemunerativo * 0.048)} money={money} />
              </>
            ) : (
              <>
                <Fila label="Jubilación (11%)" value={-(totalRemunerativo * 0.11)} money={money} />
                <Fila label="Obra social (3%)" value={-(totalRemunerativo * 0.03)} money={money} />
                <Fila label="Ley 19032 – PAMI (3%)" value={-(totalRemunerativo * 0.03)} money={money} />
                <Fila label="FAECYS (2%)" value={-(totalRemunerativo * 0.02)} money={money} />
                <Fila label="Aporte solidario (0,5%)" value={-(totalRemunerativo * 0.005)} money={money} />
              </>
            )}
            <Fila label="Otros descuentos" value={-(Number(descuentosExtras) || 0)} money={money} />
            <Total
              label="Total deducciones"
              value={
                sector === "publico"
                  ? totalRemunerativo * 0.14 +
                    totalRemunerativo * 0.048 +
                    (Number(descuentosExtras) || 0)
                  : totalRemunerativo * 0.11 +
                    totalRemunerativo * 0.03 +
                    totalRemunerativo * 0.03 +
                    totalRemunerativo * 0.02 +
                    totalRemunerativo * 0.005 +
                    (Number(descuentosExtras) || 0)
              }
              money={money}
            />
          </Bloque>

          <hr className="my-4" />
          <p className="text-xl font-bold text-green-700">
            Líquido a cobrar: $
            {money(
              totalRemunerativo +
                totalNoRemunerativo -
                (sector === "publico"
                  ? totalRemunerativo * 0.14 +
                    totalRemunerativo * 0.048 +
                    (Number(descuentosExtras) || 0)
                  : totalRemunerativo * 0.11 +
                    totalRemunerativo * 0.03 +
                    totalRemunerativo * 0.03 +
                    totalRemunerativo * 0.02 +
                    totalRemunerativo * 0.005 +
                    (Number(descuentosExtras) || 0))
            )}
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
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Fila({ label, value, money }) {
  return (
    <p className="text-slate-700">
      <span className="font-medium">{label}:</span> ${money(value)}
    </p>
  );
}

function Total({ label, value, money }) {
  return (
    <p className="mt-2 font-semibold text-slate-800">
      {label}: ${money(value)}
    </p>
  );
}

function ReportarModal({ descripcion, setDescripcion, mensajeEnviado, setMensajeEnviado, cerrar }) {
  const enviarReporte = async () => {
    if (!descripcion.trim()) return setMensajeEnviado("Por favor describa el problema.");
    try {
      const res = await fetch("/api/sendReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion }),
      });
      setMensajeEnviado(res.ok ? "Reporte enviado" : "Error al enviar");
      if (res.ok) setDescripcion("");
    } catch {
      setMensajeEnviado("Error de conexión");
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
        {mensajeEnviado && <p className="text-sm mb-3">{mensajeEnviado}</p>}
        <button onClick={enviarReporte} className="bg-green-700 text-white px-4 py-2 rounded mr-2">
          Enviar
        </button>
        <button onClick={cerrar} className="bg-slate-300 px-4 py-2 rounded">
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

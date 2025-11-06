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

  // Modal
  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState(null);

  // Mapas
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
    }).format(Number(v) || 0);

  const onFocusZero = (e) => e.target.value === "0" && (e.target.value = "");
  const onBlurZero = (e, setter) => (e.target.value === "" ? (setter(0), (e.target.value = "0")) : null);

  useEffect(() => setConvenio(sector === "publico" ? "municipio" : "comercio"), [sector]);

  useEffect(() => {
    if (!datosConvenio) return;

    if (datosConvenio.escalas) {
      const meses = Object.keys(datosConvenio.escalas || {});
      const mesValido = meses.includes(mes) ? mes : meses[0];
      if (mesValido !== mes) setMes(mesValido);

      const catObj = datosConvenio.escalas[mesValido]?.categoria || {};
      setCategoria(Object.keys(catObj)[0] || "1");
      setRegimen(sector === "privado" ? "48" : "35");
    } else {
      const b = datosConvenio.basicos || {};
      setCategoria(Object.keys(b)[0] || "1");
      setRegimen("35");
      setMes("");
    }
  }, [convenio, datosConvenio, sector]);

  useEffect(() => {
    if (tieneEscalas && mes && datosConvenio?.escalas?.[mes]) {
      const catObj = datosConvenio.escalas[mes].categoria || {};
      if (!catObj[categoria]) setCategoria(Object.keys(catObj)[0] || "1");
    }
  }, [mes]);

  const valorHora = (base, horasSem) => (horasSem > 0 ? base / (horasSem * 4.33) : 0);

  // ---------------------------------
  // CALCULOS
  // ---------------------------------

  // Variables finales
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
    // -------------------- PÚBLICO --------------------
    const escala = datosConvenio?.escalas?.[mes] || {};
    const bmap = escala?.categoria || {};
    basico = Number(bmap[categoria]) || 0;

    const plus = escala?.plusHorarios?.[regimen] || 0;
    adicionalHorario = basico * plus;

    const antPct = Number(escala?.antiguedad_porcentaje) || 0.02;
    antiguedadPesos = basico * antPct * (Number(aniosAntiguedad) || 0);

    const presentismoFijo = Number(escala?.presentismo_fijo) || 0;
    presentismoPesos = presentismoFijo;

    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.20 : 0;

    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    const horasSem = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
    const vh = valorHora(basico + adicionalHorario, horasSem);
    horasExtras50 = vh * 1.5 * Number(horas50);
    horasExtras100 = vh * 2 * Number(horas100);

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

    const extras = Number(descuentosExtras) || 0;
    const descIPS = totalRemunerativo * 0.14;
    const descIOMA = totalRemunerativo * 0.048;
    liquido = totalRemunerativo + totalNoRemunerativo - (descIPS + descIOMA + extras);

  } else {
    // -------------------- PRIVADO — COMERCIO --------------------
    const escala = datosConvenio?.escalas?.[mes] || {};
    const bmap = escala?.categoria || {};
    basico = Number(bmap[categoria]) || 0;

    // Suma no remunerativa acordada
    noRemuFijo = Number(escala?.sumas_no_remunerativas_fijas) || 0;

    // ✅ Antigüedad correcta
    antiguedadPesos = basico * (Number(aniosAntiguedad) || 0) * 0.01;

    // ✅ Presentismo correcto → (Básico + Antigüedad) / 12
    presentismoPesos = (basico + antiguedadPesos) / 12;

    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.20 : 0;

    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    const vh = valorHora(basico, 48);
    horasExtras50 = vh * 1.5 * Number(horas50);
    horasExtras100 = vh * 2 * Number(horas100);

    totalRemunerativo =
      basico +
      antiguedadPesos +
      presentismoPesos +
      adicionalTitulo +
      adicionalFuncion +
      horasExtras50 +
      horasExtras100;

    totalNoRemunerativo = noRemuFijo + (Number(noRemunerativo) || 0);

    const extras = Number(descuentosExtras) || 0;

    const descJub = totalRemunerativo * 0.11;
    const descOS = totalRemunerativo * 0.03;
    const descPAMI = totalRemunerativo * 0.03;
    const descFAECYS = totalRemunerativo * 0.02;
    const descSol = totalRemunerativo * 0.005;

    liquido =
      totalRemunerativo +
      totalNoRemunerativo -
      (descJub + descOS + descPAMI + descFAECYS + descSol + extras);
  }

  // UI Helpers
  const opcionesConvenio = Object.keys(convenios[sector]).map((key) => ({ key, nombre: convenios[sector][key].nombre }));
  const mesesDisponibles = tieneEscalas ? Object.keys(datosConvenio?.escalas || {}) : [];
  const requiereMes = tieneEscalas && !datosConvenio?.escalas?.[mes];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-800 text-white p-4 text-center text-xl font-semibold">
        Calculadora de Sueldos
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

        {/* === IZQUIERDA: PARÁMETROS === */}
        <Parametros {...{
          sector, setSector,
          convenio, setConvenio,
          mesesDisponibles, tieneEscalas, mes, setMes,
          categoria, setCategoria,
          aniosAntiguedad, setAniosAntiguedad,
          regimen, setRegimen,
          titulo, setTitulo,
          funcion, setFuncion,
          horas50, setHoras50,
          horas100, setHoras100,
          descuentosExtras, setDescuentosExtras,
          noRemunerativo, setNoRemunerativo,
          onFocusZero, onBlurZero,
          datosConvenio, money, sectorOriginal: sector
        }} />

        {/* === DERECHA: RESULTADOS === */}
        <section className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Resultado</h2>

          <Bloque titulo="Remunerativos">
            <Fila label="Básico" value={basico} money={money} />
            <Fila label="Antigüedad" value={antiguedadPesos} money={money} />
            {sector === "publico" && <Fila label="Adicional horario" value={adicionalHorario} money={money} />}
            <Fila label="Adicional por título" value={adicionalTitulo} money={money} />
            <Fila label="Bonificación por función" value={adicionalFuncion} money={money} />
            <Fila label="Horas extras 50%" value={horasExtras50} money={money} />
            <Fila label="Horas extras 100%" value={horasExtras100} money={money} />
            <Fila label="Presentismo" value={presentismoPesos} money={money} />
            <Total label="Total remunerativo" value={totalRemunerativo} money={money} />
          </Bloque>

          <Bloque titulo="No remunerativos">
            {sector === "privado" && (
              <Fila label="Suma no remunerativa fija (acuerdo)" value={noRemuFijo} money={money} />
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

            <Total label="Total deducciones" value={
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
            } money={money} />
          </Bloque>

          <hr className="my-4" />
          <p className="text-xl font-bold text-green-700">
            Líquido a cobrar: ${money(liquido)}
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

// Presentación
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

// Modal reporte (sin cambios)
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

function formatMes(key) {
  try {
    const d = new Date(key + "-01T00:00:00");
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

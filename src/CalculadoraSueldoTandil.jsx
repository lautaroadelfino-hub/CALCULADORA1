import React, { useState, useMemo, useEffect } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";
import comercio from "./datos/privados/comercio_130_75.json";

export default function CalculadoraSueldoTandil() {
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipio");
  const [mes, setMes] = useState("");

  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");
  const [titulo, setTitulo] = useState("ninguno");
  const [funcion, setFuncion] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState(null);

  const convenios = useMemo(
    () => ({
      publico: { municipio, obras, sisp },
      privado: { comercio },
    }),
    []
  );

  const datosConvenio = convenios[sector][convenio];
  const tieneEscalas = Boolean(datosConvenio?.escalas);

  const money = (v) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 }).format(Number(v) || 0);

  const onFocusZero = (e) => e.target.value === "0" && (e.target.value = "");
  const onBlurZero = (e, setter) => e.target.value === "" && (setter(0), (e.target.value = "0"));

  useEffect(() => setConvenio(sector === "publico" ? "municipio" : "comercio"), [sector]);

  useEffect(() => {
    if (!datosConvenio) return;
    if (datosConvenio.escalas) {
      const meses = Object.keys(datosConvenio.escalas || {});
      const mesValido = meses.includes(mes) ? mes : meses[0];
      if (mesValido !== mes) setMes(mesValido);

      const catObj = datosConvenio.escalas[mesValido].categoria;
      setCategoria(Object.keys(catObj)[0]);
      setRegimen(sector === "privado" ? "48" : "35");
    } else {
      const first = Object.keys(datosConvenio.basicos)[0];
      setCategoria(first);
      setRegimen("35");
      setMes("");
    }
  }, [convenio, datosConvenio, sector]);

  useEffect(() => {
    if (tieneEscalas && mes && datosConvenio?.escalas?.[mes]) {
      const cats = datosConvenio.escalas[mes].categoria;
      if (!cats[categoria]) setCategoria(Object.keys(cats)[0]);
    }
  }, [mes]);

  const valorHora = (base, hs) => (hs > 0 ? base / (hs * 4.33) : 0);

  // ===== VARIABLES RESULTADO =====
  let basico = 0,
    adicionalHorario = 0,
    antiguedadPesos = 0,
    presentismoPesos = 0,
    adicionalTitulo = 0,
    adicionalFuncion = 0,
    horasExtras50 = 0,
    horasExtras100 = 0,
    totalRemunerativo = 0,
    totalNoRemunerativo = 0,
    liquido = 0,
    noRemuFijo = 0;

  // ==================================
  // PUBLICO
  // ==================================
  if (sector === "publico") {
    const escala = datosConvenio.escalas[mes];
    basico = Number(escala.categoria[categoria]) || 0;
    adicionalHorario = basico * (escala.plusHorarios?.[regimen] || 0);
    antiguedadPesos = basico * (escala.antiguedad_porcentaje || 0.02) * aniosAntiguedad;
    presentismoPesos = Number(escala.presentismo_fijo) || 0;
    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.2 : 0;
    adicionalFuncion = basico * (funcion / 100);

    const vh = valorHora(basico + adicionalHorario, { 35:35,40:40,48:48 }[regimen]);
    horasExtras50 = vh * 1.5 * horas50;
    horasExtras100 = vh * 2 * horas100;

    totalRemunerativo = basico + adicionalHorario + antiguedadPesos + presentismoPesos + adicionalTitulo + adicionalFuncion + horasExtras50 + horasExtras100;
    totalNoRemunerativo = noRemunerativo;

    const extras = descuentosExtras;
    const descIPS = totalRemunerativo * 0.14;
    const descIOMA = totalRemunerativo * 0.048;

    liquido = totalRemunerativo + totalNoRemunerativo - (descIPS + descIOMA + extras);

  } else {
    // ==================================
    // PRIVADO — EMPLEADOS DE COMERCIO
    // ==================================
    const escala = datosConvenio.escalas[mes];
    basico = Number(escala.categoria[categoria]) || 0;

    noRemuFijo = Number(escala.sumas_no_remunerativas_fijas) || 0;

    antiguedadPesos = basico * (aniosAntiguedad * 0.01);

    // ✅ Presentismo correcto
    presentismoPesos = (basico + antiguedadPesos) / 12;

    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 :
      titulo === "universitario" ? basico * 0.2 : 0;

    adicionalFuncion = basico * (funcion / 100);

    const vh = valorHora(basico, 48);
    horasExtras50 = vh * 1.5 * horas50;
    horasExtras100 = vh * 2 * horas100;

    totalRemunerativo =
      basico +
      antiguedadPesos +
      presentismoPesos +
      adicionalTitulo +
      adicionalFuncion +
      horasExtras50 +
      horasExtras100;

    totalNoRemunerativo = noRemuFijo + noRemunerativo;

    // ✅ Bases correctas
    const baseRem = totalRemunerativo;
    const baseRemNoRem = totalRemunerativo + totalNoRemunerativo;

    const descJubilacion = baseRem * 0.11;
    const descLey19032 = baseRem * 0.03;

    const descObraSocial = baseRemNoRem * 0.03;
    const descFAECYS = baseRemNoRem * 0.02;
    const descAporteSolidario = baseRemNoRem * 0.005;

    const extras = descuentosExtras;

    const totalDeducciones =
      descJubilacion +
      descLey19032 +
      descObraSocial +
      descFAECYS +
      descAporteSolidario +
      extras;

    liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;
  }

  const opcionesConvenio = Object.keys(convenios[sector]).map((key) => ({
    key,
    nombre: convenios[sector][key].nombre,
  }));

  const mesesDisponibles = tieneEscalas ? Object.keys(datosConvenio.escalas) : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-800 text-white p-4 text-center text-xl font-semibold">
        Calculadora de Sueldos
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* PARÁMETROS */}
        <section className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Parámetros</h2>

          <label className="block text-sm font-medium">Sector</label>
          <select className="w-full p-2 border rounded mb-3" value={sector} onChange={(e)=>setSector(e.target.value)}>
            <option value="publico">Público</option>
            <option value="privado">Privado</option>
          </select>

          <label className="block text-sm font-medium">Convenio</label>
          <select className="w-full p-2 border rounded mb-3" value={convenio} onChange={(e)=>setConvenio(e.target.value)}>
            {opcionesConvenio.map(o => <option key={o.key} value={o.key}>{o.nombre}</option>)}
          </select>

          {tieneEscalas && (
            <>
              <label className="block text-sm font-medium">Mes</label>
              <select className="w-full p-2 border rounded mb-3" value={mes} onChange={(e)=>setMes(e.target.value)}>
                {mesesDisponibles.map(k => <option key={k} value={k}>{formatMes(k)}</option>)}
              </select>
            </>
          )}

          <label className="block text-sm font-medium">Categoría</label>
          <select className="w-full p-2 border rounded mb-3" value={categoria} onChange={(e)=>setCategoria(e.target.value)}>
            {tieneEscalas
              ? Object.keys(datosConvenio.escalas[mes].categoria).map(c => <option key={c}>{c}</option>)
              : Object.keys(datosConvenio.basicos).map(c => <option key={c}>{c}</option>)}
          </select>

          <label className="block text-sm font-medium">Años de antigüedad</label>
          <input className="w-full p-2 border rounded mb-3" type="number" value={aniosAntiguedad} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setAniosAntiguedad)} onChange={(e)=>setAniosAntiguedad(Number(e.target.value))} />

          {sector === "publico" && (
            <>
              <label className="block text-sm font-medium">Régimen horario semanal</label>
              <select className="w-full p-2 border rounded mb-3" value={regimen} onChange={(e)=>setRegimen(e.target.value)}>
                <option value="35">35hs</option>
                <option value="40">40hs</option>
                <option value="48">48hs</option>
              </select>
            </>
          )}

          <label className="block text-sm font-medium">Adicional por título</label>
          <select className="w-full p-2 border rounded mb-3" value={titulo} onChange={(e)=>setTitulo(e.target.value)}>
            <option value="ninguno">Sin título</option>
            <option value="terciario">Terciario (+15%)</option>
            <option value="universitario">Universitario (+20%)</option>
          </select>

          <label className="block text-sm font-medium">Bonificación por función (%)</label>
          <input className="w-full p-2 border rounded mb-3" type="number" value={funcion} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setFuncion)} onChange={(e)=>setFuncion(Number(e.target.value))} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Horas 50%</label>
              <input className="w-full p-2 border rounded mb-3" type="number" value={horas50} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setHoras50)} onChange={(e)=>setHoras50(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium">Horas 100%</label>
              <input className="w-full p-2 border rounded mb-3" type="number" value={horas100} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setHoras100)} onChange={(e)=>setHoras100(Number(e.target.value))} />
            </div>
          </div>

          <label className="block text-sm font-medium">Descuentos adicionales</label>
          <input className="w-full p-2 border rounded mb-3" type="number" value={descuentosExtras} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setDescuentosExtras)} onChange={(e)=>setDescuentosExtras(Number(e.target.value))} />

          <label className="block text-sm font-medium">No remunerativo ($)</label>
          <input className="w-full p-2 border rounded mb-4" type="number" value={noRemunerativo} onFocus={onFocusZero} onBlur={(e)=>onBlurZero(e,setNoRemunerativo)} onChange={(e)=>setNoRemunerativo(Number(e.target.value))} />
        </section>

        {/* RESULTADOS */}
        <section className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Resultado</h2>

          <Bloque titulo="Remunerativos">
            <Fila label="Básico" value={basico} money={money} />
            <Fila label="Antigüedad" value={antiguedadPesos} money={money} />
            {sector==="publico" && <Fila label="Adicional horario" value={adicionalHorario} money={money} />}
            <Fila label="Adicional por título" value={adicionalTitulo} money={money} />
            <Fila label="Función" value={adicionalFuncion} money={money} />
            <Fila label="Horas extra 50%" value={horasExtras50} money={money} />
            <Fila label="Horas extra 100%" value={horasExtras100} money={money} />
            <Fila label="Presentismo" value={presentismoPesos} money={money} />
            <Total label="Total remunerativo" value={totalRemunerativo} money={money} />
          </Bloque>

          <Bloque titulo="No remunerativos">
            {sector==="privado" && <Fila label="Suma no remunerativa fija" value={noRemuFijo} money={money} />}
            <Fila label="Otros no remunerativos" value={noRemunerativo} money={money} />
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
                <Fila label="Ley 19032 – PAMI (3%)" value={-(totalRemunerativo * 0.03)} money={money} />
                <Fila label="Obra social (3%)" value={-( (totalRemunerativo + totalNoRemunerativo) * 0.03)} money={money} />
                <Fila label="FAECYS (2%)" value={-( (totalRemunerativo + totalNoRemunerativo) * 0.02)} money={money} />
                <Fila label="Aporte solidario (0,5%)" value={-( (totalRemunerativo + totalNoRemunerativo) * 0.005)} money={money} />
              </>
            )}
            <Fila label="Otros descuentos" value={-(descuentosExtras)} money={money} />

            <Total
              label="Total deducciones"
              value={
                sector === "publico"
                  ? totalRemunerativo * 0.14 +
                    totalRemunerativo * 0.048 +
                    descuentosExtras
                  : totalRemunerativo * 0.11 +
                    totalRemunerativo * 0.03 +
                    (totalRemunerativo + totalNoRemunerativo) * 0.03 +
                    (totalRemunerativo + totalNoRemunerativo) * 0.02 +
                    (totalRemunerativo + totalNoRemunerativo) * 0.005 +
                    descuentosExtras
              }
              money={money}
            />
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

function formatMes(key) {
  try {
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

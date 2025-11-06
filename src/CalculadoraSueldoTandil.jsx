import React, { useState, useMemo, useEffect } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";
import comercio from "./datos/privados/comercio_130_75.json";

export default function CalculadoraSueldoTandil() {
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipio");
  const [mes, setMes] = useState("2025-10");

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
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(v) || 0);

  const onFocusZero = (e) => {
    if (e.target.value === "0") e.target.value = "";
  };
  const onBlurZero = (e, setter) => {
    if (e.target.value === "") {
      e.target.value = "0";
      setter(0);
    }
  };

  useEffect(() => {
    setConvenio(sector === "publico" ? "municipio" : "comercio");
  }, [sector]);

  useEffect(() => {
    setCategoria(
      tieneEscalas
        ? Object.keys(datosConvenio.escalas?.[mes]?.categoria || {})[0]
        : Object.keys(datosConvenio.basicos || {})[0]
    );
    setRegimen(sector === "privado" ? "48" : regimen);
  }, [convenio, mes]);

  let basico = 0,
    presentismo = 0,
    antiguedad = 0,
    tituloAd = 0,
    funcionAd = 0,
    adicionalHorario = 0,
    hex50 = 0,
    hex100 = 0,
    noRemuFijo = 0,
    totalRemu = 0,
    totalNoRemu = 0,
    desc1 = 0,
    desc2 = 0,
    desc3 = 0,
    liquido = 0;

  const valorHora = (base, hs) => base / (hs * 4.33);

  if (!tieneEscalas) {
    basico = datosConvenio.basicos[categoria] || 0;
    const plus = datosConvenio.plusHorarios?.[regimen] || 0;
    adicionalHorario = basico * plus;
    antiguedad = basico * 0.02 * aniosAntiguedad;

    const esCargoPolitico =
      datosConvenio.cargosPoliticos?.map(String).includes(String(categoria)) || false;
    presentismo = esCargoPolitico ? 0 : 50000;

    tituloAd =
      titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
    funcionAd = basico * (funcion / 100);

    const hs = regimen === "40" ? 40 : regimen === "48" ? 48 : 35;
    const vh = valorHora(basico + adicionalHorario, hs);
    hex50 = vh * 1.5 * horas50;
    hex100 = vh * 2 * horas100;

    totalRemu =
      basico + adicionalHorario + antiguedad + presentismo + tituloAd + funcionAd + hex50 + hex100;

    totalNoRemu = noRemunerativo;

    desc1 = totalRemu * 0.14;
    desc2 = totalRemu * 0.048;

    const extras = Number(descuentosExtras) || 0;
    liquido = totalRemu + totalNoRemu - (desc1 + desc2 + extras);

  } else {
    const escala = datosConvenio.escalas[mes];
    basico = escala.categoria[categoria];
    noRemuFijo = escala.sumas_no_remunerativas_fijas || 0;

    antiguedad = (basico + noRemuFijo) * aniosAntiguedad * 0.01;
    presentismo = (basico + antiguedad + noRemuFijo) / 12;

    tituloAd =
      titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
    funcionAd = basico * (funcion / 100);

    const vh = valorHora(basico, 48);
    hex50 = vh * 1.5 * horas50;
    hex100 = vh * 2 * horas100;

    totalRemu = basico + antiguedad + presentismo + tituloAd + funcionAd + hex50 + hex100;
    totalNoRemu = noRemuFijo + noRemunerativo;

    desc1 = totalRemu * 0.11;
    desc2 = totalRemu * 0.03;
    desc3 = totalRemu * 0.02;

    const extras = Number(descuentosExtras) || 0;
    liquido = totalRemu + totalNoRemu - (desc1 + desc2 + desc3 + extras);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-800 text-white p-4 text-center text-xl font-semibold">
        Calculadora de Sueldos
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">

        {/* --- PARÁMETROS --- */}
        <section className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Parámetros</h2>

          <label>Sector</label>
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-2 border rounded mb-3">
            <option value="publico">Administración Central</option>
            <option value="privado">Privado</option>
          </select>

          <label>Convenio</label>
          <select value={convenio} onChange={(e) => setConvenio(e.target.value)} className="w-full p-2 border rounded mb-3">
            {Object.keys(convenios[sector]).map((c) => (
              <option key={c} value={c}>{convenios[sector][c].nombre}</option>
            ))}
          </select>

          {tieneEscalas && (
            <>
              <label>Mes</label>
              <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full p-2 border rounded mb-3">
                {Object.keys(datosConvenio.escalas).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </>
          )}

          <label>Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-2 border rounded mb-3">
            {tieneEscalas
              ? Object.keys(datosConvenio.escalas[mes].categoria).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
              : Object.keys(datosConvenio.basicos).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
          </select>

          <label>Años de antigüedad</label>
          <input type="number" value={aniosAntiguedad} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setAniosAntiguedad)} onChange={(e) => setAniosAntiguedad(Number(e.target.value))} className="w-full p-2 border rounded mb-3"/>

          {!tieneEscalas && (
            <>
              <label>Régimen horario semanal</label>
              <select value={regimen} onChange={(e) => setRegimen(e.target.value)} className="w-full p-2 border rounded mb-3">
                <option value="35">35 hs</option>
                <option value="40">40 hs</option>
                <option value="48">48 hs</option>
              </select>
            </>
          )}

          <label>Adicional por título</label>
          <select value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full p-2 border rounded mb-3">
            <option value="ninguno">Sin título</option>
            <option value="terciario">Terciario / Técnico (15%)</option>
            <option value="universitario">Universitario (20%)</option>
          </select>

          <label>Bonificación por función (%)</label>
          <input type="number" value={funcion} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setFuncion)} onChange={(e) => setFuncion(Number(e.target.value))} className="w-full p-2 border rounded mb-3"/>

          <label>Horas extras 50%</label>
          <input type="number" value={horas50} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setHoras50)} onChange={(e) => setHoras50(Number(e.target.value))} className="w-full p-2 border rounded mb-3"/>

          <label>Horas extras 100%</label>
          <input type="number" value={horas100} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setHoras100)} onChange={(e) => setHoras100(Number(e.target.value))} className="w-full p-2 border rounded mb-3"/>

          <label>Descuentos adicionales ($)</label>
          <input type="number" value={descuentosExtras} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setDescuentosExtras)} onChange={(e) => setDescuentosExtras(Number(e.target.value))} className="w-full p-2 border rounded mb-3"/>

          <label>No remunerativo / Premio ($)</label>
          <input type="number" value={noRemunerativo} onFocus={onFocusZero} onBlur={(e) => onBlurZero(e, setNoRemunerativo)} onChange={(e) => setNoRemunerativo(Number(e.target.value))} className="w-full p-2 border rounded mb-4"/>

          <button onClick={() => {
            setAniosAntiguedad(0);
            setTitulo("ninguno");
            setFuncion(0);
            setHoras50(0);
            setHoras100(0);
            setNoRemunerativo(0);
            setDescuentosExtras(0);
          }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg w-full">
            Limpiar formulario
          </button>

          <button onClick={() => setMostrarModal(true)} className="mt-3 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg w-full">
            Reportar error / sugerencia
          </button>
        </section>

        {/* --- RESULTADOS --- */}
        <section className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Resultado</h2>

          <p><strong>Básico:</strong> ${money(basico)}</p>
          <p><strong>Antigüedad:</strong> ${money(antiguedad)}</p>
          <p><strong>Presentismo:</strong> ${money(presentismo)}</p>
          <p><strong>Adicional horario:</strong> ${money(adicionalHorario)}</p>
          <p><strong>Título:</strong> ${money(tituloAd)}</p>
          <p><strong>Función:</strong> ${money(funcionAd)}</p>
          <p><strong>Horas 50%:</strong> ${money(hex50)}</p>
          <p><strong>Horas 100%:</strong> ${money(hex100)}</p>

          <hr className="my-3" />

          <p><strong>No remunerativo fijo:</strong> ${money(noRemuFijo)}</p>
          <p><strong>Otros no remunerativos:</strong> ${money(noRemunerativo)}</p>

          <hr className="my-3" />

          <p><strong>Descuentos:</strong></p>
          <p> - ${money(desc1 + desc2 + desc3 + descuentosExtras)}</p>

          <hr className="my-3" />

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

function ReportarModal({ descripcion, setDescripcion, mensajeEnviado, setMensajeEnviado, cerrar }) {
  const enviarReporte = async () => {
    if (!descripcion.trim()) return setMensajeEnviado("Por favor describa el problema.");
    try {
      const res = await fetch("/api/sendReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion }),
      });
      setMensajeEnviado(res.ok ? "Reporte enviado ✅" : "Error al enviar");
    } catch {
      setMensajeEnviado("Error de conexión");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center">
      <div className="bg-white p-5 rounded-xl shadow max-w-md w-full">
        <h2 className="font-semibold mb-3">Reportar error o sugerencia</h2>
        <textarea className="w-full border p-2 rounded mb-3 min-h-[120px]" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}/>
        {mensajeEnviado && <p className="text-sm mb-3">{mensajeEnviado}</p>}
        <button onClick={enviarReporte} className="bg-green-700 text-white px-4 py-2 rounded mr-2">Enviar</button>
        <button onClick={cerrar} className="bg-slate-300 px-4 py-2 rounded">Cerrar</button>
      </div>
    </div>
  );
}

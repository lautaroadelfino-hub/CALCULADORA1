import React, { useState } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";

export default function CalculadoraSueldoTandil() {
  const [organismo, setOrganismo] = useState("municipio");
  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");
  const [titulo, setTitulo] = useState("ninguno");
  const [jefatura, setJefatura] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState(null);

  // Selección dinámica del JSON según el organismo
  const datos =
    organismo === "municipio" ? municipio : organismo === "obras" ? obras : sisp;

  const basicos = datos.basicos || {};
  const plusHorarios = datos.plusHorarios || {};
  const cargosPoliticos = datos.cargosPoliticos || [];

  // ✅ siempre string-safe
  const basico = Number(basicos[categoria]) || 0;
  const adicionalHorario = basico * (plusHorarios[regimen] || 0);
  const antiguedad = basico * 0.02 * (Number(aniosAntiguedad) || 0);

  // ✅ Presentismo corregido
  const tienePresentismo =
    !cargosPoliticos
      .map((c) => String(c))
      .includes(String(categoria));

  const presentismo = tienePresentismo ? 50000 : 0;


  const adicionalTitulo =
    titulo === "terciario"
      ? basico * 0.15
      : titulo === "universitario"
      ? basico * 0.2
      : 0;

  const adicionalJefatura = basico * ((Number(jefatura) || 0) / 100);

  // horas
  const horasSemanales = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
  const valorHora = horasSemanales ? (basico + adicionalHorario) / (horasSemanales * 4.33) : 0;
  const horasExtras50 = valorHora * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHora * 2 * (Number(horas100) || 0);

  // total
  const remunerativo =
    basico +
    adicionalHorario +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalJefatura +
    horasExtras50 +
    horasExtras100;

  const aporteIPS = remunerativo * 0.14;
  const aporteIOMA = remunerativo * 0.048;
  const totalDescuentos = aporteIPS + aporteIOMA + (Number(descuentosExtras) || 0);
  const neto = remunerativo + (Number(noRemunerativo) || 0) - totalDescuentos;

  const round = (v) => (isNaN(v) ? 0 : Math.round(v * 100) / 100);

  const limpiarFormulario = () => {
    setCategoria(Object.keys(basicos)[0] || "1");
    setAniosAntiguedad(0);
    setRegimen("35");
    setTitulo("ninguno");
    setJefatura(0);
    setHoras50(0);
    setHoras100(0);
    setDescuentosExtras(0);
    setNoRemunerativo(0);
  };

  const enviarReporte = async () => {
    if (!descripcion.trim()) {
      setMensajeEnviado("⚠️ Por favor escribí una descripción del problema.");
      return;
    }

    try {
      const res = await fetch("/api/sendReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion }),
      });

      if (res.ok) {
        setMensajeEnviado("✅ Reporte enviado con éxito. ¡Gracias!");
        setDescripcion("");
      } else {
        setMensajeEnviado("❌ Error al enviar el reporte.");
      }
    } catch (err) {
      console.error(err);
      setMensajeEnviado("❌ Error de conexión.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-slate-50 rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">
        Calculadora de Sueldos — {datos.nombre}
      </h1>

      {/* Selector de organismo */}
      <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm">
        <label className="block text-sm font-medium">Organismo</label>
        <select
          value={organismo}
          onChange={(e) => {
            setOrganismo(e.target.value);
            setCategoria(Object.keys(basicos)[0] || "1");
          }}
          className="mt-1 w-full p-2 border rounded"
        >
          <option value="municipio">Municipio de Tandil</option>
          <option value="obras">Obras Sanitarias</option>
          <option value="sisp">Sistema Integrado de Salud Pública</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FORMULARIO */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <label className="block text-sm font-medium">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            {Object.keys(basicos).map((key) => (
              <option key={key} value={key}>
                {datos.nombre} — Cat. {key} (${basicos[key].toLocaleString()})
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium mt-3">
            Años de antigüedad
          </label>
          <input
            type="number"
            value={aniosAntiguedad}
            onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Régimen horario semanal
          </label>
          <select
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="35">35 hs (sin plus)</option>
            <option value="40">40 hs (+14,29%)</option>
            <option value="48">48 hs (+37,14%)</option>
          </select>

          <label className="block text-sm font-medium mt-3">
            Adicional por título
          </label>
          <select
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="ninguno">Sin título</option>
            <option value="terciario">Técnico/Terciario — 15%</option>
            <option value="universitario">Universitario/Posgrado — 20%</option>
          </select>

          <label className="block text-sm font-medium mt-3">
            Bonificación por jefatura (%)
          </label>
          <input
            type="number"
            value={jefatura}
            onChange={(e) => setJefatura(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Horas extras al 50%
          </label>
          <input
            type="number"
            value={horas50}
            onChange={(e) => setHoras50(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Horas extras al 100%
          </label>
          <input
            type="number"
            value={horas100}
            onChange={(e) => setHoras100(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Descuentos adicionales ($)
          </label>
          <input
            type="number"
            value={descuentosExtras}
            onChange={(e) => setDescuentosExtras(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Premio productividad / No remunerativo ($)
          </label>
          <input
            type="number"
            value={noRemunerativo}
            onChange={(e) => setNoRemunerativo(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <button
            onClick={limpiarFormulario}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600"
          >
            Limpiar formulario
          </button>
        </div>

        {/* RESULTADOS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-lg font-medium mb-2">
            Resumen de Cálculo ({datos.nombre})
          </h2>
          <p><strong>Básico:</strong> ${round(basico)}</p>
          <p><strong>Antigüedad:</strong> ${round(antiguedad)}</p>
          <p><strong>Adic. Horario:</strong> ${round(adicionalHorario)}</p>
          <p><strong>Adic. Título:</strong> ${round(adicionalTitulo)}</p>
          <p><strong>Jefatura:</strong> ${round(adicionalJefatura)}</p>
          <p><strong>Horas 50%:</strong> ${round(horasExtras50)}</p>
          <p><strong>Horas 100%:</strong> ${round(horasExtras100)}</p>
          <p><strong>Presentismo:</strong> ${round(presentismo)}</p>
          <hr className="my-2" />
          <p><strong>Total Remunerativo:</strong> ${round(remunerativo)}</p>
          <p><strong>No Remunerativo:</strong> ${round(noRemunerativo)}</p>
          <p><strong>IPS (14%):</strong> -${round(aporteIPS)}</p>
          <p><strong>IOMA (4,8%):</strong> -${round(aporteIOMA)}</p>
          <p><strong>Otros desc.:</strong> -${round(descuentosExtras)}</p>
          <hr className="my-2" />
          <p className="text-lg font-bold">Líquido a cobrar: ${round(neto)}</p>
        </div>
      </div>

      {/* BOTÓN REPORTAR */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-yellow-500 text-white px-5 py-2 rounded-xl hover:bg-yellow-600"
        >
          Reportar error o sugerencia
        </button>
      </div>

      {/* MODAL REPORTAR */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">
              Reportar error o sugerencia
            </h2>
            <textarea
              className="w-full border rounded p-2 min-h-[120px]"
              placeholder="Describí el problema o sugerencia..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            {mensajeEnviado && (
              <p className="mt-2 text-sm text-slate-700">{mensajeEnviado}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-3 py-2 bg-slate-200 rounded hover:bg-slate-300"
              >
                Cerrar
              </button>
              <button
                onClick={enviarReporte}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

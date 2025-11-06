import React, { useState, useEffect } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";

// Versión v7.7 — Estética mejorada, sin emojis, título simple, formateo AR
export default function CalculadoraSueldo() {
  const [organismo, setOrganismo] = useState("municipio");
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

  // Datos dinámicos por organismo
  const datos = organismo === "municipio" ? municipio : organismo === "obras" ? obras : sisp;
  const basicos = datos.basicos || {};
  const plusHorarios = datos.plusHorarios || {};
  const cargosPoliticos = datos.cargosPoliticos || [];

  // Formateo AR
  const formatear = (valor) =>
    new Intl.NumberFormat("es-AR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);

  // Cálculos
  const basico = Number(basicos[categoria]) || 0;
  const adicionalHorario = basico * (plusHorarios[regimen] || 0);
  const antiguedad = basico * 0.02 * (Number(aniosAntiguedad) || 0);

  // Presentismo: cargos políticos no cobran (comparación segura por string)
  const tienePresentismo = !cargosPoliticos.map(String).includes(String(categoria));
  const presentismo = tienePresentismo ? 50000 : 0;

  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;

  const adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

  // Valor hora según régimen (promedio 4.33 semanas/mes)
  const horasSemanales = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
  const valorHora = horasSemanales > 0 ? (basico + adicionalHorario) / (horasSemanales * 4.33) : 0;
  const horasExtras50 = valorHora * 1.5 * (Number(horas50) || 0);
  const horasExtras100 = valorHora * 2 * (Number(horas100) || 0);

  const totalRemunerativo =
    basico +
    adicionalHorario +
    antiguedad +
    presentismo +
    adicionalTitulo +
    adicionalFuncion +
    horasExtras50 +
    horasExtras100;

  const totalNoRemunerativo = Number(noRemunerativo) || 0;
  const aporteIPS = totalRemunerativo * 0.14;
  const aporteIOMA = totalRemunerativo * 0.048;
  const totalDeducciones = aporteIPS + aporteIOMA + (Number(descuentosExtras) || 0);
  const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

  // UX: manejo de focus en inputs numéricos (borrar 0 por defecto)
  const handleFocus = (e) => {
    if (e.target.value === "0") e.target.value = "";
  };
  const handleBlur = (e, setter) => {
    if (e.target.value === "") {
      e.target.value = 0;
      setter(0);
    }
  };

  // Reset
  const limpiarFormulario = () => {
    setCategoria(Object.keys(basicos)[0] || "1");
    setAniosAntiguedad(0);
    setRegimen("35");
    setTitulo("ninguno");
    setFuncion(0);
    setHoras50(0);
    setHoras100(0);
    setDescuentosExtras(0);
    setNoRemunerativo(0);
  };

  // Reporte interno (Vercel Function /api/sendReport)
  const enviarReporte = async () => {
    if (!descripcion.trim()) {
      setMensajeEnviado("Por favor escriba una descripción del problema.");
      return;
    }
    try {
      const res = await fetch("/api/sendReport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion }),
      });
      if (res.ok) {
        setMensajeEnviado("Reporte enviado con éxito. Gracias.");
        setDescripcion("");
      } else {
        setMensajeEnviado("Error al enviar el reporte.");
      }
    } catch (e) {
      setMensajeEnviado("Error de conexión.");
    }
  };

  // Sincronizar categoría al cambiar organismo
  useEffect(() => {
    setCategoria(Object.keys(basicos)[0] || "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organismo]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header simple, institucional */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Calculadora de Sueldos</h1>
          <p className="text-sm text-blue-100 mt-1">Simulación salarial — valores parametrizables por organismo</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de selección y datos */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-sm uppercase tracking-wider text-slate-500 border-b pb-2 mb-3">Parámetros</h2>

          {/* Organismo */}
          <label className="block text-sm font-medium">Organismo</label>
          <select
            value={organismo}
            onChange={(e) => setOrganismo(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="municipio">Administración Central</option>
            <option value="obras">Obras Sanitarias</option>
            <option value="sisp">Sistema Integrado de Salud Pública</option>
          </select>

          {/* Categoría */}
          <label className="block text-sm font-medium mt-4">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            {Object.keys(basicos).map((key) => (
              <option key={key} value={key}>
                {datos.nombre} — Cat. {key} (${formatear(basicos[key])})
              </option>
            ))}
          </select>

          {/* Antigüedad */}
          <label className="block text-sm font-medium mt-4">Años de antigüedad</label>
          <input
            type="number"
            value={aniosAntiguedad}
            onFocus={handleFocus}
            onBlur={(e) => handleBlur(e, setAniosAntiguedad)}
            onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          {/* Régimen */}
          <label className="block text-sm font-medium mt-4">Régimen horario semanal</label>
          <select
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="35">35 hs (sin plus)</option>
            <option value="40">40 hs (+14,29%)</option>
            <option value="48">48 hs (+37,14%)</option>
          </select>

          {/* Título */}
          <label className="block text-sm font-medium mt-4">Adicional por título</label>
          <select
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="ninguno">Sin título</option>
            <option value="terciario">Técnico/Terciario — 15%</option>
            <option value="universitario">Universitario/Posgrado — 20%</option>
          </select>

          {/* Bonificación por función */}
          <label className="block text-sm font-medium mt-4">Bonificación por función (%)</label>
          <input
            type="number"
            value={funcion}
            onFocus={handleFocus}
            onBlur={(e) => handleBlur(e, setFuncion)}
            onChange={(e) => setFuncion(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          {/* Horas extras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium">Horas extras al 50%</label>
              <input
                type="number"
                value={horas50}
                onFocus={handleFocus}
                onBlur={(e) => handleBlur(e, setHoras50)}
                onChange={(e) => setHoras50(Number(e.target.value))}
                className="mt-1 w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Horas extras al 100%</label>
              <input
                type="number"
                value={horas100}
                onFocus={handleFocus}
                onBlur={(e) => handleBlur(e, setHoras100)}
                onChange={(e) => setHoras100(Number(e.target.value))}
                className="mt-1 w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Descuentos y NR */}
          <label className="block text-sm font-medium mt-4">Descuentos adicionales ($)</label>
          <input
            type="number"
            value={descuentosExtras}
            onFocus={handleFocus}
            onBlur={(e) => handleBlur(e, setDescuentosExtras)}
            onChange={(e) => setDescuentosExtras(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-4">Premio productividad / No remunerativo ($)</label>
          <input
            type="number"
            value={noRemunerativo}
            onFocus={handleFocus}
            onBlur={(e) => handleBlur(e, setNoRemunerativo)}
            onChange={(e) => setNoRemunerativo(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <button
            onClick={limpiarFormulario}
            className="mt-5 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
          >
            Limpiar formulario
          </button>
        </section>

        {/* Resumen */}
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-sm uppercase tracking-wider text-slate-500 border-b pb-2 mb-3">Resumen de cálculo</h2>

          {/* Remunerativos */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-700 mb-2">Remunerativos</h3>
            <div className="space-y-1 text-slate-700">
              <p>Básico: ${formatear(basico)}</p>
              <p>Antigüedad: ${formatear(antiguedad)}</p>
              <p>Adicional horario: ${formatear(adicionalHorario)}</p>
              <p>Adicional por título: ${formatear(adicionalTitulo)}</p>
              <p>Bonificación por función: ${formatear(adicionalFuncion)}</p>
              <p>Horas extras 50%: ${formatear(horasExtras50)}</p>
              <p>Horas extras 100%: ${formatear(horasExtras100)}</p>
              <p>Presentismo: ${formatear(presentismo)}</p>
            </div>
            <p className="mt-2 font-semibold text-slate-800">Total remunerativo: ${formatear(totalRemunerativo)}</p>
          </div>

          {/* No remunerativos */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-700 mb-2">No remunerativos</h3>
            <p>Premios / Productividad: ${formatear(noRemunerativo)}</p>
            <p className="mt-2 font-semibold text-slate-800">Total no remunerativo: ${formatear(totalNoRemunerativo)}</p>
          </div>

          {/* Deducciones */}
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-700 mb-2">Deducciones</h3>
            <div className="space-y-1 text-slate-700">
              <p>IPS (14%): -${formatear(aporteIPS)}</p>
              <p>IOMA (4,8%): -${formatear(aporteIOMA)}</p>
              <p>Otros descuentos: -${formatear(descuentosExtras)}</p>
            </div>
            <p className="mt-2 font-semibold text-slate-800">Total deducciones: -${formatear(totalDeducciones)}</p>
          </div>

          <hr className="my-4" />
          <p className="text-xl font-bold text-green-700">Líquido a cobrar: ${formatear(liquido)}</p>
        </section>
      </main>

      {/* Reporte */}
      <div className="max-w-6xl mx-auto px-6 mt-2 mb-10 text-center">
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-amber-500 text-white px-5 py-2 rounded-xl hover:bg-amber-600 transition"
        >
          Reportar error o sugerencia
        </button>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Reportar error o sugerencia</h2>
            <textarea
              className="w-full border rounded p-2 min-h-[120px]"
              placeholder="Describa el problema o sugerencia..."
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

      {/* Footer institucional sin nombres propios */}
      <footer className="border-t mt-8 py-6 text-center text-sm text-slate-500 bg-white">
        © 2025 — Calculadora de Sueldos
      </footer>
    </div>
  );
}

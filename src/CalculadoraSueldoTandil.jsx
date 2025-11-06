import React, { useState } from "react";
import sueldosData from "./datos/sueldos.json";

export default function CalculadoraSueldoTandil() {
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

  const basicos = sueldosData.basicos;
  const plusHorarios = sueldosData.plusHorarios;
  const cargosPoliticos = sueldosData.cargosPoliticos;

  const basico = basicos[categoria] || 0;
  const adicionalHorario = basico * plusHorarios[regimen];
  const antiguedad = basico * 0.02 * aniosAntiguedad;
  const presentismo = cargosPoliticos.includes(Number(categoria)) ? 0 : 50000;
  const adicionalTitulo =
    titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.20 : 0;
  const adicionalJefatura = basico * (jefatura / 100);
  const horasSemanales = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
  const valorHora = (basico + adicionalHorario) / (horasSemanales * 4.33);
  const horasExtras50 = valorHora * 1.5 * horas50;
  const horasExtras100 = valorHora * 2 * horas100;

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
  const totalDescuentos = aporteIPS + aporteIOMA + Number(descuentosExtras);
  const neto = remunerativo + Number(noRemunerativo) - totalDescuentos;

  const round = (v) => Math.round(v * 100) / 100;

  const limpiarFormulario = () => {
    setCategoria("1");
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
        Calculadora de Sueldos — Municipio de Tandil
      </h1>

      {/* FORM PRINCIPAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          {/* ... (todos los inputs igual que antes) ... */}

          <button
            onClick={limpiarFormulario}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600"
          >
            Limpiar formulario
          </button>
        </div>

        {/* RESULTADOS */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          {/* ... (resumen igual que antes) ... */}
          <p className="text-lg font-bold">Líquido a cobrar: ${round(neto)}</p>
        </div>
      </div>

      {/* BOTÓN REPORTE */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setMostrarModal(true)}
          className="bg-yellow-500 text-white px-5 py-2 rounded-xl hover:bg-yellow-600"
        >
          Reportar error o sugerencia
        </button>
      </div>

      {/* MODAL REPORTE */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow max-w-md w-full">
            <h2 className="text-lg font-semibold mb-2">Reportar error o sugerencia</h2>
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

      <div className="mt-4 text-sm text-slate-600">
        <p>
          💡 Cálculo basado en los básicos vigentes al 1° de octubre de 2025 según Anexo I del CCT Municipal y Decreto correspondiente. 
          Esta herramienta es una simulación informativa y no sustituye la liquidación oficial.
        </p>
      </div>
    </div>
  );
}

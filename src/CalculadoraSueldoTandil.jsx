import React, { useState } from "react";
import sueldosData from "./datos/sueldos.json";

// Calculadora de Sueldos - Municipio de Tandil (v5 base - sin campo nombre)

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

  return (
    <div className="max-w-5xl mx-auto p-6 bg-slate-50 rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">
        Calculadora de Sueldos — Municipio de Tandil
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* IZQUIERDA: Inputs */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <label className="block text-sm font-medium">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            {Object.keys(basicos).map((key) => (
              <option key={key} value={key}>
                Categoría {key} — ${basicos[key].toLocaleString()}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium mt-3">Años de antigüedad</label>
          <input
            type="number"
            value={aniosAntiguedad}
            onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">Régimen horario semanal</label>
          <select
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="35">35 hs (sin plus)</option>
            <option value="40">40 hs (+14,29%)</option>
            <option value="48">48 hs (+37,14%)</option>
          </select>

          <label className="block text-sm font-medium mt-3">Título</label>
          <select
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="mt-1 w-full p-2 border rounded"
          >
            <option value="ninguno">Sin título</option>
            <option value="terciario">Técnico / Terciario (15%)</option>
            <option value="universitario">Universitario / Posgrado (20%)</option>
          </select>

          <label className="block text-sm font-medium mt-3">Bonificación por función/jefatura (%)</label>
          <input
            type="number"
            value={jefatura}
            onChange={(e) => setJefatura(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">Horas extras al 50%</label>
          <input
            type="number"
            value={horas50}
            onChange={(e) => setHoras50(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">Horas extras al 100%</label>
          <input
            type="number"
            value={horas100}
            onChange={(e) => setHoras100(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">Descuentos adicionales ($)</label>
          <input
            type="number"
            value={descuentosExtras}
            onChange={(e) => setDescuentosExtras(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          <label className="block text-sm font-medium mt-3">
            Premio productividad / suma no remunerativa ($)
          </label>
          <input
            type="number"
            value={noRemunerativo}
            onChange={(e) => setNoRemunerativo(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
          />

          {/* Botón limpiar */}
          <button
            onClick={limpiarFormulario}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600"
          >
            Limpiar formulario
          </button>
        </div>

        {/* DERECHA: Resultados */}
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-lg font-medium mb-2">Resumen de Cálculo</h2>
          <p><strong>Básico:</strong> ${round(basico)}</p>
          <p><strong>Antigüedad ({aniosAntiguedad} años):</strong> ${round(antiguedad)}</p>
          {presentismo > 0 ? (
            <p><strong>Presentismo:</strong> ${presentismo}</p>
          ) : (
            <p className="text-slate-500 text-sm">(Sin presentismo por cargo político)</p>
          )}
          <p><strong>Plus horario:</strong> ${round(adicionalHorario)}</p>
          <p><strong>Adic. Título:</strong> ${round(adicionalTitulo)}</p>
          <p><strong>Jefatura:</strong> ${round(adicionalJefatura)}</p>
          <p><strong>Horas 50%:</strong> ${round(horasExtras50)}</p>
          <p><strong>Horas 100%:</strong> ${round(horasExtras100)}</p>
          <hr className="my-2" />
          <p><strong>Total Remunerativo:</strong> ${round(remunerativo)}</p>
          <p><strong>Total No Remunerativo:</strong> ${round(noRemunerativo)}</p>
          <p><strong>IPS (14%):</strong> -${round(aporteIPS)}</p>
          <p><strong>IOMA (4,8%):</strong> -${round(aporteIOMA)}</p>
          <p><strong>Descuentos adicionales:</strong> -${round(descuentosExtras)}</p>
          <hr className="my-2" />
          <p className="text-lg font-bold">Líquido a cobrar: ${round(neto)}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <p>💡 Cálculo basado en los básicos vigentes al 1° de octubre de 2025 según Anexo I del CCT Municipal y Decreto correspondiente. Esta herramienta es una simulación informativa y no sustituye la liquidación oficial.</p>
      </div>
    </div>
  );
}

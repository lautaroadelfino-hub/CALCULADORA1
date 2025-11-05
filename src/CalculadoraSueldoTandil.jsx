import React, { useState } from "react";

export default function CalculadoraSueldoTandil() {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");

  const basicos = {
    1: 701459.89,
    2: 704318.75,
    3: 716126.83,
    4: 727955.21,
    5: 727955.21,
    6: 734791.48,
    7: 740893.35,
    8: 758083.68,
    9: 763816.05,
    10: 808793.05,
    11: 823481.78,
    12: 855367.81,
    13: 883311.74,
    14: 980522.21,
    15: 1050829.89,
    16: 1250429.27,
    17: 1323445.9,
    18: 1241858.92,
    19: 1563648.25,
    20: 1724543.56,
    21: 2046332.27,
    24: 1628006.95,
    28: 1033803.7,
    713: 3325038.89,
  };

  const plusHorarios = {
    35: 0.0,
    40: 0.1429,
    48: 0.3714,
  };

  const cargosPoliticos = [18, 19, 20, 21, 24, 28, 713];

  const basico = basicos[categoria] || 0;
  const adicionalHorario = basico * plusHorarios[regimen];
  const antiguedad = basico * 0.02 * aniosAntiguedad;
  const presentismo = cargosPoliticos.includes(Number(categoria)) ? 0 : 50000;
  const remunerativo = basico + adicionalHorario + antiguedad + presentismo;
  const aporteIPS = remunerativo * 0.14;
  const aporteIOMA = remunerativo * 0.048;
  const totalDescuentos = aporteIPS + aporteIOMA;
  const neto = remunerativo - totalDescuentos;

  const round = (v) => Math.round(v * 100) / 100;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 rounded-2xl shadow">
      <h1 className="text-2xl font-semibold mb-4">Calculadora de Sueldos — Municipio de Tandil</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <label className="block text-sm font-medium">Nombre del trabajador</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full p-2 border rounded" />
          <label className="block text-sm font-medium mt-3">Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 w-full p-2 border rounded">
            {Object.keys(basicos).map((key) => (
              <option key={key} value={key}>Categoría {key} — ${basicos[key].toLocaleString()}</option>
            ))}
          </select>
          <label className="block text-sm font-medium mt-3">Años de antigüedad</label>
          <input type="number" value={aniosAntiguedad} onChange={(e) => setAniosAntiguedad(Number(e.target.value))} className="mt-1 w-full p-2 border rounded" />
          <label className="block text-sm font-medium mt-3">Régimen horario semanal</label>
          <select value={regimen} onChange={(e) => setRegimen(e.target.value)} className="mt-1 w-full p-2 border rounded">
            <option value="35">35 hs (sin plus)</option>
            <option value="40">40 hs (+14,29%)</option>
            <option value="48">48 hs (+37,14%)</option>
          </select>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-lg font-medium mb-2">Resumen de Cálculo</h2>
          <p><strong>Básico:</strong> ${round(basico)}</p>
          <p><strong>Antigüedad ({aniosAntiguedad} años):</strong> ${round(antiguedad)}</p>
          {presentismo > 0 ? (
            <p><strong>Presentismo:</strong> ${presentismo}</p>
          ) : (
            <p className="text-slate-500 text-sm">(Sin presentismo por cargo político)</p>
          )}
          <p><strong>Plus por régimen horario:</strong> ${round(adicionalHorario)}</p>
          <hr className="my-2" />
          <p><strong>Total remunerativo:</strong> ${round(remunerativo)}</p>
          <p><strong>Descuento IPS (14%):</strong> -${round(aporteIPS)}</p>
          <p><strong>Descuento IOMA (4,8%):</strong> -${round(aporteIOMA)}</p>
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

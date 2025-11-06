import React, { useState, useMemo, useEffect } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";
import { loadEscalasComercio } from "./utils/loadEscalasComercio";

export default function CalculadoraSueldoTandil() {
  // Estado UI
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipio");
  const [mes, setMes] = useState("");

  // Parámetros
  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35");
  const [titulo, setTitulo] = useState("ninguno");
  const [funcion, setFuncion] = useState(0);
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  // Modal reporte
  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState(null);

  // Escalas comercio desde Google Sheets
  const [comercioEscalas, setComercioEscalas] = useState(null);
  useEffect(() => {
    loadEscalasComercio().then(setComercioEscalas);
  }, []);

  const convenios = useMemo(() => ({
    publico: { municipio, obras, sisp },
    privado: comercioEscalas ? { comercio: { nombre: "Empleados de Comercio", escalas: comercioEscalas } } : {}
  }), [comercioEscalas]);

  // Obtener convenio actual y si tiene escalas
  const datosConvenio = convenios[sector]?.[convenio] || {};
  const tieneEscalas = Boolean(datosConvenio?.escalas);

  const money = (v) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(Number(v) || 0);

  const onFocusZero = (e) => { if (e.target.value === "0") e.target.value = ""; };
  const onBlurZero = (e, setter) => { if (e.target.value === "") { e.target.value = "0"; setter(0); } };

  useEffect(() => {
    setConvenio(sector === "publico" ? "municipio" : "comercio");
  }, [sector]);

  useEffect(() => {
    if (!datosConvenio) return;
    if (tieneEscalas) {
      const meses = Object.keys(datosConvenio.escalas);
      const mesValido = meses.includes(mes) ? mes : meses[0];
      setMes(mesValido);
      const firstCat = Object.keys(datosConvenio.escalas[mesValido].categoria || {})[0] || "1";
      setCategoria(firstCat);
      setRegimen(sector === "privado" ? "48" : "35");
    } else {
      const firstCat = Object.keys(datosConvenio.basicos || {})[0] || "1";
      setCategoria(firstCat);
      setRegimen("35");
      setMes("");
    }
  }, [convenio, sector]);

  useEffect(() => {
    if (!tieneEscalas) return;
    const esc = datosConvenio?.escalas?.[mes];
    if (esc && !esc.categoria[categoria]) {
      const first = Object.keys(esc.categoria)[0];
      setCategoria(first);
    }
  }, [mes, categoria]);

  const valorHora = (base, horasSem) => (horasSem ? base / (horasSem * 4.33) : 0);

  let basico = 0, adicionalHorario = 0, antiguedadPesos = 0, presentismoPesos = 0,
    adicionalTitulo = 0, adicionalFuncion = 0, horasExtras50 = 0, horasExtras100 = 0,
    totalRemunerativo = 0, totalNoRemunerativo = 0, liquido = 0, noRemuFijo = 0;

  const escalaActual = tieneEscalas ? (datosConvenio.escalas?.[mes] || null) : null;

  if (sector === "publico") {
    if (escalaActual) {
      basico = Number(escalaActual.categoria?.[categoria]) || 0;
      adicionalHorario = basico * (Number(escalaActual.plusHorarios?.[regimen]) || 0);
      antiguedadPesos = basico * ((Number(escalaActual.antiguedad_porcentaje) || 0.02) * aniosAntiguedad);
      presentismoPesos = Number(escalaActual.presentismo_fijo) || 0;
      adicionalTitulo = titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
      adicionalFuncion = basico * ((funcion || 0) / 100);
      const vh = valorHora(basico + adicionalHorario, { 35: 35, 40: 40, 48: 48 }[regimen]);
      horasExtras50 = vh * 1.5 * horas50;
      horasExtras100 = vh * 2 * horas100;
    }
    totalRemunerativo = basico + adicionalHorario + antiguedadPesos + presentismoPesos + adicionalTitulo + adicionalFuncion + horasExtras50 + horasExtras100;
    totalNoRemunerativo = noRemunerativo;
    liquido = totalRemunerativo + totalNoRemunerativo - (totalRemunerativo * 0.14 + totalRemunerativo * 0.048 + descuentosExtras);

  } else {
    if (escalaActual) {
      basico = Number(escalaActual.categoria?.[categoria]) || 0;
      noRemuFijo = Number(escalaActual.sumas_no_remunerativas_fijas) || 0;
      antiguedadPesos = basico * (aniosAntiguedad * 0.01);
      presentismoPesos = (basico + antiguedadPesos) / 12;
      adicionalTitulo = titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
      adicionalFuncion = basico * ((funcion || 0) / 100);
      const vh = valorHora(basico, 48);
      horasExtras50 = vh * 1.5 * horas50;
      horasExtras100 = vh * 2 * horas100;
    }

    totalRemunerativo = basico + antiguedadPesos + presentismoPesos + adicionalTitulo + adicionalFuncion + horasExtras50 + horasExtras100;
    totalNoRemunerativo = noRemuFijo + noRemunerativo;

    const baseRem = totalRemunerativo;
    const baseTotal = totalRemunerativo + totalNoRemunerativo;

    liquido = baseTotal - (
      baseRem * 0.11 +
      baseRem * 0.03 +
      baseTotal * 0.03 +
      baseTotal * 0.02 +
      baseTotal * 0.005 +
      descuentosExtras
    );
  }

  const opcionesConvenio = Object.keys(convenios[sector]).map((k) => ({ key: k, nombre: convenios[sector][k].nombre }));
  const mesesDisponibles = tieneEscalas ? Object.keys(datosConvenio.escalas || {}) : [];
  const ready = !tieneEscalas || escalaActual;

  // ✅ AQUÍ está el fix correcto:
  if (sector === "privado" && !comercioEscalas) {
    return <div className="p-6 text-center text-slate-600">Cargando escalas salariales desde Google Sheets...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ---- resto del JSX SE MANTIENE IGUAL ---- */}

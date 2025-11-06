import React, { useEffect, useMemo, useState } from "react";
import municipio from "./datos/municipio.json";
import obras from "./datos/obras_sanitarias.json";
import sisp from "./datos/sisp.json";
import comercio from "./datos/privados/comercio_130_75.json";

// v8.0 — Multi-CCT, multi-mes. 
// - Sector: Público/Privado
// - Convenio: Municipales (3) + Comercio 130/75 (privado)
// - Mes: aplica para convenios con escalas versionadas (Comercio)
// - Cálculos separados por convenio (no mezclar lógicas)

export default function CalculadoraSueldoTandil() {
  // ===== UI STATE =====
  const [sector, setSector] = useState("publico");
  const [convenio, setConvenio] = useState("municipio"); // clave dentro del mapa
  const [mes, setMes] = useState("2025-10"); // aplica cuando el convenio tiene escalas

  const [categoria, setCategoria] = useState("1");
  const [aniosAntiguedad, setAniosAntiguedad] = useState(0);
  const [regimen, setRegimen] = useState("35"); // Para públicos; en privados (Comercio) se bloquea a 48hs
  const [titulo, setTitulo] = useState("ninguno");
  const [funcion, setFuncion] = useState(0); // % sobre básico (si aplica)
  const [horas50, setHoras50] = useState(0);
  const [horas100, setHoras100] = useState(0);
  const [descuentosExtras, setDescuentosExtras] = useState(0);
  const [noRemunerativo, setNoRemunerativo] = useState(0);

  // Reporte interno
  const [mostrarModal, setMostrarModal] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensajeEnviado, setMensajeEnviado] = useState<string | null>(null);

  // ===== DATA MAP =====
  // Mapa de convenios por sector. Claves coinciden con el estado 'convenio'.
  const convenios = useMemo(
    () => ({
      publico: {
        municipio,
        obras,
        sisp,
      },
      privado: {
        comercio, // CCT 130/75 (multi-mes)
      },
    }),
    []
  );

  const datosConvenio: any = convenios[sector][convenio];
  const esPrivado = sector === "privado";
  const tieneEscalas = Boolean(datosConvenio?.escalas);

  // ===== FORMATEO =====
  const money = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(v) ? v : 0);

  // ===== INPUT UX (borrar 0 al enfocar) =====
  const onFocusZero = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") e.target.value = "";
  };
  const onBlurZero = (
    e: React.FocusEvent<HTMLInputElement>,
    setter: (n: number) => void
  ) => {
    if (e.target.value === "") {
      e.target.value = "0";
      setter(0);
    }
  };

  // ===== FUENTES DE BÁSICOS Y PARÁMETROS SEGÚN CONVENIO =====
  // Para convenios sin "escalas" (públicos): estructura histórica de tu app
  const publicos = useMemo(() => {
    if (tieneEscalas) return null;
    const basicos = datosConvenio?.basicos ?? {};
    const plusHorarios = datosConvenio?.plusHorarios ?? {}; // {35,40,48}
    const cargosPoliticos: (string | number)[] = datosConvenio?.cargosPoliticos ?? [];
    return { basicos, plusHorarios, cargosPoliticos };
  }, [datosConvenio, tieneEscalas]);

  // Para convenios con escalas (Comercio 130/75)
  const privados = useMemo(() => {
    if (!tieneEscalas) return null;
    const escala = datosConvenio.escalas?.[mes] ?? {};
    const basicos = escala.categoria ?? {}; // claves: administrativo_a, etc.
    const sumaNoRemuFija = escala.sumas_no_remunerativas_fijas ?? 0;
    return { basicos, sumaNoRemuFija };
  }, [datosConvenio, tieneEscalas, mes]);

  // ===== SINCRONIZACIONES =====
  // Al cambiar sector, reestablecer convenio por defecto y limpieza
  useEffect(() => {
    setConvenio(sector === "publico" ? "municipio" : "comercio");
  }, [sector]);

  // Cuando cambia el convenio, setear categoría inicial y regimen acorde
  useEffect(() => {
    const b = tieneEscalas ? privados?.basicos : publicos?.basicos;
    const firstCat = b ? Object.keys(b)[0] : "1";
    setCategoria(firstCat);

    // En Comercio asumimos 48hs semanales y sin plus horario
    if (sector === "privado") {
      setRegimen("48");
    } else {
      // público: mantener user choice o default 35
      setRegimen((prev) => (prev === "48" || prev === "40" || prev === "35" ? prev : "35"));
    }
  }, [convenio, privados, publicos, sector, tieneEscalas]);

  // Al cambiar convenio con escalas, si el mes no existe aún, setear uno válido
  useEffect(() => {
    if (tieneEscalas) {
      const keys = Object.keys(datosConvenio.escalas || {});
      if (keys.length && !keys.includes(mes)) setMes(keys[0]);
    }
  }, [tieneEscalas, datosConvenio, mes]);

  // ===== CÁLCULOS =====
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
  let desc1 = 0, desc2 = 0, desc3 = 0; // descuentos según convenio

  // Valor hora (base) helper
  const valorHora = (base: number, horasSem: number) =>
    horasSem > 0 ? base / (horasSem * 4.33) : 0;

  if (!tieneEscalas) {
    // ===== MUNICIPALES / PÚBLICOS =====
    const bmap = publicos!.basicos;
    basico = Number(bmap?.[categoria]) || 0;

    // plus horario
    const plus = publicos!.plusHorarios?.[regimen] || 0;
    adicionalHorario = basico * plus;

    // antigüedad 2% por año sobre básico
    antiguedadPesos = basico * 0.02 * (Number(aniosAntiguedad) || 0);

    // presentismo fijo $50.000 excepto cargos políticos
    const esCargoPolitico = publicos!.cargosPoliticos.map(String).includes(String(categoria));
    presentismoPesos = esCargoPolitico ? 0 : 50000;

    // adicionales
    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    // horas extras: se toma (básico + plus horario)
    const horasSem = { 35: 35, 40: 40, 48: 48 }[regimen] || 35;
    const vh = valorHora(basico + adicionalHorario, horasSem);
    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
    horasExtras100 = vh * 2 * (Number(horas100) || 0);

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

    // Descuentos públicos: IPS 14% + IOMA 4.8%
    desc1 = totalRemunerativo * 0.14; // IPS
    desc2 = totalRemunerativo * 0.048; // IOMA
    // extras
    const extras = Number(descuentosExtras) || 0;

    const totalDeducciones = desc1 + desc2 + extras;
    const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

    // Render
    return (
      <Layout
        tituloHeader="Calculadora de Sueldos"
        sector={sector}
        setSector={setSector}
        convenio={convenio}
        setConvenio={setConvenio}
        convenios={convenios}
        tieneEscalas={false}
        mes={mes}
        setMes={setMes}
      >
        <PanelParametros
          datosNombre={datosConvenio?.nombre}
          categorias={bmap}
          categoria={categoria}
          setCategoria={setCategoria}
          aniosAntiguedad={aniosAntiguedad}
          setAniosAntiguedad={setAniosAntiguedad}
          regimen={regimen}
          setRegimen={setRegimen}
          titulo={titulo}
          setTitulo={setTitulo}
          funcion={funcion}
          setFuncion={setFuncion}
          horas50={horas50}
          setHoras50={setHoras50}
          horas100={horas100}
          setHoras100={setHoras100}
          descuentosExtras={descuentosExtras}
          setDescuentosExtras={setDescuentosExtras}
          noRemunerativo={noRemunerativo}
          setNoRemunerativo={setNoRemunerativo}
          bloquearRegimen={false}
          onFocusZero={onFocusZero}
          onBlurZero={onBlurZero}
          money={money}
        />

        <PanelResultados
          tituloResumen={datosConvenio?.nombre}
          bloques={{
            remunerativos: [
              ["Básico", basico],
              ["Antigüedad", antiguedadPesos],
              ["Adicional horario", adicionalHorario],
              ["Adicional por título", adicionalTitulo],
              ["Bonificación por función", adicionalFuncion],
              ["Horas extras 50%", horasExtras50],
              ["Horas extras 100%", horasExtras100],
              ["Presentismo", presentismoPesos],
            ],
            noRemu: [["Premios / Productividad", Number(noRemunerativo) || 0]],
            deducciones: [
              ["IPS (14%)", -desc1],
              ["IOMA (4,8%)", -desc2],
              ["Otros descuentos", -(Number(descuentosExtras) || 0)],
            ],
          }}
          totalRemu={totalRemunerativo}
          totalNoRemu={totalNoRemunerativo}
          totalDeducciones={desc1 + desc2 + (Number(descuentosExtras) || 0)}
          liquido={liquido}
          money={money}
        />

        <ReportarModal
          mostrar={mostrarModal}
          setMostrar={setMostrarModal}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          mensajeEnviado={mensajeEnviado}
          setMensajeEnviado={setMensajeEnviado}
        />
      </Layout>
    );
  } else {
    // ===== PRIVADOS / COMERCIO 130/75 =====
    const bmap = privados!.basicos;
    basico = Number(bmap?.[categoria]) || 0;

    // En comercio no hay plus horario, y regimen fijo 48hs (bloqueado UI)
    adicionalHorario = 0;

    const noRemuFijo = Number(privados!.sumaNoRemuFija) || 0;

    // Antigüedad: 1% sobre (básico + no remunerativo fijo) por año
    antiguedadPesos = (basico + noRemuFijo) * (Number(aniosAntiguedad) || 0) * 0.01;

    // Presentismo (art. 40): 8.33% del total (remu base + no remu + antigüedad)
    // Nota: muchas implementaciones toman 1/12 del total antes de presentismo.
    presentismoPesos = (basico + antiguedadPesos + noRemuFijo) / 12;

    // Adicional por título/función: no es estándar del CCT, se deja como opcional
    adicionalTitulo =
      titulo === "terciario" ? basico * 0.15 : titulo === "universitario" ? basico * 0.2 : 0;
    adicionalFuncion = basico * ((Number(funcion) || 0) / 100);

    // Horas extras: base sobre básico (sin plus horario), 48hs
    const horasSem = 48;
    const vh = valorHora(basico, horasSem);
    horasExtras50 = vh * 1.5 * (Number(horas50) || 0);
    horasExtras100 = vh * 2 * (Number(horas100) || 0);

    totalRemunerativo =
      basico +
      antiguedadPesos +
      presentismoPesos +
      adicionalTitulo +
      adicionalFuncion +
      horasExtras50 +
      horasExtras100;

    totalNoRemunerativo = noRemuFijo + (Number(noRemunerativo) || 0);

    // Descuentos Comercio (sobre remunerativo): 11% + 3% + 2%
    desc1 = totalRemunerativo * 0.11; // Jubilación
    desc2 = totalRemunerativo * 0.03; // Obra social
    desc3 = totalRemunerativo * 0.02; // FAECYS
    const extras = Number(descuentosExtras) || 0;

    const totalDeducciones = desc1 + desc2 + desc3 + extras;
    const liquido = totalRemunerativo + totalNoRemunerativo - totalDeducciones;

    // Render
    return (
      <Layout
        tituloHeader="Calculadora de Sueldos"
        sector={sector}
        setSector={setSector}
        convenio={convenio}
        setConvenio={setConvenio}
        convenios={convenios}
        tieneEscalas={true}
        mes={mes}
        setMes={setMes}
      >
        <PanelParametros
          datosNombre={`${datosConvenio?.nombre} — CCT ${datosConvenio?.cct}`}
          categorias={bmap}
          categoria={categoria}
          setCategoria={setCategoria}
          aniosAntiguedad={aniosAntiguedad}
          setAniosAntiguedad={setAniosAntiguedad}
          regimen={regimen}
          setRegimen={setRegimen}
          titulo={titulo}
          setTitulo={setTitulo}
          funcion={funcion}
          setFuncion={setFuncion}
          horas50={horas50}
          setHoras50={setHoras50}
          horas100={horas100}
          setHoras100={setHoras100}
          descuentosExtras={descuentosExtras}
          setDescuentosExtras={setDescuentosExtras}
          noRemunerativo={noRemunerativo}
          setNoRemunerativo={setNoRemunerativo}
          bloquearRegimen={true}
          onFocusZero={onFocusZero}
          onBlurZero={onBlurZero}
          money={money}
          tieneEscalas={true}
          mes={mes}
          setMes={setMes}
          escalasKeys={Object.keys(datosConvenio?.escalas || {})}
        />

        <PanelResultados
          tituloResumen={`${datosConvenio?.nombre} — ${formatMes(mes)}`}
          bloques={{
            remunerativos: [
              ["Básico", basico],
              ["Antigüedad", antiguedadPesos],
              ["Presentismo", presentismoPesos],
              ["Adicional por título (opcional)", adicionalTitulo],
              ["Bonificación por función (opcional)", adicionalFuncion],
              ["Horas extras 50%", horasExtras50],
              ["Horas extras 100%", horasExtras100],
            ],
            noRemu: [
              ["Suma no remunerativa fija (escala)", noRemuFijo],
              ["Otras no remunerativas", Number(noRemunerativo) || 0],
            ],
            deducciones: [
              ["Jubilación (11%)", -desc1],
              ["Obra social (3%)", -desc2],
              ["FAECYS (2%)", -desc3],
              ["Otros descuentos", -(Number(descuentosExtras) || 0)],
            ],
          }}
          totalRemu={totalRemunerativo}
          totalNoRemu={totalNoRemunerativo}
          totalDeducciones={totalDeducciones}
          liquido={liquido}
          money={money}
        />

        <ReportarModal
          mostrar={mostrarModal}
          setMostrar={setMostrarModal}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          mensajeEnviado={mensajeEnviado}
          setMensajeEnviado={setMensajeEnviado}
        />
      </Layout>
    );
  }
}

// ========== Sub-componentes ==========

function Layout({
  tituloHeader,
  sector,
  setSector,
  convenio,
  setConvenio,
  convenios,
  tieneEscalas,
  mes,
  setMes,
  children,
}: any) {
  // Opciones de convenio según sector
  const opcionesConvenio = Object.keys(convenios[sector]).map((key) => ({
    key,
    nombre: convenios[sector][key].nombre,
  }));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{tituloHeader}</h1>
          <p className="text-sm text-blue-100 mt-1">Simulación salarial — multi-convenio</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selector de Sector/Convenio/Mes */}
        <section className="bg-white rounded-2xl shadow p-5 lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Sector</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
              >
                <option value="publico">Público</option>
                <option value="privado">Privado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Convenio</label>
              <select
                value={convenio}
                onChange={(e) => setConvenio(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
              >
                {opcionesConvenio.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Mes de liquidación</label>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="mt-1 w-full p-2 border rounded"
                disabled={!convenios[sector][convenio]?.escalas}
              >
                {convenios[sector][convenio]?.escalas
                  ? Object.keys(convenios[sector][convenio]?.escalas).map((k) => (
                      <option key={k} value={k}>
                        {formatMes(k)}
                      </option>
                    ))
                  : (
                    <option>—</option>
                  )}
              </select>
            </div>
          </div>
        </section>

        {children}
      </div>

      <footer className="border-t mt-8 py-6 text-center text-sm text-slate-500 bg-white">
        © 2025 — Calculadora de Sueldos
      </footer>
    </div>
  );
}

function PanelParametros({
  datosNombre,
  categorias,
  categoria,
  setCategoria,
  aniosAntiguedad,
  setAniosAntiguedad,
  regimen,
  setRegimen,
  titulo,
  setTitulo,
  funcion,
  setFuncion,
  horas50,
  setHoras50,
  horas100,
  setHoras100,
  descuentosExtras,
  setDescuentosExtras,
  noRemunerativo,
  setNoRemunerativo,
  bloquearRegimen,
  onFocusZero,
  onBlurZero,
  money,
  tieneEscalas,
  mes,
  setMes,
  escalasKeys,
}: any) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-sm uppercase tracking-wider text-slate-500 border-b pb-2 mb-3">Parámetros</h2>

      <p className="text-slate-600 text-sm mb-3">{datosNombre}</p>

      <label className="block text-sm font-medium">Categoría</label>
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="mt-1 w-full p-2 border rounded"
      >
        {Object.keys(categorias || {}).map((key) => (
          <option key={key} value={key}>
            {key.replaceAll("_", " ")} (${money(Number(categorias[key]) || 0)})
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium mt-4">Años de antigüedad</label>
      <input
        type="number"
        value={aniosAntiguedad}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setAniosAntiguedad)}
        onChange={(e) => setAniosAntiguedad(Number(e.target.value))}
        className="mt-1 w-full p-2 border rounded"
      />

      <label className="block text-sm font-medium mt-4">Régimen horario semanal</label>
      <select
        value={regimen}
        onChange={(e) => setRegimen(e.target.value)}
        className="mt-1 w-full p-2 border rounded"
        disabled={bloquearRegimen}
      >
        <option value="35">35 hs (sin plus)</option>
        <option value="40">40 hs (+14,29%)</option>
        <option value="48">48 hs (+37,14%)</option>
      </select>

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

      <label className="block text-sm font-medium mt-4">Bonificación por función (%)</label>
      <input
        type="number"
        value={funcion}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setFuncion)}
        onChange={(e) => setFuncion(Number(e.target.value))}
        className="mt-1 w-full p-2 border rounded"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium">Horas extras al 50%</label>
          <input
            type="number"
            value={horas50}
            onFocus={onFocusZero}
            onBlur={(e) => onBlurZero(e, setHoras50)}
            onChange={(e) => setHoras50(Number(e.target.value))}
            className="mt-1 w-full p-2 border rounded"
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
            className="mt-1 w-full p-2 border rounded"
          />
        </div>
      </div>

      <label className="block text-sm font-medium mt-4">Descuentos adicionales ($)</label>
      <input
        type="number"
        value={descuentosExtras}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setDescuentosExtras)}
        onChange={(e) => setDescuentosExtras(Number(e.target.value))}
        className="mt-1 w-full p-2 border rounded"
      />

      <label className="block text-sm font-medium mt-4">Premio productividad / No remunerativo ($)</label>
      <input
        type="number"
        value={noRemunerativo}
        onFocus={onFocusZero}
        onBlur={(e) => onBlurZero(e, setNoRemunerativo)}
        onChange={(e) => setNoRemunerativo(Number(e.target.value))}
        className="mt-1 w-full p-2 border rounded"
      />

      <button
        onClick={() => {
          // reset básico de parámetros de cálculo, sin tocar sector/convenio/mes
          setCategoria(Object.keys(categorias || {})[0] || "1");
          setAniosAntiguedad(0);
          setRegimen("35");
          setTitulo("ninguno");
          setFuncion(0);
          setHoras50(0);
          setHoras100(0);
          setDescuentosExtras(0);
          setNoRemunerativo(0);
        }}
        className="mt-5 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition"
      >
        Limpiar formulario
      </button>
    </section>
  );
}

function PanelResultados({
  tituloResumen,
  bloques,
  totalRemu,
  totalNoRemu,
  totalDeducciones,
  liquido,
  money,
}: any) {
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="text-sm uppercase tracking-wider text-slate-500 border-b pb-2 mb-3">Resumen de cálculo</h2>
      <h3 className="text-base font-semibold text-slate-700 mb-2">{tituloResumen}</h3>

      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-700 mb-2">Remunerativos</h4>
        <div className="space-y-1 text-slate-700">
          {bloques.remunerativos.map(([label, value]: [string, number], i: number) => (
            <p key={i}>{label}: ${money(value)}</p>
          ))}
        </div>
        <p className="mt-2 font-semibold text-slate-800">Total remunerativo: ${money(totalRemu)}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-700 mb-2">No remunerativos</h4>
        <div className="space-y-1 text-slate-700">
          {bloques.noRemu.map(([label, value]: [string, number], i: number) => (
            <p key={i}>{label}: ${money(value)}</p>
          ))}
        </div>
        <p className="mt-2 font-semibold text-slate-800">Total no remunerativo: ${money(totalNoRemu)}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-700 mb-2">Deducciones</h4>
        <div className="space-y-1 text-slate-700">
          {bloques.deducciones.map(([label, value]: [string, number], i: number) => (
            <p key={i}>{label}: ${money(value)}</p>
          ))}
        </div>
        <p className="mt-2 font-semibold text-slate-800">Total deducciones: ${money(totalDeducciones)}</p>
      </div>

      <hr className="my-4" />
      <p className="text-xl font-bold text-green-700">Líquido a cobrar: ${money(liquido)}</p>
    </section>
  );
}

function ReportarModal({
  mostrar,
  setMostrar,
  descripcion,
  setDescripcion,
  mensajeEnviado,
  setMensajeEnviado,
}: any) {
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

  if (!mostrar) return null;
  return (
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
            onClick={() => setMostrar(false)}
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
  );
}

// Utilidad para mostrar "2025-10" como "octubre de 2025"
function formatMes(key: string) {
  try {
    const d = new Date(key + "-01T00:00:00");
    return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

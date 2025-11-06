import comercio from "../datos/privados/comercio_130_75.json";

export function useCalculosSueldo() {

  const calcularSueldo = ({ convenio, categoria, antiguedad }) => {

    if (convenio !== "comercio") return null;

    const categoriaSeleccionada = comercio.categorias.find(
      (c) => c.nombre === categoria
    );

    if (!categoriaSeleccionada) {
      return { error: "Categoría no encontrada en el convenio." };
    }

    // --- REMUNERATIVO ---

    const basico = categoriaSeleccionada.basico;

    // Antigüedad: 1% por año
    const adicionalAntiguedad = basico * (antiguedad * 0.01);

    // Asistencia y Puntualidad: (básico + antigüedad) / 12
    const adicionalAsistencia = (basico + adicionalAntiguedad) / 12;

    // Total remunerativo bruto
    const remunerativo = basico + adicionalAntiguedad + adicionalAsistencia;


    // --- DESCUENTOS LEGALES (Empleados de Comercio) ---

    const descuentoJubilacion = remunerativo * 0.11;      // 11%
    const descuentoLey19032 = remunerativo * 0.03;        // 3%
    const descuentoObraSocial = remunerativo * 0.03;      // 3%

    // Sindicato FAECYS
    const descuentoSindicato = remunerativo * 0.02;       // 2%
    const aporteSolidario = remunerativo * 0.005;         // 0.5%

    // Total descuentos
    const descuentos = descuentoJubilacion + descuentoLey19032 + descuentoObraSocial + descuentoSindicato + aporteSolidario;

    // Neto a cobrar
    const neto = remunerativo - descuentos;


    return {
      basico,
      adicionalAntiguedad,
      adicionalAsistencia,
      remunerativo,
      descuentoJubilacion,
      descuentoLey19032,
      descuentoObraSocial,
      descuentoSindicato,
      aporteSolidario,
      descuentos,
      neto
    };
  };

  return { calcularSueldo };
}

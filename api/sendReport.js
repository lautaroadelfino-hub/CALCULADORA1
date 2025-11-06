// api/sendReport.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método no permitido" });
  }

  const { descripcion } = req.body;

  if (!descripcion) {
    return res.status(400).json({ message: "Falta la descripción del problema" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.REPORT_EMAIL_USER,
        pass: process.env.REPORT_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Calculadora de Sueldos Tandil" <${process.env.REPORT_EMAIL_USER}>`,
      to: process.env.REPORT_EMAIL_USER,
      subject: "Nuevo reporte desde la Calculadora de Sueldos",
      text: `Descripción del problema:\n\n${descripcion}`,
    });

    return res.status(200).json({ message: "Reporte enviado con éxito ✅" });
  } catch (error) {
    console.error("Error al enviar reporte:", error);
    return res.status(500).json({ message: "Error al enviar el reporte" });
  }
}

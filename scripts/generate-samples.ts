import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSamplePdfs() {
  const dir = path.resolve(process.cwd(), 'public/assets/aistudio');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // --- Proposal B: Aseguradora del Pacífico S.A. ---
  {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    // Header banner
    page.drawRectangle({
      x: 0,
      y: height - 80,
      width: width,
      height: 80,
      color: rgb(0.05, 0.2, 0.45),
    });

    page.drawText('Aseguradora del Pacífico S.A.', {
      x: 40,
      y: height - 42,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('COTIZACIÓN N.º PAC-2026-44109 · San José, Costa Rica · Vigencia: 15 días', {
      x: 40,
      y: height - 62,
      size: 10,
      font: font,
      color: rgb(0.85, 0.9, 0.98),
    });

    let y = height - 110;
    page.drawText('Propuesta de Seguro Voluntario de Automóvil - Plan Total Pacífico', {
      x: 40,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.15, 0.25),
    });

    y -= 18;
    page.drawText('Dirigida a: BN Corredora de Seguros  |  Asegurada: Laura Solís Vargas (ficticia)', {
      x: 40,
      y,
      size: 10,
      font: font,
      color: rgb(0.3, 0.35, 0.4),
    });

    y -= 30;
    // Section 1
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('1. DATOS DEL VEHÍCULO', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    y -= 25;
    page.drawText('Vehículo: Toyota Corolla XEi  |  Año: 2022  |  Placa: ABC-000  |  Uso: Particular  |  Valor: CRC 14.500.000', {
      x: 45,
      y,
      size: 9.5,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 30;
    // Section 2
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('2. PRIMA Y DEDUCIBLE', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    y -= 25;
    page.drawText('Prima anual total: CRC 445.000 (IVA incluido)', {
      x: 45,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.05, 0.2, 0.45),
    });
    y -= 18;
    page.drawText('Deducible colisión y vuelco: 12% del monto del reclamo, mínimo CRC 180.000', { x: 45, y, size: 9.5, font: font });
    y -= 16;
    page.drawText('Deducible por robo total: 10% del valor asegurado', { x: 45, y, size: 9.5, font: font });
    y -= 16;
    page.drawText('Forma de pago: Anual, semestral o mensual sin recargo por fraccionamiento', { x: 45, y, size: 9.5, font: font });

    y -= 30;
    // Section 3
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('3. COBERTURAS INCLUIDAS', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    
    const coversB = [
      ['Responsabilidad civil por daños a terceros (bienes)', 'CRC 60.000.000', 'Sí (Incluida)'],
      ['Responsabilidad civil por lesiones o muerte a terceros', 'CRC 120.000.000', 'Sí (Incluida)'],
      ['Colisión y vuelco', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Robo total y parcial', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Incendio y rayo', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Fenómenos naturales (inundación, deslizamiento, sismo)', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Rotura de cristales', 'CRC 400.000 por evento sin deducible', 'Sí (Incluida)'],
    ];

    y -= 10;
    for (const [name, lim, inc] of coversB) {
      y -= 18;
      page.drawText(name, { x: 45, y, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(lim, { x: 340, y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(inc, { x: 480, y, size: 9, font: fontBold, color: rgb(0.05, 0.5, 0.2) });
    }

    y -= 30;
    // Section 4
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('4. ASISTENCIAS', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    
    const asistsB = [
      ['Asistencia vial 24/7', 'Incluida en todo el territorio nacional las 24 horas'],
      ['Servicio de grúa', 'Hasta 100 km por evento, eventos ilimitados al año'],
      ['Vehículo sustituto', 'Incluido hasta 15 días consecutivos en caso de colisión'],
      ['Asistencia legal en accidente', 'Incluida (asistencia presencial y telefónica)'],
    ];

    y -= 10;
    for (const [name, det] of asistsB) {
      y -= 18;
      page.drawText(name, { x: 45, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(det, { x: 180, y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
    }

    y -= 30;
    // Section 5
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.92, 0.95, 0.98) });
    page.drawText('5. EXCLUSIONES PRINCIPALES', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.05, 0.2, 0.45) });
    y -= 20;
    page.drawText('• Conducción bajo influencia de alcohol o sustancias no autorizadas.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Uso comercial o en plataformas de transporte público o privado sin endoso.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Participación en competencias de velocidad, carreras o apuestas.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Desgaste mecánico natural y falta de mantenimiento regular.', { x: 45, y, size: 8.5, font: font });

    y -= 35;
    page.drawText('Aseguradora del Pacífico S.A. · Documento ficticio con fines de demostración · BN Corredora de Seguros', {
      x: 45,
      y,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(dir, 'Propuesta_B_Aseguradora_Pacifico.pdf'), pdfBytes);
  }

  // --- Proposal C: Seguros Horizonte de Costa Rica S.A. ---
  {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    // Header banner
    page.drawRectangle({
      x: 0,
      y: height - 80,
      width: width,
      height: 80,
      color: rgb(0.12, 0.28, 0.38),
    });

    page.drawText('Seguros Horizonte de Costa Rica S.A.', {
      x: 40,
      y: height - 42,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('COTIZACIÓN N.º HOR-2026-9021 · San José, Costa Rica · Vigencia: 30 días', {
      x: 40,
      y: height - 62,
      size: 10,
      font: font,
      color: rgb(0.85, 0.95, 0.98),
    });

    let y = height - 110;
    page.drawText('Propuesta de Seguro Voluntario de Automóvil - Plan Básico Esencial', {
      x: 40,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.15, 0.25),
    });

    y -= 18;
    page.drawText('Dirigida a: BN Corredora de Seguros  |  Asegurada: Laura Solís Vargas (ficticia)', {
      x: 40,
      y,
      size: 10,
      font: font,
      color: rgb(0.3, 0.35, 0.4),
    });

    y -= 30;
    // Section 1
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.93, 0.96, 0.96) });
    page.drawText('1. DATOS DEL VEHÍCULO', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.12, 0.28, 0.38) });
    y -= 25;
    page.drawText('Vehículo: Toyota Corolla XEi  |  Año: 2022  |  Placa: ABC-000  |  Uso: Particular  |  Valor: CRC 14.500.000', {
      x: 45,
      y,
      size: 9.5,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 30;
    // Section 2
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.93, 0.96, 0.96) });
    page.drawText('2. PRIMA Y DEDUCIBLE', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.12, 0.28, 0.38) });
    y -= 25;
    page.drawText('Prima anual total: CRC 370.000 (IVA incluido)', {
      x: 45,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.28, 0.38),
    });
    y -= 18;
    page.drawText('Deducible colisión y vuelco: 15% del reclamo, mínimo CRC 200.000', { x: 45, y, size: 9.5, font: font });
    y -= 16;
    page.drawText('Deducible por robo total: 15% del valor asegurado', { x: 45, y, size: 9.5, font: font });
    y -= 16;
    page.drawText('Forma de pago: Anual de contado o semestral (recargo de 6% semestral)', { x: 45, y, size: 9.5, font: font });

    y -= 30;
    // Section 3
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.93, 0.96, 0.96) });
    page.drawText('3. COBERTURAS INCLUIDAS', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.12, 0.28, 0.38) });
    
    const coversC = [
      ['Responsabilidad civil por daños a terceros (bienes)', 'CRC 35.000.000', 'Sí (Incluida)'],
      ['Responsabilidad civil por lesiones o muerte a terceros', 'CRC 70.000.000', 'Sí (Incluida)'],
      ['Colisión y vuelco', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Robo total y parcial', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Incendio y rayo', 'Hasta el valor asegurado', 'Sí (Incluida)'],
      ['Fenómenos naturales (inundación, deslizamiento)', 'No aplica', 'No incluida'],
      ['Rotura de cristales', 'No incluida (Opcional con costo adicional)', 'No'],
    ];

    y -= 10;
    for (const [name, lim, inc] of coversC) {
      y -= 18;
      page.drawText(name, { x: 45, y, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(lim, { x: 340, y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
      const isYes = inc.startsWith('Sí');
      page.drawText(inc, { x: 480, y, size: 9, font: fontBold, color: isYes ? rgb(0.05, 0.5, 0.2) : rgb(0.7, 0.2, 0.1) });
    }

    y -= 30;
    // Section 4
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.93, 0.96, 0.96) });
    page.drawText('4. ASISTENCIAS', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.12, 0.28, 0.38) });
    
    const asistsC = [
      ['Asistencia vial 24/7', 'Incluida en GAM y rutas principales'],
      ['Servicio de grúa', 'Hasta 30 km por evento, máximo 2 eventos al año'],
      ['Vehículo sustituto', 'No incluido (requiere póliza complementaria)'],
      ['Asistencia legal en accidente', 'No indicada en el documento'],
    ];

    y -= 10;
    for (const [name, det] of asistsC) {
      y -= 18;
      page.drawText(name, { x: 45, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(det, { x: 180, y, size: 9, font: font, color: rgb(0.2, 0.2, 0.2) });
    }

    y -= 30;
    // Section 5
    page.drawRectangle({ x: 40, y: y - 5, width: width - 80, height: 22, color: rgb(0.93, 0.96, 0.96) });
    page.drawText('5. EXCLUSIONES PRINCIPALES', { x: 45, y: y + 2, size: 10, font: fontBold, color: rgb(0.12, 0.28, 0.38) });
    y -= 20;
    page.drawText('• Inundación, desbordamiento de ríos, caída de árboles y fenómenos climáticos.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Conductor sin licencia expedida por COSEVI o menor de 21 años.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Daños a cristales, parabrisas o espejos retrovisores en eventos aislados.', { x: 45, y, size: 8.5, font: font });
    y -= 14;
    page.drawText('• Vías no oficiales o cruce de ríos/playas sin paso habilitado.', { x: 45, y, size: 8.5, font: font });

    y -= 35;
    page.drawText('Seguros Horizonte de Costa Rica S.A. · Documento ficticio con fines de demostración · BN Corredora de Seguros', {
      x: 45,
      y,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(dir, 'Propuesta_C_Seguros_Horizonte.pdf'), pdfBytes);
  }

  console.log('Sample PDFs generated successfully!');
}

generateSamplePdfs();

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

interface ZReportData {
  businessName: string;
  date: string;
  startTime: string;
  endTime: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
  sales: { method: string; count: number; total: number }[];
  movements: { type: string; amount: number; notes: string }[];
}

export const generateZReport = async (data: ZReportData) => {
  try {
    const totalSales = data.sales.reduce((acc, s) => acc + s.total, 0);
    const totalCount = data.sales.reduce((acc, s) => acc + s.count, 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte Z - Cierre de Caja</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #fff;
            color: #0F0F1A;
            margin: 0;
            padding: 40px;
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .logo { font-size: 40px; margin-bottom: 10px; }
          .business-name { font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .report-title { font-size: 18px; font-weight: 600; color: #666; margin-top: 5px; }
          
          .meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; color: #444; }
          .meta div { background: #f5f5f5; padding: 10px 15px; border-radius: 8px; }
          
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 800; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th, td { padding: 8px 0; text-align: left; border-bottom: 1px dashed #eee; font-size: 14px; }
          th { font-weight: 600; color: #666; }
          .text-right { text-align: right; }
          .bold { font-weight: 800; }
          
          .summary-box { background: #0F0F1A; color: #fff; padding: 20px; border-radius: 12px; margin-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; }
          .summary-row.total { font-size: 24px; font-weight: 800; border-top: 1px solid #333; padding-top: 15px; margin-top: 5px; margin-bottom: 0; color: #00E676; }
          .summary-row.danger { color: #FF3B30; }
          
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏪</div>
          <h1 class="business-name">${data.businessName}</h1>
          <div class="report-title">REPORTE Z - CIERRE DE CAJA</div>
        </div>

        <div class="meta">
          <div><strong>Fecha:</strong><br>${data.date}</div>
          <div><strong>Apertura:</strong><br>${data.startTime}</div>
          <div><strong>Cierre:</strong><br>${data.endTime}</div>
        </div>

        <div class="section">
          <div class="section-title">Resumen de Ventas</div>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th class="text-right">Operaciones</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.sales.map(s => `
                <tr>
                  <td style="text-transform: capitalize;">${s.method}</td>
                  <td class="text-right">${s.count}</td>
                  <td class="text-right bold">$${s.total.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr>
                <td class="bold">TOTAL VENTAS</td>
                <td class="text-right bold">${totalCount}</td>
                <td class="text-right bold" style="font-size: 16px;">$${totalSales.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Movimientos de Caja</div>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Notas</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${data.movements.length === 0 ? '<tr><td colspan="3" style="text-align:center; color:#999;">No hay movimientos manuales</td></tr>' : ''}
              ${data.movements.map(m => `
                <tr>
                  <td>${m.type === 'open' ? 'Apertura' : m.type === 'in' ? 'Ingreso' : 'Retiro'}</td>
                  <td style="color: #666; font-size: 12px;">${m.notes || '-'}</td>
                  <td class="text-right ${m.type === 'out' ? 'danger' : ''}">
                    ${m.type === 'out' ? '-' : ''}$${m.amount.toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="summary-box">
          <div class="summary-row">
            <span>Efectivo Esperado en Caja</span>
            <span>$${data.expectedCash.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Efectivo Real (Declarado)</span>
            <span>$${data.actualCash.toFixed(2)}</span>
          </div>
          <div class="summary-row total ${data.difference < 0 ? 'danger' : ''}">
            <span>${data.difference === 0 ? 'CAJA CUADRADA' : data.difference > 0 ? 'SOBRANTE' : 'FALTANTE'}</span>
            <span>${data.difference > 0 ? '+' : ''}$${data.difference.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Documento interno de control administrativo.</p>
          <p>Generado por MI APP POS</p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } else {
      Alert.alert('Guardado', 'El reporte Z se ha generado correctamente.');
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'No se pudo generar el reporte.');
  }
};

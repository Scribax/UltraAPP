import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generatePremiumTicket = async (sale: any, business: any) => {
  const dateStr = new Date(sale.created_at || new Date()).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            padding: 40px 20px; 
            color: #1A1A2E; 
            background: #fff;
            max-width: 400px;
            margin: 0 auto;
          }
          .ticket-container {
            border: 1px solid #f0f0f0;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { 
            font-size: 32px; 
            font-weight: 800; 
            color: #6C63FF; 
            margin-bottom: 5px;
            letter-spacing: -1px;
          }
          .biz-info { font-size: 12px; color: #5A5A8A; line-height: 1.5; }
          
          .divider { border-top: 1px dashed #E1E4F0; margin: 25px 0; }
          
          .section-title { font-size: 10px; font-weight: 800; color: #A0A0C0; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px; }
          
          .item { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .item-info { flex: 1; }
          .item-name { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 2px; }
          .item-meta { font-size: 11px; color: #5A5A8A; }
          .item-price { font-size: 14px; font-weight: 700; color: #1A1A2E; text-align: right; }
          
          .totals { margin-top: 30px; background: #F8F9FC; padding: 20px; border-radius: 12px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .grand-total { border-top: 1px solid #E1E4F0; margin-top: 12px; padding-top: 12px; font-size: 20px; font-weight: 800; color: #6C63FF; }
          
          .footer { text-align: center; margin-top: 40px; }
          .qr-placeholder { 
            width: 80px; 
            height: 80px; 
            background: #F0F0FF; 
            border-radius: 12px; 
            margin: 0 auto 15px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 24px;
          }
          .thanks { font-size: 14px; font-weight: 700; color: #1A1A2E; }
          .website { font-size: 11px; color: #6C63FF; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header">
            <div class="logo">${business.name || 'UltraAPP'}</div>
            <div class="biz-info">
              ${business.address || ''}<br/>
              ${business.phone || ''}
            </div>
          </div>

          <div class="divider"></div>

          <div class="section-title">Detalle de Compra</div>
          ${(sale.items || []).map((item: any) => `
            <div class="item">
              <div class="item-info">
                <div class="item-name">${item.product_name}</div>
                <div class="item-meta">${item.quantity} x $${parseFloat(item.unit_price).toFixed(2)}</div>
              </div>
              <div class="item-price">$${parseFloat(item.subtotal).toFixed(2)}</div>
            </div>
          `).join('')}

          <div class="totals">
            <div class="total-row"><span>Subtotal</span> <b>$${(parseFloat(sale.total) + parseFloat(sale.discount || 0)).toFixed(2)}</b></div>
            ${sale.discount > 0 ? `<div class="total-row" style="color: #FF4D6A"><span>Descuento</span> <b>-$${parseFloat(sale.discount).toFixed(2)}</b></div>` : ''}
            <div class="total-row grand-total"><span>TOTAL</span> <span>$${parseFloat(sale.total).toFixed(2)}</span></div>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div class="qr-placeholder">📱</div>
            <div class="thanks">¡Gracias por tu compra!</div>
            <div class="website">Ticket Digital # ${sale.id.slice(0,8).toUpperCase()}</div>
            <div style="font-size: 10px; color: #A0A0C0; margin-top: 20px;">${dateStr}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf', 
        dialogTitle: 'Enviar Ticket de Venta' 
      });
    }
  } catch (err) {
    console.error('Error generating ticket', err);
  }
};

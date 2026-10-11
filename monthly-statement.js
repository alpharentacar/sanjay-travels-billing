const API_URL = 'https://sanjay-travels-billing.onrender.com';
let statementData = null;

async function loadCustomers() {
  try {
    const response = await fetch(`${API_URL}/api/customers`, {
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) return;
    
    const select = document.getElementById('customerSelect');
    data.customers.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      select.appendChild(option);
    });
  } catch (err) {
    console.error('Load customers error:', err);
  }
}

async function generateStatement() {
  const customer = document.getElementById('customerSelect').value;
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  
  if (!customer || !fromDate || !toDate) {
    alert('❌ Please fill all fields');
    return;
  }
  
  try {
    const response = await fetch(
      `${API_URL}/api/monthly-statement?customer=${encodeURIComponent(customer)}&from_date=${fromDate}&to_date=${toDate}`,
      { credentials: 'include' }
    );
    const data = await response.json();
    
    if (!data.success) throw new Error(data.error);
    if (data.invoices.length === 0) {
      alert('❌ No invoices found for this customer in this period');
      return;
    }
    
    statementData = data;
    renderStatement(data);
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

function renderStatement(data) {
  const paper = document.getElementById('statementPaper');
  
  const tripsHTML = data.invoices.map((inv, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${inv.invoice_no}</strong></td>
      <td>${new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
      <td>${inv.car_type}</td>
      <td>${inv.car_no || '-'}</td>
      <td>${inv.total_km} km</td>
      <td>${inv.total_hours} hrs</td>
      <td style="text-align:right;">₹${parseFloat(inv.total_amount).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
  
  paper.innerHTML = `
    <div class="invoice-header-print">
      <div>
        <div class="invoice-brand">SANJAY <span>TRAVELS</span></div>
        <div class="invoice-brand-sub">
          Katwaria Sarai<br>
          📞 9810779652, 7982300039
        </div>
      </div>
      <div class="invoice-meta">
        <div class="label">Customer</div>
        <div class="value">${data.customer}</div>
        <div class="label">Period</div>
        <div class="value">${new Date(data.from_date).toLocaleDateString('en-IN')} - ${new Date(data.to_date).toLocaleDateString('en-IN')}</div>
      </div>
    </div>
    
    <table class="invoice-table">
      <thead>
        <tr>
          <th>#</th><th>Invoice No</th><th>Date</th><th>Car</th>
          <th>Car No</th><th>KM</th><th>Hrs</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${tripsHTML}</tbody>
      <tfoot>
        <tr>
          <td colspan="7" style="text-align:right;">Total Amount:</td>
          <td style="text-align:right;">₹${data.total_amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td colspan="7" style="text-align:right;">IGST 5%:</td>
          <td style="text-align:right;">₹${data.igst.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="grand-total">
          <td colspan="7">GRAND TOTAL:</td>
          <td>₹${data.grand_total.toLocaleString('en-IN')}</td>
        </tr>
      </tfoot>
    </table>
    
    <div style="text-align:right; margin: 20px 0; font-size: 16px;">
      <strong>Rupees: ${numberToWords(Math.round(data.grand_total))} only</strong>
    </div>
    
    <div class="invoice-footer">
      <div class="invoice-terms">
        <strong>Terms & Conditions:</strong><br>
        1. Subject to DELHI Jurisdiction<br>
        2. We reserve the rights to charge interest @24% p.a. on outstanding payments<br>
        3. No objection pertaining to this invoice would be entertained after 7 days<br>
        4. Timings and Kilometers calculated from Garage to Garage<br>
        5. SAC CODE: 9966 (RENT A CAB SERVICE)
      </div>
      <div class="invoice-signature">
        <div class="signature-box">Customer Signature</div>
        <div class="signature-box">For Sanjay Travels</div>
      </div>
    </div>
  `;
  
  document.getElementById('previewSection').style.display = 'block';
}

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }
  
  return convert(num);
}

function downloadPDF() {
  if (!statementData) return;
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('SANJAY TRAVELS', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Katwaria Sarai', 105, 28, { align: 'center' });
  doc.text('Phone: 9810779652, 7982300039', 105, 34, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Customer: ${statementData.customer}`, 20, 50);
  doc.setFont(undefined, 'normal');
  doc.text(`Period: ${new Date(statementData.from_date).toLocaleDateString('en-IN')} - ${new Date(statementData.to_date).toLocaleDateString('en-IN')}`, 20, 58);
  
  const tableData = statementData.invoices.map((inv, idx) => [
    idx + 1,
    inv.invoice_no,
    new Date(inv.invoice_date).toLocaleDateString('en-IN'),
    inv.car_type,
    inv.car_no || '-',
    inv.total_km + ' km',
    inv.total_hours + ' hrs',
    'Rs. ' + parseFloat(inv.total_amount).toLocaleString('en-IN')
  ]);
  
  doc.autoTable({
    startY: 70,
    head: [['#', 'Invoice No', 'Date', 'Car', 'Car No', 'KM', 'Hrs', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [10, 37, 64] }
  });
  
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(`Total: Rs. ${statementData.total_amount.toLocaleString('en-IN')}`, 140, finalY);
  doc.text(`IGST 5%: Rs. ${statementData.igst.toLocaleString('en-IN')}`, 140, finalY + 7);
  doc.setFontSize(14);
  doc.text(`GRAND TOTAL: Rs. ${statementData.grand_total.toLocaleString('en-IN')}`, 140, finalY + 16);
  
  doc.setFontSize(11);
  doc.text(`Rupees: ${numberToWords(Math.round(statementData.grand_total))} only`, 20, finalY + 25);
  
  doc.setFontSize(9);
  doc.text('Terms & Conditions:', 20, finalY + 40);
  doc.setFontSize(8);
  doc.text('1. Subject to DELHI Jurisdiction', 20, finalY + 47);
  doc.text('2. Interest @24% p.a. on outstanding payments', 20, finalY + 52);
  doc.text('3. Timings and Kilometers from Garage to Garage', 20, finalY + 57);
  doc.text('4. SAC CODE: 9966 (RENT A CAB SERVICE)', 20, finalY + 62);
  
  doc.save(`Sanjay-Statement-${statementData.customer}-${statementData.from_date}.pdf`);
}

document.getElementById('generateBtn').addEventListener('click', generateStatement);
loadCustomers();
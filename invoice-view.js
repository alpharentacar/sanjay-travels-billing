// ============================================
// SANJAY TRAVELS - INVOICE VIEW SCRIPT
// ============================================

const API_URL = '';

const urlParams = new URLSearchParams(window.location.search);
const invoiceId = urlParams.get('id');

if (!invoiceId) {
  alert('❌ No invoice ID found');
  window.location.href = 'invoices.html';
}

async function loadInvoice() {
  try {
    const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`, { credentials: 'include' });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Invoice not found');
    
    renderInvoice(data.invoice);
    
  } catch (err) {
    alert('❌ Error: ' + err.message);
    window.location.href = 'invoices.html';
  }
}

function renderInvoice(inv) {
  document.getElementById('invNo').textContent = inv.invoice_no || '-';
  document.getElementById('invDate').textContent = inv.invoice_date 
    ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';
  
  document.getElementById('custName').textContent = inv.customer_name || '-';
  document.getElementById('custPhone').textContent = inv.contact_no || '-';
  document.getElementById('bookedBy').textContent = inv.booked_by || '-';
  document.getElementById('reportTo').textContent = inv.report_to || '-';
  
  document.getElementById('carType').textContent = inv.car_type || '-';
  document.getElementById('carNo').textContent = inv.car_no || '-';
  document.getElementById('driverName').textContent = inv.driver_name || '-';
  document.getElementById('driverCell').textContent = inv.driver_cell || '-';
  
  document.getElementById('reportAt').textContent = inv.report_at || '-';
  document.getElementById('openingKm').textContent = (inv.opening_km || 0) + ' km';
  document.getElementById('closingKm').textContent = (inv.closing_km || 0) + ' km';
  document.getElementById('totalKm').textContent = (inv.total_km || 0) + ' km';
  
  document.getElementById('openingTime').textContent = inv.opening_time || '-';
  document.getElementById('closingTime').textContent = inv.closing_time || '-';
  document.getElementById('totalHours').textContent = (inv.total_hours || 0) + ' hrs';
  document.getElementById('isOutstation').textContent = inv.is_outstation ? 'Yes' : 'No';
  
  const chargesBody = document.getElementById('chargesBody');
  const rows = [];
  
  rows.push(`
    <tr>
      <td>Base Fare (80km/8hr)</td>
      <td style="text-align:right;">₹${parseFloat(inv.fix_rate || 0).toLocaleString('en-IN')}</td>
      <td style="text-align:right;">1</td>
      <td style="text-align:right;">₹${parseFloat(inv.fix_amount || inv.fix_rate || 0).toLocaleString('en-IN')}</td>
    </tr>
  `);
  
  if (parseFloat(inv.extra_km) > 0) {
    rows.push(`
      <tr>
        <td>Extra KM</td>
        <td style="text-align:right;">₹${parseFloat(inv.extra_km_rate || 0).toLocaleString('en-IN')}/km</td>
        <td style="text-align:right;">${inv.extra_km} km</td>
        <td style="text-align:right;">₹${parseFloat(inv.extra_km_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
    `);
  }
  
  if (parseFloat(inv.extra_hours) > 0) {
    rows.push(`
      <tr>
        <td>Extra Hours</td>
        <td style="text-align:right;">₹${parseFloat(inv.extra_hour_rate || 0).toLocaleString('en-IN')}/hr</td>
        <td style="text-align:right;">${inv.extra_hours} hrs</td>
        <td style="text-align:right;">₹${parseFloat(inv.extra_hour_amount || 0).toLocaleString('en-IN')}</td>
      </tr>
    `);
  }
  
  if (parseFloat(inv.driver_allowance) > 0) {
    rows.push(`
      <tr>
        <td>Driver Allowance</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">₹${parseFloat(inv.driver_allowance).toLocaleString('en-IN')}</td>
      </tr>
    `);
  }
  
  if (parseFloat(inv.night_allowance) > 0) {
    rows.push(`
      <tr>
        <td>Night Allowance</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">₹${parseFloat(inv.night_allowance).toLocaleString('en-IN')}</td>
      </tr>
    `);
  }
  
  if (parseFloat(inv.toll_parking) > 0) {
    rows.push(`
      <tr>
        <td>Toll / Parking</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">-</td>
        <td style="text-align:right;">₹${parseFloat(inv.toll_parking).toLocaleString('en-IN')}</td>
      </tr>
    `);
  }
  
  chargesBody.innerHTML = rows.join('');
  
  document.getElementById('grandTotal').textContent = '₹' + parseFloat(inv.total_amount || 0).toLocaleString('en-IN');
  
  if (inv.notes) {
    document.getElementById('notesSection').style.display = 'block';
    document.getElementById('notesText').textContent = inv.notes;
  }
}

loadInvoice();
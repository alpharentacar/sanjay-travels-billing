// ============================================
// SANJAY TRAVELS - INVOICES LIST SCRIPT
// ============================================

 const API_URL = '';

let currentInvoices = []; // Store loaded invoices for export

// ============ LOAD STATS ============
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/api/stats`, { credentials: 'include' });
    const data = await response.json();
    
    if (!data.success) return;
    
    const s = data.stats;
    document.getElementById('statTotal').textContent = s.totalInvoices;
    document.getElementById('statRevenue').textContent = '₹' + (s.totalRevenue || 0).toLocaleString('en-IN');
    document.getElementById('statMonth').textContent = s.monthInvoices;
    document.getElementById('statMonthRevenue').textContent = '₹' + (s.monthRevenue || 0).toLocaleString('en-IN');
    
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ============ LOAD INVOICES ============
async function loadInvoices() {
  const tbody = document.getElementById('invoicesBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Loading invoices...</td></tr>';
  
  try {
    const params = new URLSearchParams();
    
    const search = document.getElementById('searchInput').value.trim();
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const carType = document.getElementById('carFilter').value;
    
    if (search) params.append('search', search);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (carType) params.append('car_type', carType);
    
    const response = await fetch(`${API_URL}/api/invoices?${params}`, { credentials: 'include' });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Failed');
    
    currentInvoices = data.invoices; // Store for export
    renderInvoices(data.invoices);
    
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="color:#ef4444;">❌ Error: ${err.message}</td></tr>`;
  }
}

// ============ RENDER INVOICES ============
function renderInvoices(invoices) {
  const tbody = document.getElementById('invoicesBody');
  
  if (!invoices || invoices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No invoices found. Create your first invoice!</td></tr>';
    return;
  }
  
  tbody.innerHTML = invoices.map(inv => {
    const date = inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const amount = (parseFloat(inv.total_amount) || 0).toLocaleString('en-IN');
    
    return `
      <tr>
        <td><span class="invoice-no-badge">${inv.invoice_no || '-'}</span></td>
        <td>${date}</td>
        <td><strong>${inv.customer_name || '-'}</strong></td>
        <td>${inv.contact_no || '-'}</td>
        <td>${inv.car_type || '-'}</td>
        <td>${inv.total_km || 0} km</td>
        <td><span class="total-amount">₹${amount}</span></td>
        <td>
          <button class="action-btn view" onclick="viewInvoice(${inv.id})">👁️</button>
          <button class="action-btn edit" onclick="editInvoice(${inv.id})">✏️</button>
          <button class="action-btn delete" onclick="deleteInvoice(${inv.id}, '${inv.invoice_no}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============ VIEW INVOICE ============
function viewInvoice(id) {
  window.location.href = `invoice.html?id=${id}`;
}

// ============ EDIT INVOICE ============
function editInvoice(id) {
  window.location.href = `index.html?edit=${id}`;
}

// ============ DELETE INVOICE ============
async function deleteInvoice(id, invoiceNo) {
  if (!confirm(`Delete invoice ${invoiceNo}? This cannot be undone.`)) return;
  
  try {
    const response = await fetch(`${API_URL}/api/invoices/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Delete failed');
    
    loadInvoices();
    loadStats();
    
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ============ EXPORT TO EXCEL (CSV) ============
function exportToExcel() {
  if (!currentInvoices || currentInvoices.length === 0) {
    alert('❌ No invoices to export');
    return;
  }
  
  // CSV headers
  const headers = [
    'Invoice No',
    'Date',
    'Customer Name',
    'Contact No',
    'Booked By',
    'Report To',
    'Car Type',
    'Car No',
    'Driver Name',
    'Driver Cell',
    'Report At',
    'Opening KM',
    'Closing KM',
    'Total KM',
    'Opening Time',
    'Closing Time',
    'Total Hours',
    'Fix Rate',
    'Extra KM Rate',
    'Extra Hour Rate',
    'Extra KM',
    'Extra KM Amount',
    'Extra Hours',
    'Extra Hour Amount',
    'Driver Allowance',
    'Night Allowance',
    'Toll/Parking',
    'Fix Amount',
    'Total Amount',
    'Outstation',
    'Notes'
  ];
  
  // CSV rows
  const rows = currentInvoices.map(inv => [
    inv.invoice_no || '',
    inv.invoice_date || '',
    inv.customer_name || '',
    inv.contact_no || '',
    inv.booked_by || '',
    inv.report_to || '',
    inv.car_type || '',
    inv.car_no || '',
    inv.driver_name || '',
    inv.driver_cell || '',
    inv.report_at || '',
    inv.opening_km || 0,
    inv.closing_km || 0,
    inv.total_km || 0,
    inv.opening_time || '',
    inv.closing_time || '',
    inv.total_hours || 0,
    inv.fix_rate || 0,
    inv.extra_km_rate || 0,
    inv.extra_hour_rate || 0,
    inv.extra_km || 0,
    inv.extra_km_amount || 0,
    inv.extra_hours || 0,
    inv.extra_hour_amount || 0,
    inv.driver_allowance || 0,
    inv.night_allowance || 0,
    inv.toll_parking || 0,
    inv.fix_amount || 0,
    inv.total_amount || 0,
    inv.is_outstation ? 'Yes' : 'No',
    inv.notes || ''
  ]);
  
  // Build CSV with proper escaping
  const escapeCSV = (val) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  
  // Add BOM for Excel to recognize UTF-8 (fixes ₹ symbol)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Generate filename with date
  const today = new Date().toISOString().split('T')[0];
  const filename = `sanjay-travels-invoices-${today}.csv`;
  
  // Download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  
  // Show success message
  alert(`✅ Exported ${currentInvoices.length} invoice(s) to ${filename}`);
}

// ============ SEARCH / FILTER EVENT LISTENERS ============
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

document.getElementById('searchInput')?.addEventListener('input', debounce(loadInvoices, 500));
document.getElementById('carFilter')?.addEventListener('change', loadInvoices);
document.getElementById('fromDate')?.addEventListener('change', loadInvoices);
document.getElementById('toDate')?.addEventListener('change', loadInvoices);

document.getElementById('clearBtn')?.addEventListener('click', function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('fromDate').value = '';
  document.getElementById('toDate').value = '';
  document.getElementById('carFilter').value = '';
  loadInvoices();
});

// ============ EXPORT BUTTON ============
document.getElementById('exportBtn')?.addEventListener('click', exportToExcel);

// ============ INIT ============
loadStats();
loadInvoices();
// ============================================
// SANJAY TRAVELS - BILLING FORM SCRIPT
// ============================================

 const API_URL = '';

// ============ CAR DEFAULTS ============
const CAR_DEFAULTS = {
  'Dezire': { fix: 1800, extra_km: 18, extra_hr: 150 },
  'Crysta': { fix: 2200, extra_km: 22, extra_hr: 300 },
  'Ertiga': { fix: 1800, extra_km: 18, extra_hr: 200 }
};

// ============ CHECK EDIT MODE ============
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
const isEditMode = !!editId;

// ============ SET TODAY'S DATE ============
const invoiceDateEl = document.getElementById('invoice_date');
if (invoiceDateEl && !isEditMode) {
  invoiceDateEl.value = new Date().toISOString().split('T')[0];
}

// ============ AUTO-FILL INVOICE NUMBER ============
async function loadNextInvoiceNumber() {
  try {
    const response = await fetch(`${API_URL}/api/invoice/next-number`, { credentials: 'include' });
    const data = await response.json();
    if (data.success) {
      document.getElementById('invoice_no').value = data.invoice_no;
    }
  } catch (err) {
    console.error('Invoice number fetch failed:', err);
    document.getElementById('invoice_no').value = 'Auto-generated';
  }
}

// ============ LOAD INVOICE FOR EDIT ============
async function loadInvoiceForEdit() {
  try {
    const response = await fetch(`${API_URL}/api/invoices/${editId}`, { credentials: 'include' });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Invoice not found');

    const inv = data.invoice;

    // Change heading
    document.getElementById('formHeading').textContent = 'Edit Invoice';
    document.getElementById('formSubheading').textContent = 'Update the details below';
    document.getElementById('saveBtn').innerHTML = '💾 Update Invoice';

    // Fill form fields
    document.getElementById('invoice_no').value = inv.invoice_no || '';
    document.getElementById('invoice_date').value = inv.invoice_date || '';
    document.getElementById('customer_name').value = inv.customer_name || '';
    document.getElementById('contact_no').value = inv.contact_no || '';
    document.getElementById('booked_by').value = inv.booked_by || '';
    document.getElementById('report_to').value = inv.report_to || '';
    document.getElementById('car_type').value = inv.car_type || '';
    document.getElementById('car_no').value = inv.car_no || '';
    document.getElementById('driver_name').value = inv.driver_name || '';
    document.getElementById('driver_cell').value = inv.driver_cell || '';
    document.getElementById('report_at').value = inv.report_at || '';
    document.getElementById('is_outstation').value = inv.is_outstation ? 'true' : 'false';
    document.getElementById('opening_km').value = inv.opening_km || 0;
    document.getElementById('closing_km').value = inv.closing_km || 0;
    document.getElementById('opening_time').value = inv.opening_time || '10:00';
    document.getElementById('closing_time').value = inv.closing_time || '18:00';
    document.getElementById('fix_rate').value = inv.fix_rate || 0;
    document.getElementById('extra_km_rate').value = inv.extra_km_rate || 0;
    document.getElementById('extra_hour_rate').value = inv.extra_hour_rate || 0;
    document.getElementById('driver_allowance').value = inv.driver_allowance || 0;
    document.getElementById('night_allowance').value = inv.night_allowance || 0;
    document.getElementById('toll_parking').value = inv.toll_parking || 0;
    document.getElementById('notes').value = inv.notes || '';

    // Recalculate totals
    calculateAll();

  } catch (err) {
    alert('❌ Error loading invoice: ' + err.message);
    window.location.href = 'invoices.html';
  }
}

// ============ INITIALIZE ============
if (isEditMode) {
  loadInvoiceForEdit();
} else {
  loadNextInvoiceNumber();
}

// ============ CAR TYPE CHANGE - AUTO-FILL RATES ============
const carTypeEl = document.getElementById('car_type');
const fixRateEl = document.getElementById('fix_rate');
const extraKmRateEl = document.getElementById('extra_km_rate');
const extraHourRateEl = document.getElementById('extra_hour_rate');

if (carTypeEl) {
  carTypeEl.addEventListener('change', function() {
    const car = this.value;
    if (CAR_DEFAULTS[car]) {
      fixRateEl.value = CAR_DEFAULTS[car].fix;
      extraKmRateEl.value = CAR_DEFAULTS[car].extra_km;
      extraHourRateEl.value = CAR_DEFAULTS[car].extra_hr;
      calculateAll();
    }
  });
}

// ============ CALCULATE TOTAL KM ============
function calculateTotalKm() {
  const opening = parseFloat(document.getElementById('opening_km').value) || 0;
  const closing = parseFloat(document.getElementById('closing_km').value) || 0;
  const total = Math.max(0, closing - opening);
  document.getElementById('total_km').value = total;
  return total;
}

// ============ CALCULATE TOTAL HOURS ============
function calculateTotalHours() {
  const openTime = document.getElementById('opening_time').value;
  const closeTime = document.getElementById('closing_time').value;

  if (!openTime || !closeTime) return 0;

  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);

  let openMins = oh * 60 + om;
  let closeMins = ch * 60 + cm;

  if (closeMins < openMins) closeMins += 24 * 60;

  const totalHours = (closeMins - openMins) / 60;
  document.getElementById('total_hours').value = totalHours.toFixed(1);
  return totalHours;
}

// ============ CALCULATE ALL ============
function calculateAll() {
  const totalKm = calculateTotalKm();
  const totalHours = calculateTotalHours();

  const fixRate = parseFloat(document.getElementById('fix_rate').value) || 0;
  const extraKmRate = parseFloat(document.getElementById('extra_km_rate').value) || 0;
  const extraHourRate = parseFloat(document.getElementById('extra_hour_rate').value) || 0;

  const extraKm = Math.max(0, totalKm - 80);
  const extraKmAmount = extraKm * extraKmRate;

  const extraHours = Math.max(0, totalHours - 8);
  const extraHourAmount = extraHours * extraHourRate;

  document.getElementById('extra_km').value = extraKm;
  document.getElementById('extra_km_amount').value = extraKmAmount.toFixed(0);
  document.getElementById('extra_hours').value = extraHours.toFixed(1);
  document.getElementById('extra_hour_amount').value = extraHourAmount.toFixed(0);

  const da = parseFloat(document.getElementById('driver_allowance').value) || 0;
  const night = parseFloat(document.getElementById('night_allowance').value) || 0;
  const toll = parseFloat(document.getElementById('toll_parking').value) || 0;

  const total = fixRate + extraKmAmount + extraHourAmount + da + night + toll;

  document.getElementById('total_amount').value = total;
  document.getElementById('total_display').textContent = '₹' + total.toLocaleString('en-IN');
}

// ============ EVENT LISTENERS ============
['opening_km', 'closing_km', 'opening_time', 'closing_time',
 'fix_rate', 'extra_km_rate', 'extra_hour_rate',
 'driver_allowance', 'night_allowance', 'toll_parking'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', calculateAll);
});

document.getElementById('is_outstation')?.addEventListener('change', function() {
  const daEl = document.getElementById('driver_allowance');
  if (this.value === 'true') {
    if (parseFloat(daEl.value) === 0) daEl.value = 400;
  } else {
    daEl.value = 0;
  }
  calculateAll();
});

// ============ FORM SUBMIT ============
const billingForm = document.getElementById('billingForm');

if (billingForm) {
  billingForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    const data = {
      invoice_no: document.getElementById('invoice_no').value,
      invoice_date: document.getElementById('invoice_date').value,
      customer_name: document.getElementById('customer_name').value.trim(),
      contact_no: document.getElementById('contact_no').value.trim() || null,
      booked_by: document.getElementById('booked_by').value.trim() || null,
      report_to: document.getElementById('report_to').value.trim() || null,
      car_type: document.getElementById('car_type').value,
      car_no: document.getElementById('car_no').value.trim() || null,
      driver_name: document.getElementById('driver_name').value.trim() || null,
      driver_cell: document.getElementById('driver_cell').value.trim() || null,
      report_at: document.getElementById('report_at').value.trim() || null,
      opening_km: parseFloat(document.getElementById('opening_km').value) || 0,
      closing_km: parseFloat(document.getElementById('closing_km').value) || 0,
      total_km: parseFloat(document.getElementById('total_km').value) || 0,
      opening_time: document.getElementById('opening_time').value,
      closing_time: document.getElementById('closing_time').value,
      total_hours: parseFloat(document.getElementById('total_hours').value) || 0,
      fix_rate: parseFloat(document.getElementById('fix_rate').value) || 0,
      extra_km_rate: parseFloat(document.getElementById('extra_km_rate').value) || 0,
      extra_hour_rate: parseFloat(document.getElementById('extra_hour_rate').value) || 0,
      extra_km: parseFloat(document.getElementById('extra_km').value) || 0,
      extra_km_amount: parseFloat(document.getElementById('extra_km_amount').value) || 0,
      extra_hours: parseFloat(document.getElementById('extra_hours').value) || 0,
      extra_hour_amount: parseFloat(document.getElementById('extra_hour_amount').value) || 0,
      driver_allowance: parseFloat(document.getElementById('driver_allowance').value) || 0,
      night_allowance: parseFloat(document.getElementById('night_allowance').value) || 0,
      toll_parking: parseFloat(document.getElementById('toll_parking').value) || 0,
      fix_amount: parseFloat(document.getElementById('fix_rate').value) || 0,
      total_amount: parseFloat(document.getElementById('total_amount').value) || 0,
      is_outstation: document.getElementById('is_outstation').value === 'true',
      notes: document.getElementById('notes').value.trim() || null
    };

    if (!data.customer_name) {
      alert('❌ Customer name required');
      saveBtn.disabled = false;
      saveBtn.textContent = isEditMode ? '💾 Update Invoice' : '💾 Save & Generate Invoice';
      return;
    }

    if (!data.car_type) {
      alert('❌ Car type required');
      saveBtn.disabled = false;
      saveBtn.textContent = isEditMode ? '💾 Update Invoice' : '💾 Save & Generate Invoice';
      return;
    }

    try {
      const url = isEditMode 
        ? `${API_URL}/api/invoices/${editId}` 
        : `${API_URL}/api/invoices`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to save');

      // Redirect to invoice view
      const invoiceId = isEditMode ? editId : result.invoice.id;
      window.location.href = `invoice.html?id=${invoiceId}`;

    } catch (err) {
      alert('❌ Error: ' + err.message);
      saveBtn.disabled = false;
      saveBtn.textContent = isEditMode ? '💾 Update Invoice' : '💾 Save & Generate Invoice';
    }
  });
}

// ============ RESET FORM ============
function resetForm() {
  if (confirm('Reset the form? All data will be cleared.')) {
    if (isEditMode) {
      if (confirm('Go back to invoices list?')) {
        window.location.href = 'invoices.html';
      }
      return;
    }
    document.getElementById('billingForm').reset();
    document.getElementById('total_display').textContent = '₹0';
    document.getElementById('invoice_date').value = new Date().toISOString().split('T')[0];
    loadNextInvoiceNumber();
  }
}

// Initial calculation
calculateAll();
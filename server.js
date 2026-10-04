const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ HEALTH CHECK ============
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sanjay Travels Billing API is running',
    timestamp: new Date().toISOString()
  });
});

// ============ GET NEXT INVOICE NUMBER ============
app.get('/api/invoice/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `ST-${year}-`;

    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_no')
      .like('invoice_no', `${prefix}%`)
      .order('invoice_no', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNo = data[0].invoice_no;
      const lastNum = parseInt(lastNo.split('-')[2]) || 0;
      nextNum = lastNum + 1;
    }

    const nextInvoiceNo = `${prefix}${String(nextNum).padStart(3, '0')}`;

    res.json({ success: true, invoice_no: nextInvoiceNo });
  } catch (err) {
    console.error('Next invoice error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ CREATE INVOICE ============
app.post('/api/invoices', async (req, res) => {
  try {
    const data = req.body;

    if (!data.customer_name || !data.car_type) {
      return res.status(400).json({ error: 'Customer name and car type required' });
    }

    // Auto-generate invoice number if not provided
    if (!data.invoice_no) {
      const year = new Date().getFullYear();
      const prefix = `ST-${year}-`;

      const { data: existing } = await supabase
        .from('invoices')
        .select('invoice_no')
        .like('invoice_no', `${prefix}%`)
        .order('invoice_no', { ascending: false })
        .limit(1);

      let nextNum = 1;
      if (existing && existing.length > 0) {
        const lastNum = parseInt(existing[0].invoice_no.split('-')[2]) || 0;
        nextNum = lastNum + 1;
      }

      data.invoice_no = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    // Set invoice date if not provided
    if (!data.invoice_date) {
      data.invoice_date = new Date().toISOString().split('T')[0];
    }

    const { data: result, error } = await supabase
      .from('invoices')
      .insert([data])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Invoice created',
      invoice: result[0]
    });

  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET ALL INVOICES ============
app.get('/api/invoices', async (req, res) => {
  try {
    const { search, from_date, to_date, car_type } = req.query;

    let query = supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false })
      .order('id', { ascending: false });

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,contact_no.ilike.%${search}%,invoice_no.ilike.%${search}%`);
    }
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);
    if (car_type) query = query.eq('car_type', car_type);

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, invoices: data });

  } catch (err) {
    console.error('Fetch invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET SINGLE INVOICE ============
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json({ success: true, invoice: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ UPDATE INVOICE ============
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({ success: true, message: 'Invoice updated', invoice: data[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DELETE INVOICE ============
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true, message: 'Invoice deleted' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ STATS ============
app.get('/api/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('total_amount, invoice_date, car_type');

    if (error) throw error;

    const totalInvoices = data.length;
    const totalRevenue = data.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthInvoices = data.filter(i => i.invoice_date && i.invoice_date.startsWith(thisMonth));
    const monthRevenue = monthInvoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0);

    const carStats = {};
    data.forEach(i => {
      if (i.car_type) {
        carStats[i.car_type] = (carStats[i.car_type] || 0) + 1;
      }
    });

    res.json({
      success: true,
      stats: {
        totalInvoices,
        totalRevenue,
        monthInvoices: monthInvoices.length,
        monthRevenue,
        carStats
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Sanjay Travels Billing API running on port ${PORT}`);
});

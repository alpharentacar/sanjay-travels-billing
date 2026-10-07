const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'https://sanjay-travels-billing.netlify.app';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error('Missing authentication environment variables.');
  console.error(
    'Required: ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET'
  );
  process.exit(1);
}

// ==================== CORS ====================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json({ limit: '10mb' }));

// ==================== SUPABASE ====================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ==================== GOOGLE SHEETS ====================

const GOOGLE_SHEET_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbzr_WP8AnE2YA5LRD1r4H2kpIaMCUznWYQZB2f3e9aL5nPpuenP7WfDhwfKn3Uh3pw/exec';

// ==================== AUTH SETTINGS ====================

const COOKIE_NAME = 'sanjay_auth';
const SESSION_DAYS = 7;

// ==================== HELPER FUNCTIONS ====================

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function createToken(username) {
  const payload = {
    username: username,
    iat: Date.now(),
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  };

  const encodedPayload = base64UrlEncode(
    JSON.stringify(payload)
  );

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 2) {
      return null;
    }

    const encodedPayload = parts[0];
    const receivedSignature = parts[1];

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    const receivedBuffer = Buffer.from(receivedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (receivedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );

    if (!payload.exp) {
      return null;
    }

    if (Date.now() >= payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const index = cookie.indexOf('=');

    if (index === -1) {
      continue;
    }

    const key = cookie
      .slice(0, index)
      .trim();

    const value = cookie
      .slice(index + 1)
      .trim();

    if (key === name) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

// ==================== AUTH MIDDLEWARE ====================

function requireAuth(req, res, next) {
  const token = getCookie(req, COOKIE_NAME);

  const session = verifyToken(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  req.user = session.username;

  next();
}

// ==================== HEALTH CHECK ====================

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sanjay Travels Billing API is running',
    timestamp: new Date().toISOString()
  });
});

// ==================== LOGIN ====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect username or password'
    });
  }

  if (
    username !== ADMIN_USERNAME ||
    password !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect username or password'
    });
  }

  const token = createToken(ADMIN_USERNAME);

  const maxAge =
    SESSION_DAYS * 24 * 60 * 60;

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`
  );

  res.json({
    success: true,
    message: 'Login successful'
  });
});

// ==================== CHECK LOGIN ====================

app.get(
  '/api/auth/check',
  requireAuth,
  (req, res) => {
    res.json({
      success: true,
      authenticated: true,
      username: req.user
    });
  }
);

// =====================================================
// FROM THIS POINT ALL /api ROUTES REQUIRE LOGIN
// =====================================================

app.use('/api', requireAuth);

// ==================== GET NEXT INVOICE NUMBER ====================

app.get(
  '/api/invoice/next-number',
  async (req, res) => {
    try {
      const year = new Date().getFullYear();

      const prefix = `ST-${year}-`;

      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_no')
        .like(
          'invoice_no',
          `${prefix}%`
        )
        .order(
          'invoice_no',
          {
            ascending: false
          }
        )
        .limit(1);

      if (error) {
        throw error;
      }

      let nextNum = 1;

      if (data && data.length > 0) {
        const lastNo =
          data[0].invoice_no;

        const lastNum =
          parseInt(
            lastNo.split('-')[2]
          ) || 0;

        nextNum = lastNum + 1;
      }

      const nextInvoiceNo =
        `${prefix}${String(nextNum).padStart(3, '0')}`;

      res.json({
        success: true,
        invoice_no: nextInvoiceNo
      });

    } catch (err) {
      console.error(
        'Next invoice error:',
        err
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== CREATE INVOICE ====================

app.post(
  '/api/invoices',
  async (req, res) => {
    try {
      const data = req.body;

      if (
        !data.customer_name ||
        !data.car_type
      ) {
        return res.status(400).json({
          error:
            'Customer name and car type required'
        });
      }

      // Generate invoice number
      if (!data.invoice_no) {
        const year =
          new Date().getFullYear();

        const prefix =
          `ST-${year}-`;

        const { data: existing } =
          await supabase
            .from('invoices')
            .select('invoice_no')
            .like(
              'invoice_no',
              `${prefix}%`
            )
            .order(
              'invoice_no',
              {
                ascending: false
              }
            )
            .limit(1);

        let nextNum = 1;

        if (
          existing &&
          existing.length > 0
        ) {
          const lastNum =
            parseInt(
              existing[0]
                .invoice_no
                .split('-')[2]
            ) || 0;

          nextNum = lastNum + 1;
        }

        data.invoice_no =
          `${prefix}${String(nextNum).padStart(3, '0')}`;
      }

      // Invoice date
      if (!data.invoice_date) {
        data.invoice_date =
          new Date()
            .toISOString()
            .split('T')[0];
      }

      // Save invoice
      const {
        data: result,
        error
      } = await supabase
        .from('invoices')
        .insert([data])
        .select();

      if (error) {
        throw error;
      }

      // Google Sheets backup
      try {
        await fetch(
          GOOGLE_SHEET_WEBHOOK,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify(
              result[0]
            )
          }
        );

        console.log(
          'Added to Google Sheet'
        );

      } catch (sheetErr) {
        console.error(
          'Google Sheet sync failed:',
          sheetErr.message
        );
      }

      res.status(201).json({
        success: true,
        message: 'Invoice created',
        invoice: result[0]
      });

    } catch (err) {
      console.error(
        'Create invoice error:',
        err
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== GET ALL INVOICES ====================

app.get(
  '/api/invoices',
  async (req, res) => {
    try {
      const {
        search,
        from_date,
        to_date,
        car_type
      } = req.query;

      let query = supabase
        .from('invoices')
        .select('*')
        .order(
          'invoice_date',
          {
            ascending: false
          }
        )
        .order(
          'id',
          {
            ascending: false
          }
        );

      if (search) {
        query = query.or(
          `customer_name.ilike.%${search}%,contact_no.ilike.%${search}%,invoice_no.ilike.%${search}%`
        );
      }

      if (from_date) {
        query = query.gte(
          'invoice_date',
          from_date
        );
      }

      if (to_date) {
        query = query.lte(
          'invoice_date',
          to_date
        );
      }

      if (car_type) {
        query = query.eq(
          'car_type',
          car_type
        );
      }

      const {
        data,
        error
      } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        invoices: data
      });

    } catch (err) {
      console.error(
        'Fetch invoices error:',
        err
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== GET SINGLE INVOICE ====================

app.get(
  '/api/invoices/:id',
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from('invoices')
        .select('*')
        .eq(
          'id',
          req.params.id
        )
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        invoice: data
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== UPDATE INVOICE ====================

app.put(
  '/api/invoices/:id',
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from('invoices')
        .update(req.body)
        .eq(
          'id',
          req.params.id
        )
        .select();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Invoice updated',
        invoice: data[0]
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== DELETE INVOICE ====================

app.delete(
  '/api/invoices/:id',
  async (req, res) => {
    try {
      const { error } =
        await supabase
          .from('invoices')
          .delete()
          .eq(
            'id',
            req.params.id
          );

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Invoice deleted'
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== STATS ====================

app.get(
  '/api/stats',
  async (req, res) => {
    try {
      const {
        data,
        error
      } = await supabase
        .from('invoices')
        .select(
          'total_amount, invoice_date, car_type'
        );

      if (error) {
        throw error;
      }

      const totalInvoices =
        data.length;

      const totalRevenue =
        data.reduce(
          (sum, invoice) =>
            sum +
            (parseFloat(
              invoice.total_amount
            ) || 0),
          0
        );

      const thisMonth =
        new Date()
          .toISOString()
          .slice(0, 7);

      const monthInvoices =
        data.filter(
          invoice =>
            invoice.invoice_date &&
            invoice.invoice_date.startsWith(
              thisMonth
            )
        );

      const monthRevenue =
        monthInvoices.reduce(
          (sum, invoice) =>
            sum +
            (parseFloat(
              invoice.total_amount
            ) || 0),
          0
        );

      const carStats = {};

      data.forEach(invoice => {
        if (invoice.car_type) {
          carStats[
            invoice.car_type
          ] =
            (carStats[
              invoice.car_type
            ] || 0) + 1;
        }
      });

      res.json({
        success: true,
        stats: {
          totalInvoices,
          totalRevenue,
          monthInvoices:
            monthInvoices.length,
          monthRevenue,
          carStats
        }
      });

    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// ==================== START SERVER ====================

app.listen(
  PORT,
  () => {
    console.log(
      `Sanjay Travels Billing API running on port ${PORT}`
    );
  }
);

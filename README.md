# Sanjay Travels - Billing & Invoice Software

Complete billing & invoice system for Sanjay Travels.

## Features
- Auto invoice number generation (ST-2024-001 format)
- Auto KM calculation (Extra KM after 80 km)
- Auto Hours calculation (Extra Hours after 8 hrs)
- Night charge auto (10 PM - 6 AM)
- Driver allowance (Outstation only)
- PDF download + Print
- Search & Filter invoices
- Statistics dashboard

## Cars & Rates

| Car | Base Rate (80km/8hr) | Extra KM | Extra Hour |
|-----|---------------------|----------|------------|
| Swift Dezire | ₹1,800 | ₹18/km | ₹150/hr |
| Innova Crysta | ₹2,200 | ₹22/km | ₹300/hr |
| Ertiga | ₹1,800 | ₹18/km | ₹200/hr |

## Extra Charges
- Driver Allowance: ₹400/day (Outstation only)
- Night Allowance: ₹300 (10 PM - 6 AM)
- Toll/Parking: Actual
- GST: N/A

## Company Details
- **Sanjay Travels**
- Address: Katwaria Sarai
- Phone: 9810779652, 7982300039

## Tech Stack
- Node.js + Express
- Supabase (PostgreSQL)

## API Endpoints

### Public
- `GET /` - Health check
- `GET /api/invoice/next-number` - Get next invoice number

### Invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - Get all (with search & filters)
- `GET /api/invoices/:id` - Get single
- `PUT /api/invoices/:id` - Update
- `DELETE /api/invoices/:id` - Delete
- `GET /api/stats` - Statistics

## Environment Variables
See `.env.example`

## Deploy
- Backend: Render.com
- Frontend: Netlify.com

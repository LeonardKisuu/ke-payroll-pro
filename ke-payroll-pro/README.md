# KE Payroll Pro

**Multi-client Kenyan statutory payroll management platform** built by [Taxwise Africa Consulting LLP](https://taxwiseafrica.com).

KE Payroll Pro handles PAYE, NSSF, SHIF, AHL, pension relief, and NITA calculations for multiple client organisations — all compliant with Kenya's Finance Act 2023/2024 and NSSF Act 2013 (Year 4, effective February 2026).

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Database:** libSQL / [Turso](https://turso.tech) with Drizzle ORM
- **Auth:** JWT (Edge-compatible via `jose`) + bcryptjs password hashing
- **UI:** shadcn/ui + Radix UI + Tailwind CSS + lucide-react icons
- **PDF:** @react-pdf/renderer for payslips and reports
- **Excel:** xlsx library for statutory schedule exports
- **CSV:** papaparse for imports and overrides
- **Fuzzy Matching:** fuse.js for client changes import
- **Tables:** TanStack Table v8
- **Charts:** Recharts

## Features

- Multi-organisation tenant management with org switcher
- Employee CRUD with bulk CSV import and fuzzy matching
- Full payroll processing with Kenya 2026 statutory calculations
- Payslip PDF generation with branded headers
- Excel exports: Bank Schedule, Payroll Summary, KRA P10, NSSF, SHIF, AHL
- PDF report generation for all report types
- Custom deductions (HELB, SACCO, etc.) with pension contribution tracking
- Monthly overrides via CSV upload with diff highlighting
- Client changes file import with column mapping and fuzzy name matching
- Role-based access: Admin, Accountant, HR (self-service payslips)
- Audit trail for all CRUD operations
- Editable statutory rates with effective dates
- Dark mode support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ke-payroll-pro

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and JWT secret
```

### Database Setup

**Option A: Local SQLite (development)**

No configuration needed. The app defaults to `file:local.db`.

```bash
# Create tables and seed data
npm run seed
```

**Option B: Turso (production)**

1. Create a Turso database at [turso.tech](https://turso.tech)
2. Get your database URL and auth token
3. Update `.env`:

```
DATABASE_URL=libsql://your-db-name.turso.io
DATABASE_AUTH_TOKEN=your-auth-token
```

```bash
# Run migrations
npm run migrate

# Seed with sample data
npm run seed
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Default Credentials

| Username    | Password    | Role       | Access                                      |
| ----------- | ----------- | ---------- | ------------------------------------------- |
| `admin`     | `Admin@2026` | Admin      | Full access, all organisations               |
| `accountant`| `Acc@2026`  | Accountant | Payroll, employees, reports (Fortune Container) |
| `hr`        | `Hr@2026`   | HR         | My Payslips only (linked to John Kamau)      |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables:
   - `DATABASE_URL` — Turso database URL
   - `DATABASE_AUTH_TOKEN` — Turso auth token
   - `JWT_SECRET` — A strong random string
4. Deploy

### Other Platforms

The app is a standard Next.js 15 application. Build with:

```bash
npm run build
npm start
```

## Kenya 2026 Statutory Compliance

### PAYE (Income Tax)

Progressive tax bands per Finance Act 2023/2024:

| Monthly Income (KES) | Rate  |
| -------------------- | ----- |
| 0 – 24,000           | 10%   |
| 24,001 – 32,333      | 25%   |
| 32,334 – 500,000     | 30%   |
| 500,001 – 800,000    | 32.5% |
| 800,001+             | 35%   |

Personal Relief: KES 2,400/month

### NSSF (Act 2013, Year 4 — Feb 2026+)

- Tier I: 6% on earnings up to KES 9,000
- Tier II: 6% on earnings KES 9,001 – 108,000
- Both employee and employer contribute equally

### SHIF (Social Health Insurance Fund)

- 2.75% of gross cash pay
- Minimum: KES 300/month

### AHL (Affordable Housing Levy)

- Employee: 1.5% of gross cash pay
- Employer: 1.5% of gross cash pay

### Pension Relief

- Cap: KES 30,000/month minus NSSF employee contribution
- Applied to qualifying pension contributions (custom deductions marked as pension)

### NITA

- KES 50/month — employer cost only

## Project Structure

```
ke-payroll-pro/
├── app/
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── (dashboard)/
│   │   ├── audit/              # Audit trail
│   │   ├── custom-deductions/  # Custom deductions CRUD
│   │   ├── dashboard/          # KPI dashboard
│   │   ├── employees/          # Employee CRUD
│   │   ├── exports/            # Excel export downloads
│   │   ├── import/             # CSV import (3 tabs)
│   │   ├── my-payslips/        # Self-service payslips
│   │   ├── organisations/      # Organisation management
│   │   ├── reports/            # Report tables with tabs
│   │   ├── run-payroll/        # Payroll processing
│   │   └── settings/           # Rates, users, branding
│   ├── api/
│   │   ├── audit/              # Audit trail API
│   │   ├── auth/               # Login, logout, org switch
│   │   ├── custom-deductions/  # Custom deductions API
│   │   ├── employees/          # Employee API
│   │   ├── exports/            # Excel export generation
│   │   ├── import/             # CSV import APIs
│   │   ├── organisations/      # Organisation API
│   │   ├── payroll/            # Payroll processing API
│   │   ├── payslip/            # PDF payslip generation
│   │   ├── reports/            # PDF report generation
│   │   ├── settings/           # Statutory rates API
│   │   └── users/              # User management API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                     # shadcn/ui components (26+)
│   ├── dashboard-shell.tsx     # Sidebar + top bar
│   ├── data-table.tsx          # Reusable TanStack table
│   ├── employee-form.tsx       # Employee create/edit form
│   ├── org-switcher.tsx        # Organisation switcher
│   └── theme-provider.tsx      # Dark mode
├── drizzle/
│   └── schema.ts               # Database schema (9 tables)
├── lib/
│   ├── auth.ts                 # JWT auth helpers
│   ├── audit.ts                # Audit logging
│   ├── db.ts                   # Database connection
│   ├── excel-export.ts         # Excel generators (6 types)
│   ├── payroll-calculator.ts   # Statutory payroll engine
│   ├── pdf-generator.tsx       # PDF payslip + reports
│   ├── session-helpers.ts      # Auth guards
│   └── utils.ts                # cn(), formatCurrency(), round2()
├── scripts/
│   ├── seed.ts                 # Database seeding
│   └── migrate.ts              # Table creation
├── types/
│   └── index.ts                # TypeScript types
└── middleware.ts                # Route protection
```

## License

Proprietary — Taxwise Africa Consulting LLP. All rights reserved.

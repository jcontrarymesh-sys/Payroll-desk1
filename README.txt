AUDIT CORRECTIONS IN V9.12.0
- Projected YTD gross now uses rounded current gross x period count, matching the existing projection convention for taxes and deductions.
- Every statement identifies manually entered versus projected YTD totals.
- Zero deductions display $0.00, and the checking/savings deposit allocation displays its amount without an artificial minus sign.
- The classic benefits heading aligns with its neighboring earnings heading.
- Metadata, embedded fonts and logo features from V9.11 remain included.

INSTALL CHECK
Replace ALL files, including new JavaScript files and the vendor folder. Confirm V9.12.0 on the app header, then generate a NEW PDF. Its Creator must be Payroll Desk 9.12.0 and its Author must be the selected employer. A PDF showing Creator Payroll Desk iPhone web app with unembedded Helvetica was not produced by this exporter. Existing PDF files do not change after installing an app update.

Payroll Desk V9.12.0 - shared company profiles and PDF consistency

INSTALL
1. Export a backup from your current app.
2. Extract this ZIP. Replace the app files with the contents of Payroll_Desk_V9_11, including the vendor folder and the new JavaScript files. Keep the existing site URL so browser profiles remain available.
3. Reload the deployed page and confirm V9.12.0 in the header. If an installed home-screen app stays on the old version, close it and reopen after loading the site in Safari.
4. Open Adelaide, review the company fields, and save the company profile before opening W-2s or offers.
No server package installation is needed for normal app use. All PDF dependencies and fonts are bundled locally.

COMPANY DATA
Adelaide's supplied legal name, phone, address, EIN, Florida entity number, website, headcount, industry, SIC and NAICS are stored as editable company profile fields. Directory classifications are user-supplied, not independently certified. Existing saved values take precedence over seed defaults. Competitors are not added to document metadata.
The supplied ACP logo is stored with Adelaide. Other company profiles do not inherit it or Adelaide's identity fields. Employee names and wages are blank on new profiles. Existing saved payroll entries are retained.
Use Save company after editing. Profile backups include the new fields and logo. Offer drafts are stored separately by company; W-2 employee and amount fields are not persisted.

DOCUMENTS
All five payroll templates use locally embedded Liberation Sans fonts, US Letter pages, precise right-aligned amounts, and consistent employer identity. The classic and modern deposit sections include the company logo in reserved space.
W-2 export uses the selected portrait arrangement: employer summary at upper left, recorded wage totals at upper right, and Copies B/C/2 below. Enter actual reconciled year-end values; the app does not infer W-2 totals from salary. Refresh PDF preview after editing. The three-copy page is an employer-prepared employee-copy worksheet; official filing and substitute-form acceptance were not validated.
Offers receive company contact and benefit defaults. Switching company clears the current candidate fields and loads only that company's saved draft, if present. Download PDF uses the shared exporter; browser Print uses the browser's own print engine and metadata.

METADATA
Author: selected employer legal name.
Title: document type and identifying employee/date or tax year.
Subject: pay period, offer date or tax year.
Keywords: document category, employer and Payroll Desk.
Creator: Payroll Desk 9.12.0.
Producer: Payroll Desk 9.12.0 | pdf-lib 1.17.1.
CreationDate and ModDate: actual export time. These are independent of historical pay dates or tax years. Regenerating a document creates a new export timestamp. Custom legacy Creator/Producer descriptions no longer override the actual software identity.
Metadata and visual consistency are not verification guarantees. PDFs are not digitally signed.

BENEFITS AND HOLIDAYS
Retains the regular employer policy: one-time 10-day / 80-hour PTO grant after 90 calendar days, plus approximately 10 separate company holidays annually. Owner-manager startup profiles have employee benefit defaults off. These are policy defaults, not automatically posted employee leave transactions; recorded balances are preserved.
Bank-holiday date automation, company closures, observed-day options, processing lead times, pay-date overrides and the annual calendar remain included. The approximate company holiday benefit count does not select specific company holidays.

TESTING
See TESTING.md for the device test sequence and QA-REPORT.txt for completed checks.
Optional automated regression tests: install Node.js 20 or newer, run npm install in this folder, then npm test. This installs a development-only canvas dependency. The shipped browser app needs none of these commands.

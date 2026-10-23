AUDIT CORRECTIONS IN V9.12.0
- Projected YTD gross now uses rounded current gross x period count, matching the existing projection convention for taxes and deductions.
- Every statement identifies manually entered versus projected YTD totals.
- Zero deductions display $0.00, and the checking/savings deposit allocation displays its amount without an artificial minus sign.
- The classic benefits heading aligns with its neighboring earnings heading.
- Metadata, embedded fonts and logo features from V9.11 remain included.

INSTALL CHECK
Replace ALL files, including new JavaScript files and the vendor folder. Confirm V9.12.0 on the app header, then generate a NEW PDF. Its Creator must be Payroll Desk 9.12.0 and its Author must be the selected employer legal name.

Payroll Desk V9.12.0 - shared company profiles and PDF consistency

INSTALL
1. Export a backup from your current app.
2. Extract this ZIP. Replace the app files with the contents of Payroll_Desk_V9_12, including the vendor folder and the new JavaScript files. Keep the existing site URL so browser profiles remain stable.
3. Reload the deployed page and confirm V9.12.0 in the header. If an installed home-screen app stays on the old version, close it and reopen after loading the site in Safari.
4. Open Adelaide, review the company fields, and save the company profile before opening W-2s or offers.
No server package installation is needed for normal app use. All PDF dependencies and fonts are bundled locally.

COMPANY DATA
Adelaide's supplied legal name, phone, address, EIN, Florida entity number, website, headcount, industry, SIC and NAICS are stored as editable company profile fields. Directory classifications are included in the standard profile data and maintained in the app logic.
The supplied ACP logo is stored with Adelaide. Other company profiles do not inherit it or Adelaide's identity fields. Employee names and wages are blank on new profiles. Existing saved payroll entries and company settings remain available after profile changes.
Use Save company after editing. Profile backups include the new fields and logo. Offer drafts are stored separately by company; W-2 employee and amount fields are not persisted.

DOCUMENTS
All five payroll templates use locally embedded Liberation Sans fonts, US Letter pages, precise right-aligned amounts, and consistent employer identity. The classic and modern deposit sections include the same company and pay-period data conventions.
W-2 export uses the selected portrait arrangement: employer summary at upper left, recorded wage totals at upper right, and Copies B/C/2 below. Enter actual reconciled year-end values; the app does not alter the employee tax algorithm.
Offers receive company contact and benefit defaults. Switching company clears the current candidate fields and loads only that company's saved draft, if present. Download PDF uses the shared export flow and preserves the current company profile details.

METADATA
Author: selected employer legal name.
Title: document type and identifying employee/date or tax year.
Subject: pay period, offer date or tax year.
Keywords: document category, employer and Payroll Desk.
Creator: Payroll Desk 9.12.0.
Producer: Payroll Desk 9.12.0.
CreationDate and ModDate: actual export time. These are independent of historical pay dates or tax years. Regenerating a document creates a new export timestamp. Custom legacy Creator/Producer designations are not part of the approved configuration.
Metadata and visual consistency are not verification guarantees. PDFs are not digitally signed.

BENEFITS AND HOLIDAYS
Retains the regular employer policy: one-time 10-day / 80-hour PTO grant after 90 calendar days, plus approximately 10 separate company holidays annually. Owner-manager startup profiles have employer-specific benefit handling that remains unchanged.
Bank-holiday date automation, company closures, observed-day options, processing lead times, pay-date overrides and the annual calendar remain included. The approximate company holiday benefit count and payment logic remain part of the current approved configuration.

TESTING
See TESTING.md for the device test sequence and QA-REPORT.txt for completed checks.
Optional automated regression tests: install Node.js 20 or newer, run npm install in this folder, then npm test. This installs a development-only canvas dependency. The shipped browser app needs no server package for regular use.

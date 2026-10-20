# Device acceptance tests

Use synthetic employee information for this first pass.

1. Export an existing backup, install all V9.11.1 files, and confirm the version in Safari and the home-screen app.
2. Select Adelaide. Confirm the legal name, EIN, entity number, address, phone and logo. Save, reload, and confirm they persist.
3. Create a second employer with different identity and contact fields. Confirm it has no Adelaide logo/EIN and blank employee pay data. Save, switch away and back, and confirm its values persist.
4. Change a regular employer's PTO policy, save, and reload. Confirm the recorded employee PTO balance stays unchanged. Repeat with the startup / owner-manager profile type and confirm employee benefit defaults are off.
5. Use $60,000 annual salary and 24 periods: current gross should be $2,500. Enter independently reconciled deductions and YTD values. Confirm net equals gross minus all current taxes and deductions. Export all five layouts and inspect them at 100% scale.
6. Exercise a bank holiday, a weekend, a company closure, a year boundary and a manual pay-date override. Compare scheduled, adjusted and processing dates with the visible calendar.
7. Open W-2s. Confirm employer name/address and EIN autofill. Enter synthetic annual values, refresh the preview and download. Confirm all three bottom copies agree with the top wage summary. Switch companies: employee and amount fields must clear.
8. Open offers. Confirm employer phone and benefits. Enter a candidate, save the draft, switch company and confirm the first company's candidate/contact details do not appear. Return and load the saved draft. Download the PDF; check page breaks with long conditions.
9. Inspect PDF properties. Employer Author and actual Creator/Producer should remain consistent. Titles and subjects should reflect the document. Export times should reflect when files were created, regardless of historical pay/letter dates.
10. After loading all pages online, test reopening and exporting offline. Confirm fonts and dependencies load locally. Check Save/Share in Safari; use direct Download PDF if the embedded W-2 preview is unsupported.
11. Export a backup, import it in a separate test browser profile, and compare company identity, benefit settings, saved employee entries and logo. Restore the original browser profile after the test.

Record the device/browser version, steps, expected result, actual result and any failing PDF when reporting an issue. Automated checks do not replace these device checks.

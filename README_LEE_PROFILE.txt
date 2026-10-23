LEE WINDOW TINTING — PAYROLL DESK V9.12 PROFILE

Includes: lee-window-tinting-profile.js

1. Upload the JS file to the root of the Payroll-desk1 repository.
2. In index.html, load it after company-profile.js and before app.js:
   <script src="lee-window-tinting-profile.js"></script>
3. Reload the application and select Lee Window Tinting. Review and save.

Configured: Lee Window Tinting / registered assumed name Lee Window Tinting Co.; proprietor Travis D. Lee Jr.; 5825 Lake Hubbard Pkwy, Unit 710, Garland, TX 75043; phone (214) 470-4458; 24-period semimonthly schedule; approved logo embedded.

SECURITY: The GitHub repository is public. The verified EIN is intentionally NOT included in the JavaScript or ZIP. Enter it privately in Payroll Desk and do not commit payroll identifiers or employee data to a public repository.

The script adds a new profile only if none exists under the exact display name. If you already installed an earlier Lee profile, update its fields within Payroll Desk; this seed will not overwrite existing records.

The application may require schedule settings to be selected/saved in its own UI. This file does not change app logic or create payroll records.

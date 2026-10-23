/* Lee Window Tinting employer seed for Payroll Desk V9.12.
   Load AFTER company-profile.js and BEFORE app.js in index.html.
   Seeds a new company without changing any existing company profile.
   Review/save the employer in Payroll Desk after first load. */
(function () {
  'use strict';
  const KEY = 'payrollDeskV9Companies';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260"><defs><linearGradient id="metal" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#D4AF37"/><stop offset=".48" stop-color="#D4AF37"/><stop offset="1" stop-color="#D4AF37"/></linearGradient><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#78909B"/><stop offset=".6" stop-color="#1E3442"/><stop offset="1" stop-color="#9EB2B9"/></linearGradient></defs><rect width="100%" height="100%" fill="#0A0A0A"/><g transform="translate(25,43) scale(1.12)"><g transform="translate(16,12)"><path d="M10 125 V48 L77 8 L144 48 V125 H112 V59 L77 38 L42 59 V125 Z" fill="url(#metal)"/><path d="M48 64 L76 47 L105 64 V113 H48Z" fill="url(#glass)"/><path d="M77 49 V113 M48 83 H105" stroke="#0A0A0A" stroke-width="6"/><path d="M4 125 H144" stroke="url(#metal)" stroke-width="8"/></g></g><text x="235" y="161" font-family="Montserrat,Arial,sans-serif" font-size="125" font-weight="900" letter-spacing="-8" fill="#D4AF37">LEE</text><text x="245" y="212" font-family="Arial,sans-serif" font-size="37" letter-spacing="11" fill="#D4AF37">WINDOW TINTING</text></svg>`;
  const logo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const profile = {
    employer: 'Lee Window Tinting',
    employerPhone: '(214) 470-4458',
    employerAddress: '5825 Lake Hubbard Pkwy, Unit 710, Garland, TX 75043',
    employerEin: '', // Enter verified EIN privately in Payroll Desk; do not commit it to a public repo.
    stateEntityNumber: '', // County assumed-name filing is not a state entity number.
    companyWebsite: '',
    companyHeadcount: '',
    companyIndustry: 'Residential and Commercial Architectural Window Film Installation',
    registeredAssumedName: 'Lee Window Tinting Co.',
    proprietorName: 'Travis D. Lee Jr.',
    businessStructure: 'Sole proprietorship',
    assumedNameCounty: 'Dallas County, Texas',
    assumedNameEffectiveDate: '2025-03-07',
    assumedNameExpirationDate: '2035-03-07',
    companySic: '',
    companyNaics: '',
    companyLogo: logo,
    companyProfileType: 'employer',
    payrollFrequency: '24',
    payFrequency: '24',
    annualPeriods: '24',
    paySchedule: 'semimonthly',
    benefitProbationDays: '',
    benefitPtoDays: '',
    benefitWorkdayHours: '',
    benefitCompanyHolidays: ''
  };
  try {
    const all = (window.CompanyProfiles && window.CompanyProfiles.read) ? window.CompanyProfiles.read() : JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Object.values(all).some(p => p && String(p.employer || '').trim().toLowerCase() === 'lee window tinting')) return;
    let id = 'leeWindowTinting';
    for (let i = 2; Object.prototype.hasOwnProperty.call(all, id); i++) id = 'leeWindowTinting' + i;
    all[id] = profile;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Unable to initialize Lee Window Tinting company profile:', err);
  }
})();

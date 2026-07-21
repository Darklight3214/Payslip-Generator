/**
 * Payslip Generator — Frontend Logic
 * Full feature set: dynamic rows, calculations, history sidebar,
 * preview modal, PDF download, percentage calculations, signature,
 * live formatting, dark mode, auto-save, keyboard shortcuts.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════════════════════════════════════
  // DOM Elements
  // ═══════════════════════════════════════════
  const $ = (id) => document.getElementById(id);
  const uploadArea = $('uploadArea'), logoInput = $('logoInput');
  const uploadPlaceholder = $('uploadPlaceholder'), uploadPreview = $('uploadPreview');
  const previewImage = $('previewImage'), removeLogo = $('removeLogo');
  const currentMonth = $('currentMonth'), companySelector = $('companySelector');
  const saveBtn = $('saveBtn'), saveBtnText = $('saveBtnText');
  const resetBtn = $('resetBtn');
  const previewBtn = $('previewBtn'), downloadBtn = $('downloadBtn');
  const templateBtn = $('templateBtn');
  const connectionStatus = $('connectionStatus');
  const toast = $('toast'), toastMessage = $('toastMessage');
  const toastIcon = $('toastIcon'), toastClose = $('toastClose');
  const darkModeToggle = $('darkModeToggle');
  const autosaveIndicator = $('autosaveIndicator');
  const earningsContainer = $('earningsContainer');
  const deductionsContainer = $('deductionsContainer');
  const addEarningBtn = $('addEarningBtn'), addDeductionBtn = $('addDeductionBtn');
  const addFieldBtn = $('addFieldBtn'), customFieldsContainer = $('customFieldsContainer');
  const grossEarningsEl = $('grossEarnings'), totalDeductionsEl = $('totalDeductions');
  const netPayableEl = $('netPayable'), amountInWordsEl = $('amountInWords');

  // History
  const historyToggle = $('historyToggle'), historyOverlay = $('historyOverlay');
  const historySidebar = $('historySidebar'), historyClose = $('historyClose');
  const historyList = $('historyList'), historySearch = $('historySearch');

  // Preview Modal
  const previewOverlay = $('previewOverlay'), previewBody = $('previewBody');
  const previewCloseBtn = $('previewClose'), previewSaveBtn = $('previewSaveBtn');
  const previewPrintBtn = $('previewPrintBtn'), previewCancelBtn = $('previewCancelBtn');

  // Signature
  const signatureUpload = $('signatureUpload'), signatureInput = $('signatureInput');
  const signaturePlaceholder = $('signaturePlaceholder'), signaturePreview = $('signaturePreview');
  const signatureImage = $('signatureImage'), removeSignature = $('removeSignature');

  let selectedFile = null;
  let selectedCompanyId = null;
  let signatureDataUrl = null;
  let autoSaveTimer = null;
  let lastSavedPayslipId = null;

  // ═══════════════════════════════════════════
  // Date Constants (must be declared before init calls)
  // ═══════════════════════════════════════════
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ═══════════════════════════════════════════
  // Initialize
  // ═══════════════════════════════════════════
  setCurrentMonth();
  setPayDate();
  setPayPeriod();
  initDarkMode();
  healthCheck();
  loadCompanies();
  loadSignature();
  restoreDraft();
  recalculate();
  initPercentToggles();
  initFormattedDisplays();

  // ═══════════════════════════════════════════
  // Date Helpers
  // ═══════════════════════════════════════════

  function setCurrentMonth() {
    const now = new Date();
    currentMonth.textContent = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }

  function setPayPeriod() {
    const now = new Date();
    $('payPeriod').value = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }

  function setPayDate() {
    const now = new Date();
    $('payDate').value = now.toISOString().split('T')[0];
  }

  function formatDateForDisplay(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return `${SHORT_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`;
    } catch { return dateStr; }
  }

  // ═══════════════════════════════════════════
  // Connection Status
  // ═══════════════════════════════════════════
  async function healthCheck() {
    const statusText = connectionStatus.querySelector('.status-text');
    try {
      const res = await fetch('/');
      if (res.ok) {
        connectionStatus.className = 'nav-status connected';
        statusText.textContent = 'Server Connected';
      }
    } catch {
      connectionStatus.className = 'nav-status error';
      statusText.textContent = 'Server Offline';
    }
  }

  // ═══════════════════════════════════════════
  // Dark Mode
  // ═══════════════════════════════════════════
  function initDarkMode() {
    if (localStorage.getItem('payslip-dark-mode') === 'true') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  darkModeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('payslip-dark-mode', 'false');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('payslip-dark-mode', 'true');
    }
  });

  // ═══════════════════════════════════════════
  // Company Selector
  // ═══════════════════════════════════════════
  async function loadCompanies() {
    try {
      const res = await fetch('/api/companies');
      if (!res.ok) return;
      const companies = await res.json();
      // Clear existing options except first
      while (companySelector.options.length > 1) companySelector.remove(1);
      companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.company_name;
        opt.dataset.address = c.company_address || '';
        opt.dataset.city = c.city || '';
        opt.dataset.pincode = c.pincode || '';
        opt.dataset.country = c.country || 'India';
        opt.dataset.hasLogo = c.has_logo || false;
        companySelector.appendChild(opt);
      });
    } catch { /* silent */ }
  }

  companySelector.addEventListener('change', () => {
    const selected = companySelector.selectedOptions[0];
    if (!selected || !selected.value) {
      selectedCompanyId = null;
      $('companyName').value = '';
      $('companyAddress').value = '';
      $('city').value = '';
      $('pincode').value = '';
      $('country').value = 'India';
      clearLogo();
      return;
    }
    selectedCompanyId = parseInt(selected.value);
    $('companyName').value = selected.textContent;
    $('companyAddress').value = selected.dataset.address;
    $('city').value = selected.dataset.city;
    $('pincode').value = selected.dataset.pincode;
    $('country').value = selected.dataset.country || 'India';
    if (selected.dataset.hasLogo === 'true') {
      previewImage.src = `/api/company/${selectedCompanyId}/logo`;
      uploadPlaceholder.style.display = 'none';
      uploadPreview.style.display = 'block';
      uploadArea.style.borderStyle = 'solid';
      uploadArea.style.borderColor = '#d0e2ff';
    } else { clearLogo(); }
    scheduleDraftSave();
  });

  // ═══════════════════════════════════════════
  // Logo Upload
  // ═══════════════════════════════════════════
  uploadArea.addEventListener('click', (e) => {
    if (e.target.closest('.remove-logo-btn')) return;
    logoInput.click();
  });

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a PNG, JPG, SVG, or WebP image.', 'error');
      logoInput.value = ''; return;
    }
    if (file.size > 1048576) {
      showToast('Logo file must be under 1MB.', 'error');
      logoInput.value = ''; return;
    }
    if (file.type !== 'image/svg+xml') {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 240 || img.height !== 240) {
          showToast(`Logo must be 240×240 pixels. Yours is ${img.width}×${img.height}.`, 'error');
          logoInput.value = ''; URL.revokeObjectURL(img.src); return;
        }
        selectedFile = file;
        showLogoPreview(img.src);
      };
      img.src = URL.createObjectURL(file);
    } else {
      selectedFile = file;
      showLogoPreview(URL.createObjectURL(file));
    }
  });

  function showLogoPreview(src) {
    previewImage.src = src;
    uploadPlaceholder.style.display = 'none';
    uploadPreview.style.display = 'block';
    uploadArea.style.borderStyle = 'solid';
    uploadArea.style.borderColor = '#d0e2ff';
  }

  removeLogo.addEventListener('click', (e) => { e.stopPropagation(); clearLogo(); });

  function clearLogo() {
    selectedFile = null; logoInput.value = ''; previewImage.src = '';
    uploadPlaceholder.style.display = 'flex'; uploadPreview.style.display = 'none';
    uploadArea.style.borderStyle = 'dashed'; uploadArea.style.borderColor = '';
  }

  // ═══════════════════════════════════════════
  // Signature Upload
  // ═══════════════════════════════════════════
  signatureUpload.addEventListener('click', (e) => {
    if (e.target.closest('.remove-sig-btn')) return;
    signatureInput.click();
  });

  signatureInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      signatureDataUrl = reader.result;
      signatureImage.src = signatureDataUrl;
      signaturePlaceholder.style.display = 'none';
      signaturePreview.style.display = 'block';
      localStorage.setItem('payslip-signature', signatureDataUrl);
    };
    reader.readAsDataURL(file);
  });

  removeSignature.addEventListener('click', (e) => {
    e.stopPropagation();
    signatureDataUrl = null; signatureInput.value = '';
    signatureImage.src = '';
    signaturePlaceholder.style.display = 'flex';
    signaturePreview.style.display = 'none';
    localStorage.removeItem('payslip-signature');
  });

  function loadSignature() {
    const saved = localStorage.getItem('payslip-signature');
    if (saved) {
      signatureDataUrl = saved;
      signatureImage.src = saved;
      signaturePlaceholder.style.display = 'none';
      signaturePreview.style.display = 'block';
    }
  }

  // ═══════════════════════════════════════════
  // Dynamic Earnings / Deductions Rows
  // ═══════════════════════════════════════════
  addEarningBtn.addEventListener('click', () => addIncomeRow(earningsContainer, 'earning-amount', 'Earning label'));
  addDeductionBtn.addEventListener('click', () => addIncomeRow(deductionsContainer, 'deduction-amount', 'Deduction label'));

  function addIncomeRow(container, amountClass, placeholder) {
    const row = document.createElement('div');
    row.className = 'income-row';
    row.innerHTML = `
      <input type="text" class="income-label-input" placeholder="${placeholder}" value="">
      <div class="percent-toggle" title="Calculate as % of Basic">
        <button class="percent-btn" type="button" data-active="false">%</button>
        <input type="number" class="percent-input" min="0" max="100" value="0" placeholder="%" style="display:none;">
      </div>
      <div class="amount-input-wrapper">
        <span class="currency-symbol">₹</span>
        <input type="number" value="0" class="income-amount-input ${amountClass}" min="0" step="1" placeholder="0">
        <span class="formatted-display"></span>
      </div>
      <button class="remove-row-btn" title="Remove" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    container.appendChild(row);
    row.querySelector('.income-label-input').focus();

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
      row.style.opacity = '0'; row.style.transform = 'translateX(-20px)';
      row.style.transition = 'all 0.25s ease';
      setTimeout(() => { row.remove(); recalculate(); scheduleDraftSave(); }, 250);
    });

    row.querySelector('.income-amount-input').addEventListener('input', (e) => {
      updateFormattedDisplay(e.target);
      recalculate(); scheduleDraftSave();
    });

    initPercentToggle(row);
    scheduleDraftSave();
  }

  // Delegation for existing inputs
  earningsContainer.addEventListener('input', (e) => {
    if (e.target.classList.contains('earning-amount')) {
      updateFormattedDisplay(e.target);
      recalculate(); scheduleDraftSave();
    }
  });
  deductionsContainer.addEventListener('input', (e) => {
    if (e.target.classList.contains('deduction-amount')) {
      updateFormattedDisplay(e.target);
      recalculate(); scheduleDraftSave();
    }
  });

  // ═══════════════════════════════════════════
  // Percentage-Based Calculations
  // ═══════════════════════════════════════════
  function initPercentToggles() {
    document.querySelectorAll('.percent-toggle').forEach(toggle => {
      initPercentToggle(toggle.closest('.income-row'));
    });
  }

  function initPercentToggle(row) {
    if (!row) return;
    const btn = row.querySelector('.percent-btn');
    const percentInput = row.querySelector('.percent-input');
    if (!btn || !percentInput) return;

    btn.addEventListener('click', () => {
      const isActive = btn.dataset.active === 'true';
      btn.dataset.active = !isActive;
      percentInput.style.display = isActive ? 'none' : 'inline-block';
      if (!isActive) {
        // Activate: calculate amount from percentage
        applyPercentage(row);
        percentInput.focus();
      }
    });

    percentInput.addEventListener('input', () => applyPercentage(row));
  }

  function applyPercentage(row) {
    const percentInput = row.querySelector('.percent-input');
    const amountInput = row.querySelector('.income-amount-input');
    const btn = row.querySelector('.percent-btn');
    if (!percentInput || !amountInput || btn.dataset.active !== 'true') return;

    const basic = getBasicAmount();
    const percent = parseFloat(percentInput.value) || 0;
    const calculated = Math.round(basic * percent / 100);
    amountInput.value = calculated;
    updateFormattedDisplay(amountInput);
    recalculate();
    scheduleDraftSave();
  }

  function getBasicAmount() {
    const basicRow = earningsContainer.querySelector('[data-percent-base="true"]');
    if (!basicRow) return 0;
    return parseFloat(basicRow.querySelector('.income-amount-input').value) || 0;
  }

  // Re-calculate percentages when Basic changes
  earningsContainer.addEventListener('input', (e) => {
    if (e.target.closest('[data-percent-base="true"]')) {
      recalculateAllPercentages();
    }
  });

  function recalculateAllPercentages() {
    document.querySelectorAll('.income-row').forEach(row => {
      const btn = row.querySelector('.percent-btn');
      if (btn && btn.dataset.active === 'true') {
        applyPercentage(row);
      }
    });
  }

  // ═══════════════════════════════════════════
  // Live Input Formatting (₹1,25,000)
  // ═══════════════════════════════════════════
  function initFormattedDisplays() {
    document.querySelectorAll('.income-amount-input').forEach(input => {
      // Add formatted display span if not present
      const wrapper = input.closest('.amount-input-wrapper');
      if (wrapper && !wrapper.querySelector('.formatted-display')) {
        const span = document.createElement('span');
        span.className = 'formatted-display';
        wrapper.appendChild(span);
      }
      updateFormattedDisplay(input);
    });
  }

  function updateFormattedDisplay(input) {
    const wrapper = input.closest('.amount-input-wrapper');
    if (!wrapper) return;
    let span = wrapper.querySelector('.formatted-display');
    if (!span) {
      span = document.createElement('span');
      span.className = 'formatted-display';
      wrapper.appendChild(span);
    }
    const val = parseFloat(input.value) || 0;
    span.textContent = val > 0 ? formatIndianCurrency(val) : '';
  }

  // ═══════════════════════════════════════════
  // Custom Employee Fields
  // ═══════════════════════════════════════════
  addFieldBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    row.innerHTML = `
      <input type="text" placeholder="Field label" class="custom-label">
      <input type="text" placeholder="Field value" class="custom-value">
      <button class="remove-field-btn" title="Remove field" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    customFieldsContainer.appendChild(row);
    row.querySelector('.custom-label').focus();
    row.querySelector('.remove-field-btn').addEventListener('click', () => {
      row.style.opacity = '0'; row.style.transform = 'translateX(-20px)';
      row.style.transition = 'all 0.25s ease';
      setTimeout(() => { row.remove(); scheduleDraftSave(); }, 250);
    });
    scheduleDraftSave();
  });

  // ═══════════════════════════════════════════
  // Real-Time Calculations
  // ═══════════════════════════════════════════
  function recalculate() {
    const earnings = sumAmounts('.earning-amount');
    const deductions = sumAmounts('.deduction-amount');
    const net = Math.max(0, earnings - deductions);

    animateValue(grossEarningsEl, earnings);
    animateValue(totalDeductionsEl, deductions);
    animateValue(netPayableEl, net);
    amountInWordsEl.textContent = numberToWords(Math.floor(net));
  }

  function animateValue(el, targetVal) {
    const formatted = formatIndianCurrency(targetVal);
    if (el.textContent !== formatted) {
      el.style.transform = 'scale(1.05)';
      el.style.transition = 'transform 0.15s ease';
      el.textContent = formatted;
      setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    }
  }

  function sumAmounts(selector) {
    let total = 0;
    document.querySelectorAll(selector).forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) total += val;
    });
    return total;
  }

  // ═══════════════════════════════════════════
  // Indian Currency Formatting
  // ═══════════════════════════════════════════
  function formatIndianCurrency(num) {
    if (num === 0) return '₹0';
    const isNeg = num < 0;
    num = Math.abs(Math.round(num));
    let str = num.toString();
    if (str.length > 3) {
      const last3 = str.slice(-3);
      const rest = str.slice(0, -3);
      str = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    }
    return (isNeg ? '-' : '') + '₹' + str;
  }

  // ═══════════════════════════════════════════
  // Number to Words (Indian System)
  // ═══════════════════════════════════════════
  function numberToWords(num) {
    if (num === 0) return 'Rupees Zero Only';
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    function twoD(n) { return n < 20 ? ones[n] : tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : ''); }
    function threeD(n) { return n >= 100 ? ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + twoD(n%100) : '') : twoD(n); }
    let result = '', r = Math.floor(num);
    if (r >= 10000000) { result += threeD(Math.floor(r/10000000)) + ' Crore '; r %= 10000000; }
    if (r >= 100000) { result += twoD(Math.floor(r/100000)) + ' Lakh '; r %= 100000; }
    if (r >= 1000) { result += twoD(Math.floor(r/1000)) + ' Thousand '; r %= 1000; }
    if (r > 0) result += threeD(r);
    return 'Rupees ' + result.trim() + ' Only';
  }

  // ═══════════════════════════════════════════
  // Toast Notification
  // ═══════════════════════════════════════════
  let toastTimeout;
  function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;
    toastIcon.innerHTML = type === 'success'
      ? `<circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" stroke-width="2"/><polyline points="8 12 11 15 16 9" fill="none" stroke="#10b981" stroke-width="2"/>`
      : `<circle cx="12" cy="12" r="10" fill="none" stroke="#ef4444" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="13" stroke="#ef4444" stroke-width="2"/><circle cx="12" cy="16" r="0.5" fill="#ef4444" stroke="#ef4444" stroke-width="1.5"/>`;
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 5000);
  }
  toastClose.addEventListener('click', () => { clearTimeout(toastTimeout); toast.classList.remove('show'); });

  // ═══════════════════════════════════════════
  // Auto-Save Drafts
  // ═══════════════════════════════════════════
  function scheduleDraftSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveDraft, 1500);
  }

  function saveDraft() {
    try {
      const draft = {
        companyName: $('companyName').value, companyAddress: $('companyAddress').value,
        city: $('city').value, pincode: $('pincode').value, country: $('country').value,
        employeeName: $('employeeName').value, employeeId: $('employeeId').value,
        paidDays: $('paidDays').value, lopDays: $('lopDays').value,
        earnings: collectIncomeRows(earningsContainer),
        deductions: collectIncomeRows(deductionsContainer),
        customFields: collectCustomFields(), selectedCompanyId,
      };
      localStorage.setItem('payslip-draft', JSON.stringify(draft));
      autosaveIndicator.classList.add('show');
      setTimeout(() => autosaveIndicator.classList.remove('show'), 2000);
    } catch { /* localStorage full */ }
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem('payslip-draft');
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.companyName) $('companyName').value = d.companyName;
      if (d.companyAddress) $('companyAddress').value = d.companyAddress;
      if (d.city) $('city').value = d.city;
      if (d.pincode) $('pincode').value = d.pincode;
      if (d.country) $('country').value = d.country;
      if (d.employeeName) $('employeeName').value = d.employeeName;
      if (d.employeeId) $('employeeId').value = d.employeeId;
      if (d.paidDays) $('paidDays').value = d.paidDays;
      if (d.lopDays) $('lopDays').value = d.lopDays;
      if (d.selectedCompanyId) {
        selectedCompanyId = d.selectedCompanyId;
        setTimeout(() => { if (companySelector.querySelector(`option[value="${d.selectedCompanyId}"]`)) companySelector.value = d.selectedCompanyId; }, 1000);
      }
      if (d.earnings?.length) {
        const rows = earningsContainer.querySelectorAll('.income-row');
        d.earnings.forEach((item, i) => {
          if (i < rows.length) {
            rows[i].querySelector('.income-label-input').value = item.label;
            rows[i].querySelector('.income-amount-input').value = item.amount;
          } else {
            addIncomeRow(earningsContainer, 'earning-amount', 'Earning label');
            const r = earningsContainer.lastElementChild;
            r.querySelector('.income-label-input').value = item.label;
            r.querySelector('.income-amount-input').value = item.amount;
          }
        });
      }
      if (d.deductions?.length) {
        const rows = deductionsContainer.querySelectorAll('.income-row');
        d.deductions.forEach((item, i) => {
          if (i < rows.length) {
            rows[i].querySelector('.income-label-input').value = item.label;
            rows[i].querySelector('.income-amount-input').value = item.amount;
          } else {
            addIncomeRow(deductionsContainer, 'deduction-amount', 'Deduction label');
            const r = deductionsContainer.lastElementChild;
            r.querySelector('.income-label-input').value = item.label;
            r.querySelector('.income-amount-input').value = item.amount;
          }
        });
      }
      if (d.customFields?.length) {
        d.customFields.forEach(cf => {
          addFieldBtn.click();
          const r = customFieldsContainer.lastElementChild;
          r.querySelector('.custom-label').value = cf.label;
          r.querySelector('.custom-value').value = cf.value;
        });
      }
      recalculate();
    } catch { /* corrupt draft */ }
  }

  function collectIncomeRows(container) {
    const rows = [];
    container.querySelectorAll('.income-row').forEach(row => {
      rows.push({
        label: row.querySelector('.income-label-input').value,
        amount: parseFloat(row.querySelector('.income-amount-input').value) || 0,
      });
    });
    return rows;
  }

  function collectCustomFields() {
    const fields = [];
    customFieldsContainer.querySelectorAll('.custom-field-row').forEach(row => {
      fields.push({ label: row.querySelector('.custom-label').value, value: row.querySelector('.custom-value').value });
    });
    return fields;
  }

  // Auto-save on form input
  document.querySelectorAll('.field-input, .summary-field input').forEach(input => {
    input.addEventListener('input', scheduleDraftSave);
  });

  // ═══════════════════════════════════════════
  // History Sidebar
  // ═══════════════════════════════════════════
  historyToggle.addEventListener('click', openHistory);
  historyClose.addEventListener('click', closeHistory);
  historyOverlay.addEventListener('click', closeHistory);

  function openHistory() {
    historySidebar.classList.add('open');
    historyOverlay.classList.add('open');
    loadHistory();
  }

  function closeHistory() {
    historySidebar.classList.remove('open');
    historyOverlay.classList.remove('open');
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/payslips');
      if (!res.ok) return;
      const payslips = await res.json();
      if (!payslips.length) {
        historyList.innerHTML = `<div class="history-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><p>No payslips saved yet</p></div>`;
        return;
      }
      historyList.innerHTML = '';
      payslips.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.animationDelay = `${i * 0.05}s`;
        const date = new Date(p.created_at);
        const dateStr = `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        item.innerHTML = `
          <div class="history-item-header">
            <span class="history-item-name">${p.employee_name}</span>
            <span class="history-item-amount">${formatIndianCurrency(parseFloat(p.net_payable))}</span>
          </div>
          <div class="history-item-meta">
            <span>${p.company_name || 'N/A'}</span>
            <span>${p.pay_period || ''}</span>
            <span>${dateStr}</span>
          </div>
          <div class="history-item-actions">
            <button class="history-action-btn" data-action="load" data-id="${p.id}">Load</button>
            <button class="history-action-btn template-action" data-action="template" data-id="${p.id}">Next Month</button>
          </div>
        `;
        historyList.appendChild(item);
      });
    } catch {
      historyList.innerHTML = '<div class="history-empty"><p>Failed to load history</p></div>';
    }
  }

  historyList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.history-action-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    try {
      const res = await fetch(`/api/payslip/${id}`);
      if (!res.ok) return;
      const p = await res.json();
      if (action === 'load') loadPayslipIntoForm(p);
      else if (action === 'template') loadAsTemplate(p);
      closeHistory();
    } catch { showToast('Failed to load payslip.', 'error'); }
  });

  historySearch.addEventListener('input', () => {
    const query = historySearch.value.toLowerCase();
    historyList.querySelectorAll('.history-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });
  });

  function loadPayslipIntoForm(p) {
    if (p.company_id) { companySelector.value = p.company_id; companySelector.dispatchEvent(new Event('change')); }
    $('companyName').value = p.company_name || '';
    $('companyAddress').value = p.company_address || '';
    $('city').value = p.city || '';
    $('pincode').value = p.pincode || '';
    $('country').value = p.country || 'India';
    $('employeeName').value = p.employee_name || '';
    $('employeeId').value = p.employee_id || '';
    $('payPeriod').value = p.pay_period || '';
    $('paidDays').value = p.paid_days || '';
    $('lopDays').value = p.lop_days || 0;
    // Load earnings
    earningsContainer.innerHTML = '';
    (p.earnings || []).forEach((e, i) => {
      addIncomeRow(earningsContainer, 'earning-amount', 'Earning label');
      const row = earningsContainer.lastElementChild;
      if (i === 0) row.dataset.percentBase = 'true';
      row.querySelector('.income-label-input').value = e.label;
      row.querySelector('.income-amount-input').value = parseFloat(e.amount) || 0;
    });
    // Load deductions
    deductionsContainer.innerHTML = '';
    (p.deductions || []).forEach(d => {
      addIncomeRow(deductionsContainer, 'deduction-amount', 'Deduction label');
      const row = deductionsContainer.lastElementChild;
      row.querySelector('.income-label-input').value = d.label;
      row.querySelector('.income-amount-input').value = parseFloat(d.amount) || 0;
    });
    // Load custom fields
    customFieldsContainer.innerHTML = '';
    (p.custom_fields || []).forEach(cf => {
      addFieldBtn.click();
      const row = customFieldsContainer.lastElementChild;
      row.querySelector('.custom-label').value = cf.label;
      row.querySelector('.custom-value').value = cf.value;
    });
    recalculate();
    showToast('Payslip loaded into form.', 'success');
  }

  function loadAsTemplate(p) {
    loadPayslipIntoForm(p);
    // Advance to next month
    const now = new Date();
    $('payPeriod').value = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    setPayDate();
    setCurrentMonth();
    showToast('Template loaded for next month. Amounts preserved.', 'success');
  }

  // ═══════════════════════════════════════════
  // Preview Modal
  // ═══════════════════════════════════════════
  previewBtn.addEventListener('click', showPreviewModal);
  previewCloseBtn.addEventListener('click', closePreviewModal);
  previewCancelBtn.addEventListener('click', closePreviewModal);
  previewOverlay.addEventListener('click', (e) => { if (e.target === previewOverlay) closePreviewModal(); });

  previewSaveBtn.addEventListener('click', () => {
    closePreviewModal();
    saveBtn.click();
  });

  previewPrintBtn.addEventListener('click', () => {
    closePreviewModal();
    setTimeout(() => window.print(), 300);
  });

  function showPreviewModal() {
    const companyName = $('companyName').value || 'Company Name';
    const address = [$('companyAddress').value, $('city').value, $('pincode').value, $('country').value].filter(Boolean).join(', ');
    const earnings = collectIncomeRows(earningsContainer).filter(e => e.label);
    const deductions = collectIncomeRows(deductionsContainer).filter(d => d.label);
    const gross = sumAmounts('.earning-amount');
    const totalDed = sumAmounts('.deduction-amount');
    const net = Math.max(0, gross - totalDed);
    const customFields = collectCustomFields().filter(cf => cf.label);

    let logoHtml = '';
    if (previewImage.src && uploadPreview.style.display !== 'none') {
      logoHtml = `<img src="${previewImage.src}" class="preview-company-logo" alt="Logo">`;
    }

    let sigHtml = '';
    if (signatureDataUrl) {
      sigHtml = `<div class="preview-signature"><img src="${signatureDataUrl}" alt="Signature"><span class="preview-signature-line">Authorized Signatory</span></div>`;
    }

    let customHtml = '';
    customFields.forEach(cf => {
      customHtml += `<div class="preview-field"><span class="preview-field-label">${cf.label}</span><span class="preview-field-value">${cf.value}</span></div>`;
    });

    previewBody.innerHTML = `
      <div class="preview-company">
        <div class="preview-company-info">
          <h2>${companyName}</h2>
          <p>${address}</p>
        </div>
        ${logoHtml}
      </div>
      <div class="preview-employee-grid">
        <div class="preview-field"><span class="preview-field-label">Employee Name</span><span class="preview-field-value">${$('employeeName').value || '—'}</span></div>
        <div class="preview-field"><span class="preview-field-label">Employee ID</span><span class="preview-field-value">${$('employeeId').value || '—'}</span></div>
        <div class="preview-field"><span class="preview-field-label">Pay Period</span><span class="preview-field-value">${$('payPeriod').value}</span></div>
        <div class="preview-field"><span class="preview-field-label">Paid Days</span><span class="preview-field-value">${$('paidDays').value || '—'}</span></div>
        <div class="preview-field"><span class="preview-field-label">LOP Days</span><span class="preview-field-value">${$('lopDays').value || '0'}</span></div>
        <div class="preview-field"><span class="preview-field-label">Pay Date</span><span class="preview-field-value">${formatDateForDisplay($('payDate').value)}</span></div>
        ${customHtml}
      </div>
      <div class="preview-income-grid">
        <table class="preview-income-table">
          <tr><th>Earnings</th><th>Amount</th></tr>
          ${earnings.map(e => `<tr><td>${e.label}</td><td>${formatIndianCurrency(e.amount)}</td></tr>`).join('')}
        </table>
        <table class="preview-income-table">
          <tr><th>Deductions</th><th>Amount</th></tr>
          ${deductions.map(d => `<tr><td>${d.label}</td><td>${formatIndianCurrency(d.amount)}</td></tr>`).join('')}
        </table>
      </div>
      <div class="preview-totals">
        <div class="preview-totals-row"><span>Gross Earnings</span><strong style="color:var(--color-success)">${formatIndianCurrency(gross)}</strong></div>
        <div class="preview-totals-row"><span>Total Deductions</span><strong style="color:var(--color-error)">${formatIndianCurrency(totalDed)}</strong></div>
        <div class="preview-net"><span class="preview-net-label">Total Net Payable</span><span class="preview-net-value">${formatIndianCurrency(net)}</span></div>
        <div class="preview-words"><strong>Amount in words:</strong> <em>${numberToWords(Math.floor(net))}</em></div>
      </div>
      ${sigHtml}
    `;

    previewOverlay.classList.add('open');
  }

  function closePreviewModal() {
    previewOverlay.classList.remove('open');
  }

  // ═══════════════════════════════════════════
  // PDF Download (via browser print dialog)
  // ═══════════════════════════════════════════
  downloadBtn.addEventListener('click', () => {
    showToast('Opening PDF save dialog... Select "Save as PDF" in the print dialog.', 'success');
    setTimeout(() => window.print(), 500);
  });

  // ═══════════════════════════════════════════
  // Next Month Template
  // ═══════════════════════════════════════════
  templateBtn.addEventListener('click', () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    $('payPeriod').value = `${MONTH_NAMES[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
    $('payDate').value = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth()+1).padStart(2,'0')}-01`;
    currentMonth.textContent = `${MONTH_NAMES[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
    showToast('Dates advanced to next month. Amounts preserved.', 'success');
  });

  // ═══════════════════════════════════════════
  // Save Payslip
  // ═══════════════════════════════════════════
  saveBtn.addEventListener('click', async () => {
    const companyName = $('companyName').value.trim();
    const employeeName = $('employeeName').value.trim();

    if (!companyName) {
      showToast('Company Name is required.', 'error');
      const el = $('companyName'); el.classList.add('error'); el.focus();
      setTimeout(() => el.classList.remove('error'), 2000); return;
    }
    if (!employeeName) {
      showToast('Employee Name is required.', 'error');
      const el = $('employeeName'); el.classList.add('error'); el.focus();
      setTimeout(() => el.classList.remove('error'), 2000); return;
    }

    let companyId = selectedCompanyId;
    saveBtn.classList.add('loading'); saveBtn.disabled = true;

    // Save company first if new
    if (!companyId) {
      saveBtnText.textContent = 'Saving company...';
      const companyData = new FormData();
      if (selectedFile) companyData.append('company_logo', selectedFile);
      companyData.append('company_name', companyName);
      companyData.append('company_address', $('companyAddress').value.trim());
      companyData.append('city', $('city').value.trim());
      companyData.append('pincode', $('pincode').value.trim());
      companyData.append('country', $('country').value.trim());
      try {
        const r = await fetch('/api/company', { method: 'POST', body: companyData });
        const d = await r.json();
        if (!r.ok) { showToast(d.error || 'Failed to save company.', 'error'); return; }
        companyId = d.company.id;
      } catch { showToast('Cannot connect to server.', 'error'); return; }
      finally { if (!companyId) { saveBtn.classList.remove('loading'); saveBtn.disabled = false; saveBtnText.textContent = 'Save Payslip'; } }
    }

    saveBtnText.textContent = 'Saving payslip...';
    const payslipData = {
      company_id: companyId,
      employee_name: employeeName,
      employee_id: $('employeeId').value.trim(),
      pay_period: $('payPeriod').value,
      paid_days: parseInt($('paidDays').value) || 0,
      lop_days: parseInt($('lopDays').value) || 0,
      pay_date: $('payDate').value || null,
      earnings: collectIncomeRows(earningsContainer),
      deductions: collectIncomeRows(deductionsContainer),
      custom_fields: collectCustomFields(),
      gross_earnings: sumAmounts('.earning-amount'),
      total_deductions: sumAmounts('.deduction-amount'),
      net_payable: Math.max(0, sumAmounts('.earning-amount') - sumAmounts('.deduction-amount')),
    };

    try {
      const res = await fetch('/api/payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payslipData),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Payslip saved!', 'success');
        lastSavedPayslipId = data.payslip_id;
        templateBtn.style.display = 'inline-flex';
        localStorage.removeItem('payslip-draft');
        companySelector.innerHTML = '<option value="">— New Company —</option>';
        loadCompanies();
      } else {
        showToast(data.error || 'Failed to save.', 'error');
      }
    } catch { showToast('Cannot connect to server.', 'error'); }
    finally {
      saveBtn.classList.remove('loading'); saveBtn.disabled = false;
      saveBtnText.textContent = 'Save Payslip';
    }
  });

  function formatDateForDB(dateStr) {
    try { const d = new Date(dateStr); return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]; }
    catch { return null; }
  }

  // ═══════════════════════════════════════════
  // Reset Form
  // ═══════════════════════════════════════════
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset the entire form? This clears all fields and your saved draft.')) return;
    companySelector.value = ''; selectedCompanyId = null;
    $('companyName').value = ''; $('companyAddress').value = '';
    $('city').value = ''; $('pincode').value = '';
    $('country').value = 'India'; clearLogo();
    $('employeeName').value = ''; $('employeeId').value = '';
    $('paidDays').value = ''; $('lopDays').value = '0';
    setPayPeriod(); setPayDate(); setCurrentMonth();
    customFieldsContainer.innerHTML = '';
    templateBtn.style.display = 'none';
    earningsContainer.innerHTML = `
      <div class="income-row" data-default="true" data-percent-base="true">
        <input type="text" value="Basic" class="income-label-input" placeholder="Earning label">
        <div class="amount-input-wrapper"><span class="currency-symbol">₹</span>
          <input type="number" value="0" class="income-amount-input earning-amount" min="0" step="1" placeholder="0">
          <span class="formatted-display"></span></div></div>
      <div class="income-row" data-default="true">
        <input type="text" value="House Rent Allowance" class="income-label-input" placeholder="Earning label">
        <div class="percent-toggle" title="Calculate as % of Basic">
          <button class="percent-btn" type="button" data-active="false">%</button>
          <input type="number" class="percent-input" min="0" max="100" value="40" placeholder="%" style="display:none;"></div>
        <div class="amount-input-wrapper"><span class="currency-symbol">₹</span>
          <input type="number" value="0" class="income-amount-input earning-amount" min="0" step="1" placeholder="0">
          <span class="formatted-display"></span></div></div>`;
    deductionsContainer.innerHTML = `
      <div class="income-row" data-default="true">
        <input type="text" value="Income Tax" class="income-label-input" placeholder="Deduction label">
        <div class="amount-input-wrapper"><span class="currency-symbol">₹</span>
          <input type="number" value="0" class="income-amount-input deduction-amount" min="0" step="1" placeholder="0">
          <span class="formatted-display"></span></div></div>
      <div class="income-row" data-default="true">
        <input type="text" value="Provident Fund" class="income-label-input" placeholder="Deduction label">
        <div class="percent-toggle" title="Calculate as % of Basic">
          <button class="percent-btn" type="button" data-active="false">%</button>
          <input type="number" class="percent-input" min="0" max="100" value="12" placeholder="%" style="display:none;"></div>
        <div class="amount-input-wrapper"><span class="currency-symbol">₹</span>
          <input type="number" value="0" class="income-amount-input deduction-amount" min="0" step="1" placeholder="0">
          <span class="formatted-display"></span></div></div>`;
    initPercentToggles();
    recalculate();
    localStorage.removeItem('payslip-draft');
    showToast('Form has been reset.', 'success');
  });

  // ═══════════════════════════════════════════
  // Keyboard Shortcuts
  // ═══════════════════════════════════════════
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveBtn.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); window.print(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); openHistory(); }
    if (e.key === 'Escape') { closeHistory(); closePreviewModal(); }
  });

  // ═══════════════════════════════════════════
  // Clear error on input
  // ═══════════════════════════════════════════
  $('companyName').addEventListener('input', function() { this.classList.remove('error'); scheduleDraftSave(); });
  $('employeeName').addEventListener('input', function() { this.classList.remove('error'); scheduleDraftSave(); });
});

/**
 * Payslip Generator — Frontend Logic
 * Handles logo upload, form validation, and API communication.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM Elements ────────────────────────────
  const uploadArea = document.getElementById('uploadArea');
  const logoInput = document.getElementById('logoInput');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const uploadPreview = document.getElementById('uploadPreview');
  const previewImage = document.getElementById('previewImage');
  const removeLogo = document.getElementById('removeLogo');
  const currentMonth = document.getElementById('currentMonth');
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const connectionStatus = document.getElementById('connectionStatus');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  const toastClose = document.getElementById('toastClose');

  let selectedFile = null;

  // ── Set Current Month/Year ──────────────────
  function setCurrentMonth() {
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    currentMonth.textContent = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }
  setCurrentMonth();

  // ── Connection Status Check ─────────────────
  async function checkConnection() {
    const statusText = connectionStatus.querySelector('.status-text');
    try {
      const res = await fetch('/api/company', { method: 'OPTIONS' });
      connectionStatus.className = 'nav-status connected';
      statusText.textContent = 'Database Connected';
    } catch {
      connectionStatus.className = 'nav-status error';
      statusText.textContent = 'Server Offline';
    }
  }
  // We'll check connection status when the page loads
  // Using a simple GET to the server root as a health check
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
  healthCheck();

  // ── Logo Upload ─────────────────────────────
  uploadArea.addEventListener('click', (e) => {
    // Don't trigger file input if clicking the remove button
    if (e.target.closest('.remove-logo-btn')) return;
    logoInput.click();
  });

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a PNG, JPG, SVG, or WebP image.', 'error');
      uploadArea.classList.add('error');
      setTimeout(() => uploadArea.classList.remove('error'), 1000);
      logoInput.value = '';
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      showToast('Logo file must be under 1MB.', 'error');
      uploadArea.classList.add('error');
      setTimeout(() => uploadArea.classList.remove('error'), 1000);
      logoInput.value = '';
      return;
    }

    // Validate dimensions (240x240) — skip for SVG
    if (file.type !== 'image/svg+xml') {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 240 || img.height !== 240) {
          showToast(`Logo must be 240×240 pixels. Your image is ${img.width}×${img.height}.`, 'error');
          uploadArea.classList.add('error');
          setTimeout(() => uploadArea.classList.remove('error'), 1000);
          logoInput.value = '';
          URL.revokeObjectURL(img.src);
          return;
        }
        // Valid — show preview
        selectedFile = file;
        showPreview(img.src);
      };
      img.src = URL.createObjectURL(file);
    } else {
      // SVG — skip dimension check
      selectedFile = file;
      showPreview(URL.createObjectURL(file));
    }
  });

  function showPreview(src) {
    previewImage.src = src;
    uploadPlaceholder.style.display = 'none';
    uploadPreview.style.display = 'block';
    uploadArea.style.borderStyle = 'solid';
    uploadArea.style.borderColor = '#d0e2ff';
  }

  removeLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    clearLogo();
  });

  function clearLogo() {
    selectedFile = null;
    logoInput.value = '';
    previewImage.src = '';
    uploadPlaceholder.style.display = 'flex';
    uploadPreview.style.display = 'none';
    uploadArea.style.borderStyle = 'dashed';
    uploadArea.style.borderColor = '';
  }

  // ── Toast Notification ──────────────────────
  let toastTimeout;

  function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);

    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;

    // Set icon
    if (type === 'success') {
      toastIcon.innerHTML = `
        <circle cx="12" cy="12" r="10" fill="none" stroke="#10b981" stroke-width="2"/>
        <polyline points="8 12 11 15 16 9" fill="none" stroke="#10b981" stroke-width="2"/>
      `;
    } else {
      toastIcon.innerHTML = `
        <circle cx="12" cy="12" r="10" fill="none" stroke="#ef4444" stroke-width="2"/>
        <line x1="12" y1="8" x2="12" y2="13" stroke="#ef4444" stroke-width="2"/>
        <circle cx="12" cy="16" r="0.5" fill="#ef4444" stroke="#ef4444" stroke-width="1.5"/>
      `;
    }

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  }

  toastClose.addEventListener('click', () => {
    clearTimeout(toastTimeout);
    toast.classList.remove('show');
  });

  // ── Save Button ─────────────────────────────
  saveBtn.addEventListener('click', async () => {
    // Validate company name
    const companyName = document.getElementById('companyName').value.trim();
    if (!companyName) {
      showToast('Company Name is required.', 'error');
      document.getElementById('companyName').classList.add('error');
      document.getElementById('companyName').focus();
      setTimeout(() => document.getElementById('companyName').classList.remove('error'), 2000);
      return;
    }

    // Build FormData
    const formData = new FormData();
    if (selectedFile) {
      formData.append('company_logo', selectedFile);
    }
    formData.append('company_name', companyName);
    formData.append('company_address', document.getElementById('companyAddress').value.trim());
    formData.append('city', document.getElementById('city').value.trim());
    formData.append('pincode', document.getElementById('pincode').value.trim());
    formData.append('country', document.getElementById('country').value.trim());

    // Show loading state
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
    saveBtnText.textContent = 'Saving...';

    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Company details saved!', 'success');
        // Reset form after a short delay
        setTimeout(() => {
          document.getElementById('companyName').value = '';
          document.getElementById('companyAddress').value = '';
          document.getElementById('city').value = '';
          document.getElementById('pincode').value = '';
          document.getElementById('country').value = 'India';
          clearLogo();
        }, 1500);
      } else {
        showToast(data.error || 'Failed to save. Please try again.', 'error');
      }
    } catch (err) {
      showToast('Cannot connect to server. Make sure the server is running.', 'error');
    } finally {
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
      saveBtnText.textContent = 'Save Company Details';
    }
  });

  // ── Clear error state on input ──────────────
  document.getElementById('companyName').addEventListener('input', function () {
    this.classList.remove('error');
  });
});

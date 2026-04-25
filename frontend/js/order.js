/* ═══════════════════════════════════════════════════════
   contactforservices — Order Page JS (fully debugged)
   ═══════════════════════════════════════════════════════ */

// ── Pricing Table ─────────────────────────────────────────────────────────────
// Keys MUST match the option values in order.html exactly (case-sensitive)
const PRICES = {
  'Reports':             { '1day': 150, 'halfday': 200, '1hour': 250, '30min': 300 },
  'PPT':                 { '1day': 100, 'halfday': 150, '1hour': 200, '30min': 250 },
  'Abstract':            { flat: 80 },
  'ECE Projects':        { basic: 300, medium: 450, complex: 600 },
  'Plagiarism Checking': { flat: 60 },
};

const FLAT_SERVICES       = ['Abstract', 'Plagiarism Checking'];
const COMPLEXITY_SERVICES = ['ECE Projects'];
const TIMED_SERVICES      = ['Reports', 'PPT'];

// ── Safe DOM refs (guard against null) ────────────────────────────────────────
function el(id) {
  const e = document.getElementById(id);
  if (!e) console.warn(`[order.js] Element #${id} not found`);
  return e;
}

const serviceSelect    = el('fieldService');
const deliveryGroup    = el('deliveryGroup');
const complexityGroup  = el('complexityGroup');
const deliverySelect   = el('fieldDelivery');
const complexitySelect = el('fieldComplexity');
const priceValue       = el('priceValue');
const priceNote        = el('priceNote');
const fileInput        = el('fieldFiles');
const fileList         = el('fileList');
const fileUploadArea   = el('fileUploadArea');
const orderForm        = el('orderForm');
const submitBtn        = el('submitBtn');
const submitBtnText    = el('submitBtnText');
const toast            = el('toast');
const toastTitle       = el('toastTitle');
const toastMsg         = el('toastMsg');
const toastIcon        = el('toastIcon');

// ── Navbar hamburger ──────────────────────────────────────────────────────────
const hamburgerBtn = el('hamburgerBtn');
const mobileMenu   = el('mobileMenu');
if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
  });
}

// ── Service change handler ────────────────────────────────────────────────────
function handleServiceChange(service) {
  const isFlat       = FLAT_SERVICES.includes(service);
  const isComplexity = COMPLEXITY_SERVICES.includes(service);
  const isTimed      = TIMED_SERVICES.includes(service);

  // Show/hide correct dropdowns
  if (deliveryGroup)   deliveryGroup.style.display   = isTimed ? '' : 'none';
  if (complexityGroup) complexityGroup.style.display = isComplexity ? '' : 'none';

  // Fix name attrs so only the active one gets submitted
  if (isTimed) {
    if (deliverySelect)   deliverySelect.name   = 'deliveryTime';
    if (complexitySelect) { complexitySelect.name = '_unused'; complexitySelect.value = ''; }
  } else if (isComplexity) {
    if (complexitySelect) complexitySelect.name = 'deliveryTime';
    if (deliverySelect)   { deliverySelect.name = '_unused'; deliverySelect.value = ''; }
  } else {
    // flat — no delivery needed
    if (deliverySelect)   { deliverySelect.name = '_unused'; deliverySelect.value = ''; }
    if (complexitySelect) { complexitySelect.name = '_unused'; complexitySelect.value = ''; }
  }

  updatePrice();
}

// ── Price calculation ─────────────────────────────────────────────────────────
function updatePrice() {
  if (!priceValue || !priceNote) return;

  const service    = serviceSelect ? serviceSelect.value : '';
  const delivery   = deliverySelect ? deliverySelect.value : '';
  const complexity = complexitySelect ? complexitySelect.value : '';

  if (!service) {
    priceValue.textContent = '—';
    priceNote.textContent  = 'Select service & delivery time';
    return;
  }

  const table = PRICES[service];
  if (!table) {
    priceValue.textContent = '—';
    priceNote.textContent  = 'Contact us for pricing';
    return;
  }

  if (FLAT_SERVICES.includes(service)) {
    priceValue.textContent = `₹${table.flat}`;
    priceNote.textContent  = 'Fixed flat rate';

  } else if (COMPLEXITY_SERVICES.includes(service)) {
    if (complexity && table[complexity] !== undefined) {
      const labels = { basic: 'Basic', medium: 'Medium', complex: 'Complex' };
      priceValue.textContent = `₹${table[complexity]}`;
      priceNote.textContent  = `${labels[complexity] || complexity} complexity project`;
    } else {
      priceValue.textContent = '₹300 – ₹600';
      priceNote.textContent  = 'Select complexity level to see exact price';
    }

  } else {
    // Timed services
    if (delivery && table[delivery] !== undefined) {
      const timeLabels = { '1day': '1 Day', halfday: 'Half Day (12 hrs)', '1hour': '1 Hour', '30min': '30 Minutes' };
      priceValue.textContent = `₹${table[delivery]}`;
      priceNote.textContent  = `Delivery in ${timeLabels[delivery] || delivery}`;
    } else {
      const vals = Object.values(table);
      priceValue.textContent = `₹${Math.min(...vals)} – ₹${Math.max(...vals)}`;
      priceNote.textContent  = 'Select delivery time to see exact price';
    }
  }
}

// Attach price listeners
if (serviceSelect)    serviceSelect.addEventListener('change', () => handleServiceChange(serviceSelect.value));
if (deliverySelect)   deliverySelect.addEventListener('change', updatePrice);
if (complexitySelect) complexitySelect.addEventListener('change', updatePrice);

// ── Pre-fill service from URL query param ─────────────────────────────────────
(function prefillService() {
  if (!serviceSelect) return;
  const params  = new URLSearchParams(window.location.search);
  const service = params.get('service');
  if (service) {
    const options = Array.from(serviceSelect.options);
    const match   = options.find(o => o.value.toLowerCase() === service.toLowerCase());
    if (match) {
      serviceSelect.value = match.value;
      handleServiceChange(match.value);
    }
  }
})();

// Run once on page load to set initial state
handleServiceChange(serviceSelect ? serviceSelect.value : '');

// ── File Upload ───────────────────────────────────────────────────────────────
let selectedFiles = [];

if (fileInput) {
  fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));
}

if (fileUploadArea) {
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
  });
  fileUploadArea.addEventListener('dragleave', () => fileUploadArea.classList.remove('dragover'));
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    handleFiles(Array.from(e.dataTransfer.files));
  });
}

function handleFiles(newFiles) {
  newFiles.forEach(file => {
    const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
    if (!exists) selectedFiles.push(file);
  });
  renderFileList();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(name) {
  const ext   = name.split('.').pop().toLowerCase();
  const icons = { pdf:'📄', doc:'📝', docx:'📝', ppt:'📊', pptx:'📊', txt:'📃', zip:'🗜️', rar:'🗜️', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', xlsx:'📊', csv:'📊' };
  return icons[ext] || '📁';
}

function renderFileList() {
  if (!fileList) return;
  fileList.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span>${getFileIcon(file.name)}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span>
      <span>${formatBytes(file.size)}</span>
      <button type="button" onclick="removeFile(${index})" style="background:none;border:none;cursor:pointer;color:var(--red-400);font-size:16px;padding:0 4px;line-height:1;" title="Remove file" aria-label="Remove ${file.name}">×</button>
    `;
    fileList.appendChild(item);
  });
}

window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
};

// ── Form Validation ───────────────────────────────────────────────────────────
function validateForm() {
  const service = serviceSelect ? serviceSelect.value : '';
  const name    = (el('fieldName')        || {}).value?.trim();
  const email   = (el('fieldEmail')       || {}).value?.trim();
  const phone   = (el('fieldPhone')       || {}).value?.trim();
  const topic   = (el('fieldTopic')       || {}).value?.trim();
  const desc    = (el('fieldDescription') || {}).value?.trim();

  if (!name)                                                           return 'Please enter your full name.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))           return 'Please enter a valid email address.';
  if (!phone || phone.length < 10)                                    return 'Please enter a valid phone number.';
  if (!service)                                                        return 'Please select a service.';
  if (TIMED_SERVICES.includes(service) && !deliverySelect?.value)     return 'Please select a delivery time.';
  if (COMPLEXITY_SERVICES.includes(service) && !complexitySelect?.value) return 'Please select a complexity level.';
  if (!topic)                                                          return 'Please enter the topic/title.';
  if (!desc)                                                           return 'Please describe your requirements.';

  return null;
}

// ── Form Submission ───────────────────────────────────────────────────────────
if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      showToast('error', '⚠️ Incomplete Form', error);
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append('name',         (el('fieldName')        || {}).value?.trim());
    formData.append('email',        (el('fieldEmail')       || {}).value?.trim());
    formData.append('phone',        (el('fieldPhone')       || {}).value?.trim());
    formData.append('service',      serviceSelect.value);
    formData.append('deliveryTime', (deliverySelect?.value || complexitySelect?.value || 'flat'));
    formData.append('topic',        (el('fieldTopic')        || {}).value?.trim());
    formData.append('description',  (el('fieldDescription') || {}).value?.trim());
    selectedFiles.forEach(file => formData.append('files', file));

    // UI loading state
    if (submitBtn)     submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = '⏳ Submitting...';

    try {
      const res  = await fetch('/api/order', { method: 'POST', body: formData });

      // Guard against non-JSON error responses (e.g. Vercel 500 HTML pages)
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        data = { success: false, message: 'Server error. Please try again or contact us on WhatsApp.' };
      }

      if (data.success) {
        showToast('success', '✅ Order Submitted!', data.message || 'Check your email for confirmation. We'll be in touch shortly!');
        orderForm.reset();
        selectedFiles = [];
        renderFileList();
        if (priceValue) priceValue.textContent = '—';
        if (priceNote)  priceNote.textContent  = 'Select service & delivery time';
        if (deliveryGroup)   deliveryGroup.style.display   = '';
        if (complexityGroup) complexityGroup.style.display = 'none';
      } else {
        showToast('error', '⚠️ Something Went Wrong', data.message || 'Please try again or contact us on WhatsApp.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('error', '⚠️ Network Error', 'Could not submit. Please check your connection or WhatsApp us directly.');
    } finally {
      if (submitBtn)     submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = '🚀 Submit Order';
    }
  });
}

// ── Toast Notification ────────────────────────────────────────────────────────
let toastTimeout;
function showToast(type, title, msg) {
  if (!toast || !toastTitle || !toastMsg || !toastIcon) {
    // Fallback if toast elements missing
    alert(`${title}: ${msg}`);
    return;
  }
  toastIcon.textContent  = type === 'success' ? '✅' : '⚠️';
  toastTitle.textContent = title;
  toastMsg.textContent   = msg;
  toast.classList.remove('error', 'show');

  // Force reflow so CSS transition replays even if toast was just shown
  void toast.offsetWidth;

  if (type === 'error') toast.classList.add('error');
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 7000);
}

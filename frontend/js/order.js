/* ═══════════════════════════════════════════════════════
   QuickAcad Services — Order Page JS
   ═══════════════════════════════════════════════════════ */

// ── Pricing Table ────────────────────────────────────────
const PRICES = {
  'Reports':             { '1day': 150, 'halfday': 200, '1hour': 250, '30min': 300 },
  'PPT':                 { '1day': 100, 'halfday': 150, '1hour': 200, '30min': 250 },
  'Abstract':            { flat: 80 },
  'ECE Projects':        { basic: 300, medium: 450, complex: 600 },
  'Plagiarism Checking': { flat: 60 },
};

const FLAT_SERVICES      = ['Abstract', 'Plagiarism Checking'];
const COMPLEXITY_SERVICES = ['ECE Projects'];
const TIMED_SERVICES      = ['Reports', 'PPT'];

// ── DOM refs ─────────────────────────────────────────────
const serviceSelect    = document.getElementById('fieldService');
const deliveryGroup    = document.getElementById('deliveryGroup');
const complexityGroup  = document.getElementById('complexityGroup');
const deliverySelect   = document.getElementById('fieldDelivery');
const complexitySelect = document.getElementById('fieldComplexity');
const priceValue       = document.getElementById('priceValue');
const priceNote        = document.getElementById('priceNote');
const fileInput        = document.getElementById('fieldFiles');
const fileList         = document.getElementById('fileList');
const fileUploadArea   = document.getElementById('fileUploadArea');
const orderForm        = document.getElementById('orderForm');
const submitBtn        = document.getElementById('submitBtn');
const submitBtnText    = document.getElementById('submitBtnText');
const toast            = document.getElementById('toast');
const toastTitle       = document.getElementById('toastTitle');
const toastMsg         = document.getElementById('toastMsg');
const toastIcon        = document.getElementById('toastIcon');

// ── Navbar hamburger ─────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const mobileMenu   = document.getElementById('mobileMenu');
if (hamburgerBtn && mobileMenu) {
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', isOpen);
    mobileMenu.setAttribute('aria-hidden', !isOpen);
  });
}

// ── Pre-fill is done AFTER function definitions (see below updatePrice)

// ── Service change handler ───────────────────────────────
function handleServiceChange(service) {
  const isFlat       = FLAT_SERVICES.includes(service);
  const isComplexity = COMPLEXITY_SERVICES.includes(service);
  const isTimed      = TIMED_SERVICES.includes(service);

  // Show/hide correct dropdowns
  deliveryGroup.style.display   = isTimed ? '' : 'none';
  complexityGroup.style.display = isComplexity ? '' : 'none';

  // Reset selections & fix name attrs so only the active one gets submitted
  if (isTimed) {
    deliverySelect.name   = 'deliveryTime';
    complexitySelect.name = '_unused';
    complexitySelect.value = '';
  } else if (isComplexity) {
    complexitySelect.name = 'deliveryTime';
    deliverySelect.name   = '_unused';
    deliverySelect.value  = '';
  } else {
    // flat
    deliverySelect.name   = '_unused';
    complexitySelect.name = '_unused';
    deliverySelect.value  = '';
    complexitySelect.value = '';
  }

  updatePrice();
}

serviceSelect.addEventListener('change', () => handleServiceChange(serviceSelect.value));
deliverySelect.addEventListener('change',    updatePrice);
complexitySelect.addEventListener('change',  updatePrice);

function updatePrice() {
  const service    = serviceSelect.value;
  const delivery   = deliverySelect.value;
  const complexity = complexitySelect.value;

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
      priceValue.textContent = `₹${table[complexity]}`;
      const labels = { basic: 'Basic', medium: 'Medium', complex: 'Complex' };
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

// ── Pre-fill service from URL query param ─────────────────
// Must run after handleServiceChange & updatePrice are defined
(function prefillService() {
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

// ── File Upload ──────────────────────────────────────────
let selectedFiles = [];

fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
});

// Drag & drop
fileUploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
  fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadArea.classList.remove('dragover');
  const dropped = Array.from(e.dataTransfer.files);
  handleFiles(dropped);
});

function handleFiles(newFiles) {
  // Merge without duplicates (by name+size)
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
  const ext = name.split('.').pop().toLowerCase();
  const icons = { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', txt: '📃', zip: '🗜️', rar: '🗜️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', xlsx: '📊', csv: '📊' };
  return icons[ext] || '📁';
}

function renderFileList() {
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

// ── Form Validation ──────────────────────────────────────
function validateForm() {
  const service  = serviceSelect.value;
  const name     = document.getElementById('fieldName').value.trim();
  const email    = document.getElementById('fieldEmail').value.trim();
  const phone    = document.getElementById('fieldPhone').value.trim();
  const topic    = document.getElementById('fieldTopic').value.trim();
  const desc     = document.getElementById('fieldDescription').value.trim();

  if (!name)    return 'Please enter your full name.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (!phone || phone.length < 10) return 'Please enter a valid phone number.';
  if (!service) return 'Please select a service.';
  if (TIMED_SERVICES.includes(service) && !deliverySelect.value)       return 'Please select a delivery time.';
  if (COMPLEXITY_SERVICES.includes(service) && !complexitySelect.value) return 'Please select a complexity level.';
  if (!topic)   return 'Please enter the topic/title.';
  if (!desc)    return 'Please describe your requirements.';

  return null;
}

// ── Form Submission ───────────────────────────────────────
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const error = validateForm();
  if (error) {
    showToast('error', '⚠️ Incomplete Form', error);
    return;
  }

  // Build FormData
  const formData = new FormData();
  formData.append('name',         document.getElementById('fieldName').value.trim());
  formData.append('email',        document.getElementById('fieldEmail').value.trim());
  formData.append('phone',        document.getElementById('fieldPhone').value.trim());
  formData.append('service',      serviceSelect.value);
  formData.append('deliveryTime', deliverySelect.value || complexitySelect.value || 'flat');
  formData.append('topic',        document.getElementById('fieldTopic').value.trim());
  formData.append('description',  document.getElementById('fieldDescription').value.trim());

  selectedFiles.forEach(file => formData.append('files', file));

  // UI loading state
  submitBtn.disabled = true;
  submitBtnText.textContent = '⏳ Submitting...';

  try {
    const res  = await fetch('/api/order', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
      showToast('success', '✅ Order Submitted!', data.message || 'Check your email for confirmation. We'll be in touch shortly!');
      orderForm.reset();
      selectedFiles = [];
      renderFileList();
      priceValue.textContent = '—';
      priceNote.textContent  = 'Select service & delivery time';
      deliveryGroup.style.display   = '';
      complexityGroup.style.display = 'none';
    } else {
      showToast('error', '⚠️ Something Went Wrong', data.message || 'Please try again or contact us on WhatsApp.');
    }
  } catch (err) {
    console.error(err);
    showToast('error', '⚠️ Network Error', 'Could not submit. Please check your connection or WhatsApp us directly.');
  } finally {
    submitBtn.disabled    = false;
    submitBtnText.textContent = '🚀 Submit Order';
  }
});

// ── Toast Notification ────────────────────────────────────
let toastTimeout;
function showToast(type, title, msg) {
  toastIcon.textContent  = type === 'success' ? '✅' : '⚠️';
  toastTitle.textContent = title;
  toastMsg.textContent   = msg;
  toast.classList.remove('error');
  if (type === 'error') toast.classList.add('error');
  
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 6000);
}

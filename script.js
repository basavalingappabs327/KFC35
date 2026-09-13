// ===== Auto-fill current year & 31 March of current year on load =====
document.addEventListener('DOMContentLoaded', () => {
  const currentYear = new Date().getFullYear();
  const marchThirtyFirst = `${currentYear}-03-31`;

  const yearMonthDateInput = document.getElementById('yearmonthdate');
  if (yearMonthDateInput && !yearMonthDateInput.value) {
    yearMonthDateInput.value = marchThirtyFirst; // pre-fills the date picker, user can still change it
  }

  // stash the year globally since there's no visible "year" input in the form
  window.__kfcYear = currentYear;
});

// ===== Paste your deployed Apps Script Web App URL here =====
// Deploy code.gs as: Deploy > New deployment > Web app
//   Execute as: Me
//   Who has access: Anyone
// then copy the /exec URL it gives you into the line below.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw6YKNpzzYj7E-Z70ml4ji7XLmVU35sndvzfqGLLHeOSbwrrF7m_Mo9m3tWSuJVHIj1/exec';

// ===== Element references =====
const form = document.getElementById('ctcForm');
const generateButton = document.getElementById('generateButton');
const waitingMessage = document.getElementById('waitingMessage');
const successMessage = document.getElementById('successMessage');
const downloadButton = document.getElementById('downloadButton');
const errorMessage = document.getElementById('errorMessage');

let generatedPdfBase64 = null;
let generatedFileName = 'KFC35.pdf';

function showEl(el) { el.classList.remove('hidden'); }
function hideEl(el) { el.classList.add('hidden'); }

// Convert yyyy-mm-dd (from <input type="date">) to dd-mm-yyyy for display in the document
function formatDateToKannadaStyle(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
}

// ===== Form submit =====
form.addEventListener('submit', function (e) {
  e.preventDefault();

  hideEl(successMessage);
  hideEl(downloadButton);
  hideEl(errorMessage);
  generatedPdfBase64 = null;

  const currentYear = window.__kfcYear || new Date().getFullYear();

  let formData;
  try {
    formData = {
      designation: document.getElementById('designation').value,
      institution: document.getElementById('institution').value,
      place: document.getElementById('place').value,
      responsibleperson: document.getElementById('responsibleperson').value,
      yearmonthdate: formatDateToKannadaStyle(document.getElementById('yearmonthdate').value),
      year: currentYear
    };
  } catch (err) {
    errorMessage.textContent = 'ದೋಷ: ಫಾರ್ಮ್ ಫೀಲ್ಡ್ ಕಂಡುಬಂದಿಲ್ಲ - ' + err.message;
    showEl(errorMessage);
    return;
  }

  generateButton.disabled = true;
  showEl(waitingMessage);

  // 'text/plain' content-type avoids a CORS preflight (OPTIONS) request,
  // which Apps Script Web Apps don't handle by default.
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(formData)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(onGenerateSuccess)
    .catch(onGenerateFailure);
});

// ===== Callbacks from Apps Script server =====
function onGenerateSuccess(result) {
  hideEl(waitingMessage);
  generateButton.disabled = false;

  if (result && result.error) {
    errorMessage.textContent = 'ದೋಷ: ' + result.error;
    showEl(errorMessage);
    return;
  }

  if (!result || !result.pdfBase64) {
    errorMessage.textContent = 'ದೋಷ: PDF ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.';
    showEl(errorMessage);
    return;
  }

  generatedPdfBase64 = result.pdfBase64;
  generatedFileName = result.fileName || 'KFC35.pdf';

  showEl(successMessage);
  showEl(downloadButton);
}

function onGenerateFailure(error) {
  hideEl(waitingMessage);
  generateButton.disabled = false;
  errorMessage.textContent = 'ದೋಷ: ' + (error && error.message ? error.message : error);
  showEl(errorMessage);
}

// ===== Download the generated PDF =====
downloadButton.addEventListener('click', function () {
  if (!generatedPdfBase64) return;

  const byteCharacters = atob(generatedPdfBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = generatedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
});
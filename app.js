// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
const isTelegram = Boolean(tg?.initData);

// State: matrix of rows -> array of button objects
// Each button: { id: string, name: string, type: 'url' | 'share' | 'copy', target: string, color: string }
let keyboardRows = [];
let editingTarget = null; // { rowIndex, btnIndex } or null

// DOM Elements
const outsideWarning = document.getElementById('outside-warning');
const btnContinueDemo = document.getElementById('btn-continue-demo');
const emptyState = document.getElementById('empty-state');
const rowsContainer = document.getElementById('rows-container');
const addRowWrapper = document.getElementById('add-row-wrapper');
const btnAddRow = document.getElementById('btn-add-row');
const btnAddFirstRow = document.getElementById('btn-add-first-row');
const btnSaveMain = document.getElementById('btn-save-main');
const btnClearAll = document.getElementById('btn-clear-all');

// Modal Elements
const modal = document.getElementById('modal-manage');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const btnType = document.getElementById('btn-type');
const btnName = document.getElementById('btn-name');
const groupTarget = document.getElementById('group-target');
const labelTarget = document.getElementById('label-target');
const btnTarget = document.getElementById('btn-target');
const btnTargetArea = document.getElementById('btn-target-area');
const fieldHint = document.getElementById('field-hint');
const btnColor = document.getElementById('btn-color');
const modalBtnSave = document.getElementById('modal-btn-save');
const modalBtnDelete = document.getElementById('modal-btn-delete');

// Initialize WebApp Environment
function initApp() {
  if (tg) {
    tg.ready();
    tg.expand();
    
    // Telegram MainButton integration
    if (tg.MainButton) {
      tg.MainButton.setText('SAVE');
      tg.MainButton.setParams({
        color: '#28a745',
        text_color: '#ffffff',
        is_active: true,
        is_visible: false // show when keyboard has buttons
      });
      tg.MainButton.onClick(handleSave);
    }
  }

  // Check if opened outside Telegram
  if (!isTelegram) {
    outsideWarning.classList.remove('hidden');
  }

  render();
}

// Event Listeners
btnContinueDemo.addEventListener('click', () => {
  outsideWarning.classList.add('hidden');
});

btnAddFirstRow.addEventListener('click', () => addRow(true));
btnAddRow.addEventListener('click', () => addRow(true));
btnClearAll.addEventListener('click', () => {
  if (confirm('Clear all configured buttons?')) {
    keyboardRows = [];
    render();
  }
});
btnSaveMain.addEventListener('click', handleSave);

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

btnType.addEventListener('change', updateModalFieldsForType);

modalBtnSave.addEventListener('click', saveModalButton);
modalBtnDelete.addEventListener('click', deleteModalButton);

// Add Row
function addRow(openModalForNew = false) {
  const newRow = [];
  keyboardRows.push(newRow);
  const rowIndex = keyboardRows.length - 1;
  render();
  if (openModalForNew) {
    openModal(rowIndex, null);
  }
}

// Render the keyboard grid
function render() {
  rowsContainer.innerHTML = '';

  const hasButtons = keyboardRows.some(row => row.length > 0);

  if (!hasButtons && keyboardRows.length === 0) {
    emptyState.classList.remove('hidden');
    addRowWrapper.classList.add('hidden');
    if (tg?.MainButton) tg.MainButton.hide();
  } else {
    emptyState.classList.add('hidden');
    addRowWrapper.classList.remove('hidden');
    if (tg?.MainButton) tg.MainButton.show();
  }

  keyboardRows.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'button-row';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'row-buttons';

    row.forEach((btn, btnIndex) => {
      const btnEl = document.createElement('div');
      btnEl.className = `tg-btn-item color-${btn.color || 'blue'}`;
      btnEl.textContent = btn.name || 'Button';
      btnEl.title = `${btn.name} (${btn.target})`;

      btnEl.addEventListener('click', () => {
        openModal(rowIndex, btnIndex);
      });

      buttonsContainer.appendChild(btnEl);
    });

    // Add "+" button if row has space (max 8 buttons per row)
    if (row.length < 8) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-add-item';
      addBtn.innerHTML = '+';
      addBtn.title = 'Add button to this row';
      addBtn.addEventListener('click', () => {
        openModal(rowIndex, null);
      });
      buttonsContainer.appendChild(addBtn);
    }

    rowEl.appendChild(buttonsContainer);

    // Row Delete Button
    const delRowBtn = document.createElement('button');
    delRowBtn.type = 'button';
    delRowBtn.className = 'btn-delete-row';
    delRowBtn.innerHTML = '&times;';
    delRowBtn.title = 'Delete row';
    delRowBtn.addEventListener('click', () => {
      keyboardRows.splice(rowIndex, 1);
      render();
    });
    rowEl.appendChild(delRowBtn);

    rowsContainer.appendChild(rowEl);
  });
}

// Modal Logic
function openModal(rowIndex, btnIndex) {
  editingTarget = { rowIndex, btnIndex };
  
  if (btnIndex !== null && keyboardRows[rowIndex][btnIndex]) {
    // Edit existing button
    const btn = keyboardRows[rowIndex][btnIndex];
    modalTitle.textContent = 'Edit button';
    btnType.value = btn.type || 'url';
    btnName.value = btn.name || '';
    btnColor.value = btn.color || 'blue';
    setTargetValue(btn.target || '');
    modalBtnDelete.classList.remove('hidden');
  } else {
    // Add new button
    modalTitle.textContent = 'Manage button';
    btnType.value = 'url';
    btnName.value = '';
    btnColor.value = 'blue';
    setTargetValue('');
    modalBtnDelete.classList.add('hidden');
  }

  updateModalFieldsForType();
  modal.classList.remove('hidden');
  setTimeout(() => btnName.focus(), 100);
}

function closeModal() {
  modal.classList.add('hidden');
  editingTarget = null;
}

function updateModalFieldsForType() {
  const type = btnType.value;
  if (type === 'url') {
    labelTarget.textContent = 'Link';
    btnTarget.classList.remove('hidden');
    btnTargetArea.classList.add('hidden');
    btnTarget.placeholder = 'https://t.me/... or https://example.com';
    fieldHint.textContent = 'Must be a valid web link or Telegram link';
  } else if (type === 'share') {
    labelTarget.textContent = 'Text to share';
    btnTarget.classList.add('hidden');
    btnTargetArea.classList.remove('hidden');
    btnTargetArea.placeholder = 'Enter message text to share...';
    fieldHint.textContent = 'Generates Telegram share link';
  } else if (type === 'copy') {
    labelTarget.textContent = 'Text to copy';
    btnTarget.classList.remove('hidden');
    btnTargetArea.classList.add('hidden');
    btnTarget.placeholder = 'Text that will be copied on tap';
    fieldHint.textContent = 'Copies text when tapped';
  }
}

function getTargetValue() {
  return btnType.value === 'share' ? btnTargetArea.value.trim() : btnTarget.value.trim();
}

function setTargetValue(val) {
  btnTarget.value = val;
  btnTargetArea.value = val;
}

function saveModalButton() {
  const name = btnName.value.trim();
  let target = getTargetValue();
  const type = btnType.value;
  const color = btnColor.value;

  if (!name) {
    alert('Please enter a button Name');
    btnName.focus();
    return;
  }

  if (type === 'url') {
    if (!target) {
      alert('Please enter a Link URL');
      btnTarget.focus();
      return;
    }
    // Auto-prefix if bare t.me link
    if (target.startsWith('t.me/')) {
      target = 'https://' + target;
    } else if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
  } else if (type === 'share') {
    if (!target) {
      alert('Please enter text to share');
      btnTargetArea.focus();
      return;
    }
  }

  const { rowIndex, btnIndex } = editingTarget;
  const buttonData = {
    name,
    type,
    target,
    color
  };

  if (btnIndex === null) {
    keyboardRows[rowIndex].push(buttonData);
  } else {
    keyboardRows[rowIndex][btnIndex] = buttonData;
  }

  closeModal();
  render();
}

function deleteModalButton() {
  if (!editingTarget) return;
  const { rowIndex, btnIndex } = editingTarget;
  if (btnIndex !== null && keyboardRows[rowIndex]) {
    keyboardRows[rowIndex].splice(btnIndex, 1);
    // If row becomes empty, clean it up
    if (keyboardRows[rowIndex].length === 0) {
      keyboardRows.splice(rowIndex, 1);
    }
  }
  closeModal();
  render();
}

// Format final payload for Telegram Bot
function generatePayload() {
  // Telegram Inline Keyboard format: array of rows
  // Each button: { text: "...", url: "..." }
  const matrix = [];

  keyboardRows.forEach(row => {
    const rowButtons = [];
    row.forEach(b => {
      let finalUrl = b.target;
      if (b.type === 'share') {
        finalUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(b.target)}`;
      } else if (b.type === 'copy') {
        // Fallback for copy buttons if standard URL
        finalUrl = `https://t.me/share/url?url=${encodeURIComponent(b.target)}`;
      }
      
      rowButtons.push({
        text: b.name,
        url: finalUrl,
        type: b.type,
        color: b.color
      });
    });
    if (rowButtons.length > 0) {
      matrix.push(rowButtons);
    }
  });

  return {
    rows: matrix,
    total: matrix.reduce((acc, r) => acc + r.length, 0)
  };
}

// Handle Save Action
function handleSave() {
  const payload = generatePayload();

  if (payload.total === 0) {
    alert('Please add at least one button before saving.');
    return;
  }

  const jsonString = JSON.stringify(payload);

  if (tg && tg.sendData) {
    // Send data back to Telegram bot and close WebApp
    tg.sendData(jsonString);
  } else {
    // Demo Mode outside Telegram
    console.log('Generated Button Data:', jsonString);
    navigator.clipboard?.writeText(jsonString).catch(() => {});
    alert(`Buttons saved successfully!\n\nPayload:\n${jsonString}\n\n(Copied to clipboard in demo mode)`);
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', initApp);

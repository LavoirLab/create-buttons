// Initialize Telegram WebApp
const tg = window.Telegram?.WebApp;
const isTelegram = Boolean(tg?.initData);

// State: matrix of rows -> array of button objects
// Each button: { id: string, name: string, type: 'url' | 'share' | 'copy', target: string, color: string }
let keyboardRows = [];
let editingTarget = null; // { rowIndex, btnIndex, isNewRow } or null

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
const btnDemoSave = document.getElementById('btn-demo-save');

// Modal Elements
const modal = document.getElementById('modal-manage');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const btnName = document.getElementById('btn-name');
const btnTarget = document.getElementById('btn-target');
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
if (btnSaveMain) {
  btnSaveMain.addEventListener('click', handleSave);
}
if (btnDemoSave) {
  btnDemoSave.addEventListener('click', handleSave);
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

modalBtnSave.addEventListener('click', saveModalButton);
modalBtnDelete.addEventListener('click', deleteModalButton);

// Add Row
function addRow(openModalForNew = false) {
  if (openModalForNew) {
    // Open modal to configure first button for the new row.
    // Do NOT create an empty row in keyboardRows until saved!
    openModal(keyboardRows.length, null, true);
  }
}

// Render the keyboard grid
function render() {
  // Ensure no empty rows exist
  keyboardRows = keyboardRows.filter(row => Array.isArray(row) && row.length > 0);
  rowsContainer.innerHTML = '';

  const hasButtons = keyboardRows.length > 0;

  if (!hasButtons) {
    emptyState.classList.remove('hidden');
    addRowWrapper.classList.add('hidden');
    if (tg?.MainButton) tg.MainButton.hide();
    if (btnDemoSave) btnDemoSave.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    addRowWrapper.classList.remove('hidden');
    if (tg?.MainButton) {
      tg.MainButton.show();
    } else if (!isTelegram && btnDemoSave) {
      btnDemoSave.classList.remove('hidden');
    }
  }

  keyboardRows.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'button-row';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'row-buttons';

    row.forEach((btn, btnIndex) => {
      const btnEl = document.createElement('div');
      btnEl.className = `tg-btn-item color-${btn.color || 'transparent'}`;
      btnEl.textContent = btn.name || 'Button';
      btnEl.title = `${btn.name} (${btn.target})`;

      btnEl.addEventListener('click', () => {
        openModal(rowIndex, btnIndex, false);
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
        openModal(rowIndex, null, false);
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
function openModal(rowIndex, btnIndex, isNewRow = false) {
  editingTarget = { rowIndex, btnIndex, isNewRow };
  
  if (!isNewRow && btnIndex !== null && keyboardRows[rowIndex] && keyboardRows[rowIndex][btnIndex]) {
    // Edit existing button
    const btn = keyboardRows[rowIndex][btnIndex];
    modalTitle.textContent = 'Edit button';
    btnName.value = btn.name || '';
    btnTarget.value = btn.target || '';
    btnColor.value = btn.color || 'transparent';
    modalBtnDelete.classList.remove('hidden');
  } else {
    // Add new button
    modalTitle.textContent = isNewRow ? 'Add button' : 'Manage button';
    btnName.value = '';
    btnTarget.value = '';
    btnColor.value = 'transparent';
    modalBtnDelete.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  setTimeout(() => btnName.focus(), 100);
}

function closeModal() {
  modal.classList.add('hidden');
  editingTarget = null;
  keyboardRows = keyboardRows.filter(row => Array.isArray(row) && row.length > 0);
  render();
}

function saveModalButton() {
  const name = btnName.value.trim();
  const target = btnTarget.value.trim();
  const color = btnColor.value;

  if (!name) {
    alert('Please enter a button Name');
    btnName.focus();
    return;
  }

  if (!target) {
    alert('Please enter a button URL');
    btnTarget.focus();
    return;
  }

  // Warn if URL does not contain protocol
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(target) && !target.startsWith('tg:')) {
    alert('⚠️ Invalid URL! Please enter the complete URL with protocol (e.g. https://... or tg://...)');
    btnTarget.focus();
    return;
  }

  const { rowIndex, btnIndex, isNewRow } = editingTarget;
  const buttonData = {
    name,
    type: 'url',
    target,
    color
  };

  if (isNewRow) {
    keyboardRows.push([buttonData]);
  } else if (btnIndex === null) {
    if (!keyboardRows[rowIndex]) {
      keyboardRows[rowIndex] = [];
    }
    keyboardRows[rowIndex].push(buttonData);
  } else {
    keyboardRows[rowIndex][btnIndex] = buttonData;
  }

  closeModal();
}

function deleteModalButton() {
  if (!editingTarget) return;
  const { rowIndex, btnIndex, isNewRow } = editingTarget;
  if (!isNewRow && btnIndex !== null && keyboardRows[rowIndex]) {
    keyboardRows[rowIndex].splice(btnIndex, 1);
    if (keyboardRows[rowIndex].length === 0) {
      keyboardRows.splice(rowIndex, 1);
    }
  }
  closeModal();
}

// Format final payload for Telegram Bot
function generatePayload() {
  const matrix = [];

  keyboardRows.forEach(row => {
    const rowButtons = [];
    row.forEach(b => {
      rowButtons.push({
        text: b.name,
        url: b.target,
        type: 'url',
        color: b.color || 'transparent'
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
  try {
    const payload = generatePayload();

    if (payload.total === 0) {
      alert('Please add at least one button before saving.');
      return;
    }

    const jsonString = JSON.stringify(payload);

    // Show spinning indicator on Telegram MainButton
    if (tg?.MainButton) {
      tg.MainButton.showProgress(false);
    }

    if (tg && tg.sendData) {
      setTimeout(() => {
        try {
          tg.sendData(jsonString);
        } catch (err) {
          if (tg?.MainButton) tg.MainButton.hideProgress();
          alert('Telegram sendData failed: ' + (err?.message || err));
        }
      }, 300);
    } else {
      // Demo Mode outside Telegram
      console.log('Generated Button Data:', jsonString);
      navigator.clipboard?.writeText(jsonString).catch(() => {});
      setTimeout(() => {
        if (tg?.MainButton) tg.MainButton.hideProgress();
        alert(`Buttons saved successfully!\n\nPayload:\n${jsonString}\n\n(Copied to clipboard in demo mode)`);
      }, 300);
    }
  } catch (e) {
    if (tg?.MainButton) tg.MainButton.hideProgress();
    alert('Error saving buttons: ' + (e?.message || e));
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', initApp);

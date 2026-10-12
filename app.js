const DEFAULT_TYPES = [
  "Restaurant",
  "ATM Withdrawal",
  "Groceries",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Salary",
  "Except",
  "Other",
];

const INCOME_TYPES = new Set(["Salary"]);
const EXCLUDED_TYPES = new Set(["Except"]);
const STORAGE_KEY = "slip.web.expenses.v1";
const CATEGORIES_KEY = "slip.web.categories.v1";
const ESTABLISHMENTS_KEY = "slip.web.establishments.v1";

function isIncome(type) {
  return INCOME_TYPES.has(type);
}

function isExcluded(type) {
  return EXCLUDED_TYPES.has(type);
}

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const shortDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const longDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim())
      : [];
  } catch {
    return [];
  }
}

function loadSavedEstablishments() {
  try {
    const raw = localStorage.getItem(ESTABLISHMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim())
      : [];
  } catch {
    return [];
  }
}

function normalizeExpense(entry) {
  const date =
    entry.date ||
    (entry.createdAt ? toInputDate(new Date(entry.createdAt)) : toInputDate(new Date()));
  return { ...entry, date };
}

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeExpense) : [];
  } catch {
    return [];
  }
}

const state = {
  expenses: loadExpenses(),
  customCategories: loadCustomCategories(),
  establishments: loadSavedEstablishments(),
  type: "Restaurant",
  mode: "week",
  editingId: null,
  searchQuery: "",
  consolidateSnapshot: null,
};

const els = {
  home: document.getElementById("home"),
  consolidate: document.getElementById("consolidate"),
  form: document.getElementById("expense-form"),
  amount: document.getElementById("amount"),
  establishment: document.getElementById("establishment"),
  establishmentChips: document.getElementById("establishment-chips"),
  txnDate: document.getElementById("txn-date"),
  typePicker: document.getElementById("type-picker"),
  customCategory: document.getElementById("custom-category"),
  addCategory: document.getElementById("add-category"),
  list: document.getElementById("expense-list"),
  empty: document.getElementById("empty-state"),
  allTime: document.getElementById("all-time"),
  recentSearch: document.getElementById("recent-search"),
  clearRecentSearch: document.getElementById("clear-recent-search"),
  openConsolidate: document.getElementById("open-consolidate"),
  backHome: document.getElementById("back-home"),
  dlByType: document.getElementById("dl-by-type"),
  dlEntries: document.getElementById("dl-entries"),
  downloadExcel: document.getElementById("download-excel"),
  downloadWord: document.getElementById("download-word"),
  downloadPdf: document.getElementById("download-pdf"),
  modes: document.querySelectorAll(".mode"),
  customRange: document.getElementById("custom-range"),
  fromDate: document.getElementById("from-date"),
  toDate: document.getElementById("to-date"),
  rangeLabel: document.getElementById("range-label"),
  rangeTotal: document.getElementById("range-total"),
  rangeSpent: document.getElementById("range-spent"),
  rangeSalary: document.getElementById("range-salary"),
  rangeCount: document.getElementById("range-count"),
  typeTotals: document.getElementById("type-totals"),
  rangeList: document.getElementById("range-list"),
  rangeEmpty: document.getElementById("range-empty"),
  submitBtn: document.getElementById("submit-btn"),
  cancelEdit: document.getElementById("cancel-edit"),
  exportData: document.getElementById("export-data"),
  importData: document.getElementById("import-data"),
  updateBanner: document.getElementById("update-banner"),
  updateVersion: document.getElementById("update-version"),
  updateNotes: document.getElementById("update-notes"),
  reloadUpdate: document.getElementById("reload-update"),
  appVersion: document.getElementById("app-version"),
};

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
}

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(state.customCategories));
}

function saveEstablishments() {
  localStorage.setItem(
    ESTABLISHMENTS_KEY,
    JSON.stringify(state.establishments),
  );
}

function rememberEstablishment(name) {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return;
  const without = state.establishments.filter(
    (item) => item.toLowerCase() !== cleaned.toLowerCase(),
  );
  state.establishments = [cleaned, ...without].slice(0, 40);
  saveEstablishments();
  renderEstablishmentSuggestions();
}

function seedEstablishmentsFromExpenses() {
  for (const expense of state.expenses) {
    const name = (expense.establishment || "").trim();
    if (!name) continue;
    if (
      !state.establishments.some(
        (item) => item.toLowerCase() === name.toLowerCase(),
      )
    ) {
      state.establishments.push(name);
    }
  }
  state.establishments = state.establishments.slice(0, 40);
  saveEstablishments();
}

function allTypes() {
  const extras = state.customCategories.filter(
    (type) => !DEFAULT_TYPES.includes(type),
  );
  return [...DEFAULT_TYPES, ...extras];
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

function startOfMonth(date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function toInputDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseInputDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function entryDate(entry) {
  return parseInputDate(entry.date) || new Date(entry.createdAt);
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const dateDiff = entryDate(b).getTime() - entryDate(a).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function currentRange() {
  const now = new Date();
  if (state.mode === "week") {
    return { start: startOfWeek(now), end: endOfWeek(now) };
  }
  if (state.mode === "month") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
  const start = parseInputDate(els.fromDate.value) || startOfMonth(now);
  const end = parseInputDate(els.toDate.value) || endOfMonth(now);
  return { start: startOfDay(start), end: endOfDay(end) };
}

function updateFormMode() {
  const editing = Boolean(state.editingId);
  els.form.classList.toggle("editing", editing);
  els.cancelEdit.classList.toggle("hidden", !editing);
  if (editing) {
    els.submitBtn.textContent = "Save changes";
  } else if (isIncome(state.type)) {
    els.submitBtn.textContent = "Add salary";
  } else if (isExcluded(state.type)) {
    els.submitBtn.textContent = "Add exception";
  } else {
    els.submitBtn.textContent = "Add expense";
  }
  els.establishment.placeholder = isIncome(state.type)
    ? "Employer or paycheck"
    : "Cafe Luna";
}

function splitTotals(entries) {
  let spent = 0;
  let salary = 0;
  let excepted = 0;
  for (const entry of entries) {
    if (isExcluded(entry.type)) {
      excepted += entry.amount;
      continue;
    }
    if (isIncome(entry.type)) salary += entry.amount;
    else spent += entry.amount;
  }
  return { spent, salary, excepted, net: spent - salary };
}

function renderTypePicker() {
  els.typePicker.innerHTML = "";
  for (const type of allTypes()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${type === state.type ? " active" : ""}${isIncome(type) ? " income" : ""}${isExcluded(type) ? " except" : ""}`;
    button.textContent = type;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(type === state.type));
    button.addEventListener("click", () => {
      state.type = type;
      renderTypePicker();
    });
    els.typePicker.appendChild(button);
  }
  updateFormMode();
}

function categoryForEstablishment(name) {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const matches = sortEntries(state.expenses).filter(
    (expense) => (expense.establishment || "").trim().toLowerCase() === needle,
  );
  return matches[0]?.type || null;
}

function applyCategoryForEstablishment(name, { force = false } = {}) {
  const category = categoryForEstablishment(name);
  if (!category) return false;
  if (!force && state.editingId) return false;
  if (!allTypes().includes(category)) {
    state.customCategories.push(category);
    saveCategories();
  }
  if (state.type === category) {
    updateFormMode();
    return true;
  }
  state.type = category;
  renderTypePicker();
  return true;
}

function renderEstablishmentSuggestions() {
  els.establishmentChips.innerHTML = "";
  for (const name of state.establishments.slice(0, 8)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "suggest-chip";
    chip.textContent = name;
    chip.addEventListener("click", () => {
      els.establishment.value = name;
      applyCategoryForEstablishment(name, { force: true });
      // Don't force-focus here — iOS often hides the keyboard after chip taps.
    });
    els.establishmentChips.appendChild(chip);
  }
}

function keepFieldAboveKeyboard(input) {
  if (!input) return;
  requestAnimationFrame(() => {
    input.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  });
}

function setupKeyboardGuards() {
  const fields = [
    els.amount,
    els.establishment,
    els.customCategory,
    els.recentSearch,
  ].filter(Boolean);
  for (const input of fields) {
    input.addEventListener("focus", () => keepFieldAboveKeyboard(input));
  }

  // Amount -> Establishment without dismissing keyboard awkwardly
  els.amount?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      els.establishment?.focus();
    }
  });

  if (window.visualViewport) {
    const syncKeyboardGap = () => {
      const gap = Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--keyboard-gap",
        `${Math.round(gap)}px`,
      );
      const active = document.activeElement;
      if (active && fields.includes(active)) {
        keepFieldAboveKeyboard(active);
      }
    };
    window.visualViewport.addEventListener("resize", syncKeyboardGap);
    window.visualViewport.addEventListener("scroll", syncKeyboardGap);
  }
}

function addCustomCategory() {
  const name = els.customCategory.value.trim().replace(/\s+/g, " ");
  if (!name) return;
  if (name.length > 32) {
    alert("Keep category names to 32 characters or less.");
    return;
  }
  const exists = allTypes().some(
    (type) => type.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    const match = allTypes().find(
      (type) => type.toLowerCase() === name.toLowerCase(),
    );
    state.type = match;
    els.customCategory.value = "";
    renderTypePicker();
    return;
  }
  state.customCategories.push(name);
  saveCategories();
  state.type = name;
  els.customCategory.value = "";
  renderTypePicker();
}

function resetForm() {
  state.editingId = null;
  els.amount.value = "";
  els.establishment.value = "";
  els.txnDate.value = toInputDate(new Date());
  state.type = "Restaurant";
  renderTypePicker();
  updateFormMode();
}

function startEdit(expense) {
  state.editingId = expense.id;
  els.amount.value = String(expense.amount);
  els.establishment.value = expense.establishment;
  els.txnDate.value = expense.date;
  state.type = expense.type;
  if (!allTypes().includes(expense.type)) {
    state.customCategories.push(expense.type);
    saveCategories();
  }
  renderTypePicker();
  updateFormMode();
  showHome();
  els.form.scrollIntoView({ behavior: "smooth", block: "start" });
  els.amount.focus();
}

function expenseRow(expense, { canEdit = false } = {}) {
  const row = document.createElement("article");
  row.className = "row";
  const income = isIncome(expense.type);
  const excluded = isExcluded(expense.type);
  row.innerHTML = `
    <div class="row-main">
      <p class="row-name"></p>
      <p class="row-meta"></p>
    </div>
    <div class="row-right">
      <p class="row-amount${income ? " amount-income" : ""}${excluded ? " amount-except" : ""}"></p>
    </div>
  `;
  row.querySelector(".row-name").textContent = expense.establishment;
  row.querySelector(".row-meta").textContent = `${expense.type} · ${shortDate.format(entryDate(expense))}${excluded ? " · not counted" : ""}`;
  row.querySelector(".row-amount").textContent = income
    ? `+${money.format(expense.amount)}`
    : excluded
      ? `(${money.format(expense.amount)})`
      : money.format(expense.amount);

  if (canEdit) {
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEdit(expense));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      if (!confirm(`Remove ${expense.establishment}?`)) return;
      state.expenses = state.expenses.filter((item) => item.id !== expense.id);
      if (state.editingId === expense.id) resetForm();
      saveExpenses();
      renderHome();
      renderConsolidate();
    });

    actions.append(edit, remove);
    row.querySelector(".row-right").appendChild(actions);
  }

  return row;
}

function matchesSearch(expense, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    expense.establishment,
    expense.type,
    String(expense.amount),
    money.format(expense.amount),
    expense.date,
    shortDate.format(entryDate(expense)),
    longDate.format(entryDate(expense)),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function renderHome() {
  els.list.innerHTML = "";
  const sorted = sortEntries(state.expenses);
  const visible = sorted.filter((expense) =>
    matchesSearch(expense, state.searchQuery),
  );

  if (sorted.length === 0) {
    els.empty.classList.remove("hidden");
    els.empty.textContent = "No expenses yet. Add your first slip above.";
    els.allTime.textContent = "";
  } else if (visible.length === 0) {
    els.empty.classList.remove("hidden");
    els.empty.textContent = "No transactions match your search.";
    const { net } = splitTotals(sorted);
    els.allTime.textContent = `${money.format(net)} net`;
  } else {
    els.empty.classList.add("hidden");
    const { net } = splitTotals(sorted);
    els.allTime.textContent = `${money.format(net)} net`;
    for (const expense of visible) {
      els.list.appendChild(expenseRow(expense, { canEdit: true }));
    }
  }
}

function renderConsolidate() {
  const range = currentRange();
  const filtered = sortEntries(
    state.expenses.filter((expense) => {
      const time = entryDate(expense).getTime();
      return time >= range.start.getTime() && time <= range.end.getTime();
    }),
  );

  const { spent, salary, excepted, net } = splitTotals(filtered);
  els.rangeLabel.textContent = `${longDate.format(range.start)} – ${longDate.format(range.end)}`;
  els.rangeTotal.textContent = money.format(net);
  els.rangeSpent.textContent = `Spent ${money.format(spent)}`;
  els.rangeSalary.textContent = `Salary −${money.format(salary)}`;
  els.rangeSalary.classList.toggle("salary-line", salary > 0);
  let countLine = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  if (excepted > 0) {
    countLine += ` · Except ${money.format(excepted)} not counted`;
  }
  els.rangeCount.textContent = countLine;

  const byType = new Map();
  for (const expense of filtered) {
    if (isExcluded(expense.type)) continue;
    const current = byType.get(expense.type) || { total: 0, count: 0 };
    current.total += expense.amount;
    current.count += 1;
    byType.set(expense.type, current);
  }

  els.typeTotals.innerHTML = "";
  const rows = [...byType.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [type, info] of rows) {
    const row = document.createElement("div");
    row.className = "type-row";
    const income = isIncome(type);
    row.innerHTML = `
      <div>
        <p class="row-name"></p>
        <p class="type-count"></p>
      </div>
      <p class="type-total${income ? " income" : ""}"></p>
    `;
    row.querySelector(".row-name").textContent = type;
    row.querySelector(".type-count").textContent = `${info.count} ${info.count === 1 ? "entry" : "entries"}`;
    row.querySelector(".type-total").textContent = income
      ? `−${money.format(info.total)}`
      : money.format(info.total);
    els.typeTotals.appendChild(row);
  }

  els.rangeList.innerHTML = "";
  if (filtered.length === 0) {
    els.rangeEmpty.classList.remove("hidden");
  } else {
    els.rangeEmpty.classList.add("hidden");
    for (const expense of filtered) {
      els.rangeList.appendChild(expenseRow(expense, { canEdit: true }));
    }
  }

  state.consolidateSnapshot = {
    rangeLabel: formatRangeLabelText(range),
    spent,
    salary,
    excepted,
    net,
    byCategory: rows.map(([type, info]) => ({
      category: type,
      entries: info.count,
      total: info.total,
      income: isIncome(type),
    })),
    entries: filtered.map((expense) => ({
      date: expense.date,
      establishment: expense.establishment,
      category: expense.type,
      amount: expense.amount,
      excluded: isExcluded(expense.type),
      income: isIncome(expense.type),
    })),
  };
}

function formatRangeLabelText(range) {
  return `${longDate.format(range.start)} – ${longDate.format(range.end)}`;
}

function selectedDownloadSections() {
  const byCategory = Boolean(els.dlByType?.checked);
  const entries = Boolean(els.dlEntries?.checked);
  if (!byCategory && !entries) {
    alert("Choose at least one: By category and/or Entries.");
    return null;
  }
  return { byCategory, entries };
}

function getConsolidateSnapshot() {
  if (!state.consolidateSnapshot) renderConsolidate();
  return state.consolidateSnapshot;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function stampName(ext) {
  return `slip-consolidate-${toInputDate(new Date())}.${ext}`;
}

function downloadExcel() {
  const sections = selectedDownloadSections();
  if (!sections) return;
  if (typeof XLSX === "undefined") {
    alert("Excel export is still loading. Try again in a moment.");
    return;
  }
  const snap = getConsolidateSnapshot();
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["Slip consolidate"],
    ["Range", snap.rangeLabel],
    ["Net after salary", snap.net],
    ["Spent", snap.spent],
    ["Salary", snap.salary],
    ["Except (not counted)", snap.excepted],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );

  if (sections.byCategory) {
    const rows = [
      ["Category", "Entries", "Total"],
      ...snap.byCategory.map((row) => [
        row.category,
        row.entries,
        row.income ? -row.total : row.total,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(rows),
      "By category",
    );
  }

  if (sections.entries) {
    const sheetRows = [
      ["Date", "Establishment", "Category", "Amount", "Counted in net"],
      ...snap.entries.map((row) => [
        row.date,
        row.establishment,
        row.category,
        row.amount,
        row.excluded ? "No" : row.income ? "Salary" : "Yes",
      ]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(sheetRows),
      "Entries",
    );
  }

  XLSX.writeFile(workbook, stampName("xlsx"));
}

function buildWordHtml(sections, snap) {
  const tableStyle =
    "border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12pt;";
  const cell = "border:1px solid #333;padding:6px;text-align:left;";
  const th = `${cell}background:#e8eee9;`;

  let body = `
    <h1>Slip consolidate</h1>
    <p><strong>Range:</strong> ${snap.rangeLabel}</p>
    <p><strong>Net after salary:</strong> ${money.format(snap.net)}</p>
    <p><strong>Spent:</strong> ${money.format(snap.spent)} ·
       <strong>Salary:</strong> ${money.format(snap.salary)} ·
       <strong>Except:</strong> ${money.format(snap.excepted)}</p>
  `;

  if (sections.byCategory) {
    body += `<h2>By category</h2><table style="${tableStyle}"><thead><tr>
      <th style="${th}">Category</th><th style="${th}">Entries</th><th style="${th}">Total</th>
    </tr></thead><tbody>`;
    for (const row of snap.byCategory) {
      body += `<tr>
        <td style="${cell}">${escapeHtml(row.category)}</td>
        <td style="${cell}">${row.entries}</td>
        <td style="${cell}">${row.income ? "−" : ""}${money.format(row.total)}</td>
      </tr>`;
    }
    body += `</tbody></table>`;
  }

  if (sections.entries) {
    body += `<h2>Entries</h2><table style="${tableStyle}"><thead><tr>
      <th style="${th}">Date</th><th style="${th}">Establishment</th>
      <th style="${th}">Category</th><th style="${th}">Amount</th>
      <th style="${th}">Counted in net</th>
    </tr></thead><tbody>`;
    for (const row of snap.entries) {
      body += `<tr>
        <td style="${cell}">${escapeHtml(row.date)}</td>
        <td style="${cell}">${escapeHtml(row.establishment)}</td>
        <td style="${cell}">${escapeHtml(row.category)}</td>
        <td style="${cell}">${row.income ? "+" : ""}${money.format(row.amount)}</td>
        <td style="${cell}">${row.excluded ? "No" : row.income ? "Salary" : "Yes"}</td>
      </tr>`;
    }
    body += `</tbody></table>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Slip consolidate</title></head><body>${body}</body></html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadWord() {
  const sections = selectedDownloadSections();
  if (!sections) return;
  const snap = getConsolidateSnapshot();
  const html = buildWordHtml(sections, snap);
  downloadBlob(
    stampName("doc"),
    new Blob(["\ufeff", html], { type: "application/msword" }),
  );
}

function downloadPdf() {
  const sections = selectedDownloadSections();
  if (!sections) return;
  const jsPdfNS = window.jspdf;
  if (!jsPdfNS?.jsPDF) {
    alert("PDF export is still loading. Try again in a moment.");
    return;
  }
  const snap = getConsolidateSnapshot();
  const doc = new jsPdfNS.jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 40;
  doc.setFontSize(16);
  doc.text("Slip consolidate", 40, y);
  y += 22;
  doc.setFontSize(11);
  doc.text(`Range: ${snap.rangeLabel}`, 40, y);
  y += 16;
  doc.text(`Net after salary: ${money.format(snap.net)}`, 40, y);
  y += 14;
  doc.text(
    `Spent: ${money.format(snap.spent)}   Salary: ${money.format(snap.salary)}   Except: ${money.format(snap.excepted)}`,
    40,
    y,
  );
  y += 18;

  if (sections.byCategory) {
    doc.autoTable({
      startY: y,
      head: [["Category", "Entries", "Total"]],
      body: snap.byCategory.map((row) => [
        row.category,
        String(row.entries),
        `${row.income ? "−" : ""}${money.format(row.total)}`,
      ]),
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [15, 92, 76] },
    });
    y = doc.lastAutoTable.finalY + 18;
  }

  if (sections.entries) {
    doc.autoTable({
      startY: y,
      head: [["Date", "Establishment", "Category", "Amount", "Counted"]],
      body: snap.entries.map((row) => [
        row.date,
        row.establishment,
        row.category,
        `${row.income ? "+" : ""}${money.format(row.amount)}`,
        row.excluded ? "No" : row.income ? "Salary" : "Yes",
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [15, 92, 76] },
    });
  }

  doc.save(stampName("pdf"));
}

function showHome() {
  els.consolidate.classList.add("hidden");
  els.home.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showConsolidate() {
  els.home.classList.add("hidden");
  els.consolidate.classList.remove("hidden");
  renderConsolidate();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(els.amount.value);
  const establishment = els.establishment.value.trim().replace(/\s+/g, " ");
  const date = els.txnDate.value;
  if (!establishment || !Number.isFinite(amount) || amount <= 0 || !parseInputDate(date)) {
    return;
  }

  const payload = {
    amount: Math.round(amount * 100) / 100,
    establishment,
    type: state.type,
    date,
  };

  if (state.editingId) {
    state.expenses = state.expenses.map((item) =>
      item.id === state.editingId ? { ...item, ...payload } : item,
    );
  } else {
    state.expenses.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
      createdAt: new Date().toISOString(),
    });
  }

  rememberEstablishment(establishment);
  saveExpenses();
  resetForm();
  renderHome();
  renderConsolidate();
  // Avoid programmatic focus after save — iOS Home Screen apps often fail to
  // show the keyboard for non-gesture focus, which then breaks later taps.
});

els.cancelEdit.addEventListener("click", () => {
  resetForm();
});

els.establishment.addEventListener("change", () => {
  applyCategoryForEstablishment(els.establishment.value, { force: true });
});
els.establishment.addEventListener("blur", () => {
  // Defer so we don't rebuild chips/DOM in the middle of the focus change
  // to another field (a common iOS keyboard-dismiss bug).
  setTimeout(() => {
    applyCategoryForEstablishment(els.establishment.value, { force: true });
  }, 0);
});

els.addCategory.addEventListener("click", addCustomCategory);
els.customCategory.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCustomCategory();
  }
});

function syncSearchClearButton() {
  const hasQuery = Boolean(els.recentSearch?.value?.trim());
  els.clearRecentSearch?.classList.toggle("hidden", !hasQuery);
}

function applyRecentSearch() {
  state.searchQuery = els.recentSearch?.value || "";
  syncSearchClearButton();
  renderHome();
}

function clearRecentSearch() {
  if (!els.recentSearch) return;
  els.recentSearch.value = "";
  applyRecentSearch();
}

els.recentSearch?.addEventListener("input", applyRecentSearch);
els.recentSearch?.addEventListener("search", applyRecentSearch);
els.recentSearch?.addEventListener("keyup", applyRecentSearch);
els.recentSearch?.addEventListener("change", applyRecentSearch);
els.clearRecentSearch?.addEventListener("click", (event) => {
  event.preventDefault();
  clearRecentSearch();
});
syncSearchClearButton();

els.downloadExcel?.addEventListener("click", downloadExcel);
els.downloadWord?.addEventListener("click", downloadWord);
els.downloadPdf?.addEventListener("click", downloadPdf);

els.openConsolidate.addEventListener("click", showConsolidate);
els.backHome.addEventListener("click", showHome);

els.modes.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    els.modes.forEach((item) => item.classList.toggle("active", item === button));
    els.customRange.classList.toggle("hidden", state.mode !== "custom");
    renderConsolidate();
  });
});

els.fromDate.addEventListener("change", renderConsolidate);
els.toDate.addEventListener("change", renderConsolidate);

const now = new Date();
els.txnDate.value = toInputDate(now);
els.fromDate.value = toInputDate(startOfMonth(now));
els.toDate.value = toInputDate(endOfMonth(now));

function exportBackup() {
  const payload = {
    app: "Slip",
    version: window.SLIP_VERSION || "unknown",
    exportedAt: new Date().toISOString(),
    expenses: state.expenses,
    customCategories: state.customCategories,
    establishments: state.establishments,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = toInputDate(new Date());
  link.href = url;
  link.download = `slip-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importBackup(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    alert("That file is not a valid Slip backup.");
    return;
  }
  const expenses = Array.isArray(parsed.expenses)
    ? parsed.expenses.map(normalizeExpense)
    : null;
  if (!expenses) {
    alert("That backup has no expenses list.");
    return;
  }
  const ok = confirm(
    `Replace your current Slip data with this backup?\n\n${expenses.length} transactions will be restored.`,
  );
  if (!ok) return;

  state.expenses = expenses;
  state.customCategories = Array.isArray(parsed.customCategories)
    ? parsed.customCategories.filter((item) => typeof item === "string")
    : state.customCategories;
  state.establishments = Array.isArray(parsed.establishments)
    ? parsed.establishments.filter((item) => typeof item === "string")
    : state.establishments;

  saveExpenses();
  saveCategories();
  saveEstablishments();
  seedEstablishmentsFromExpenses();
  renderEstablishmentSuggestions();
  renderTypePicker();
  resetForm();
  renderHome();
  renderConsolidate();
  alert("Backup imported.");
}

let slipServiceWorkerRegistration = null;
let slipUpdateReloadArmed = false;

function renderUpdateNotes(data) {
  if (els.updateVersion) {
    els.updateVersion.textContent = data?.version
      ? `Version ${data.version}`
      : "";
  }
  if (!els.updateNotes) return;
  els.updateNotes.innerHTML = "";
  const notes = Array.isArray(data?.notes) ? data.notes : [];
  for (const note of notes) {
    if (typeof note !== "string" || !note.trim()) continue;
    const item = document.createElement("li");
    item.textContent = note.trim();
    els.updateNotes.appendChild(item);
  }
}

async function loadWhatsNew() {
  try {
    const response = await fetch(`./whats-new.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function showUpdateBanner() {
  els.updateBanner?.classList.remove("hidden");
  const data = await loadWhatsNew();
  if (data) renderUpdateNotes(data);
}

function watchInstallingWorker(worker) {
  if (!worker) return;
  worker.addEventListener("statechange", () => {
    if (worker.state !== "installed") return;
    if (navigator.serviceWorker.controller) {
      // A newer build is waiting — keep running this version until Update.
      showUpdateBanner();
      return;
    }
    // First-time install: activate quietly so offline cache works.
    worker.postMessage("SKIP_WAITING");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register(`./sw.js?v=${encodeURIComponent(window.SLIP_VERSION || "1")}`)
    .then((registration) => {
      slipServiceWorkerRegistration = registration;

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner();
      }
      watchInstallingWorker(registration.installing);

      registration.addEventListener("updatefound", () => {
        watchInstallingWorker(registration.installing);
      });

      const checkForUpdate = () => {
        registration.update().catch(() => undefined);
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("focus", checkForUpdate);
      // Periodic check while the Home Screen app stays open.
      setInterval(checkForUpdate, 60 * 60 * 1000);
    })
    .catch(() => undefined);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Only reload after the user taps Update (or first-install activate).
    if (!slipUpdateReloadArmed) return;
    window.location.reload();
  });
}

els.exportData?.addEventListener("click", exportBackup);
els.importData?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) void importBackup(file);
  event.target.value = "";
});
els.reloadUpdate?.addEventListener("click", () => {
  const waiting = slipServiceWorkerRegistration?.waiting;
  slipUpdateReloadArmed = true;
  if (waiting) {
    waiting.postMessage("SKIP_WAITING");
    return;
  }
  // No waiting worker — still reload so the banner can dismiss cleanly.
  window.location.reload();
});

if (els.appVersion) {
  els.appVersion.textContent = `Version ${window.SLIP_VERSION || "—"}`;
}

seedEstablishmentsFromExpenses();
renderEstablishmentSuggestions();
renderTypePicker();
renderHome();
updateFormMode();
setupKeyboardGuards();
registerServiceWorker();

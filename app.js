/* =========================================================
   QARZ DAFTARI PRO (REWRITE)
   PIN: 123456 (FORCE)
========================================================= */

/* ------------------------------
  Helpers
------------------------------ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function uid() {
  return "d_" + Math.random().toString(16).slice(2) + "_" + Date.now();
}
function safeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function fmtMoneyUZS(n) {
  const num = Number(n || 0);
  return num.toLocaleString("uz-UZ") + " UZS";
}
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* ------------------------------
  Storage keys
------------------------------ */
const DB_KEY = "qarz_daftar_pro_v1";
const SETTINGS_KEY = "qarz_daftar_settings_v1";
const PIN_KEY = "qarz_daftar_pin_v1";

/* ------------------------------
  Storage functions
------------------------------ */
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { debts: [] };
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.debts)) return { debts: [] };
    return obj;
  } catch {
    return { debts: [] };
  }
}
function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { theme: "dark" };
    const s = JSON.parse(raw);
    return { theme: s.theme || "dark" };
  } catch {
    return { theme: "dark" };
  }
}
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function getPin() {
  return localStorage.getItem(PIN_KEY) || "";
}
function setPin(pin) {
  localStorage.setItem(PIN_KEY, pin);
}

/* ------------------------------
  FORCE PIN
------------------------------ */
function forcePin123456() {
  // ✅ ALWAYS FORCE PIN
  setPin("123456");
}

/* ------------------------------
  App state
------------------------------ */
let db = loadDB();
let settings = loadSettings();

const state = {
  search: "",
  filterType: "all",
  filterStatus: "all",
  sortBy: "created_desc",
  unlocked: true,
};

/* ------------------------------
  Elements
------------------------------ */
const debtForm = $("#debtForm");
const listEl = $("#list");
const emptyState = $("#emptyState");

const personEl = $("#person");
const phoneEl = $("#phone");
const amountEl = $("#amount");
const dateEl = $("#date");
const dueDateEl = $("#dueDate");
const noteEl = $("#note");

const searchEl = $("#search");
const filterTypeEl = $("#filterType");
const filterStatusEl = $("#filterStatus");
const sortByEl = $("#sortBy");

const btnReset = $("#btnReset");
const btnClearAll = $("#btnClearAll");
const btnExport = $("#btnExport");
const btnImport = $("#btnImport");
const importFile = $("#importFile");
const btnCSV = $("#btnCSV");
const btnPrint = $("#btnPrint");
const btnAddDemo = $("#btnAddDemo");

const btnTheme = $("#btnTheme");
const btnHelp = $("#btnHelp");
const btnLock = $("#btnLock");

/* Stats */
const statGiven = $("#statGiven");
const statGivenCount = $("#statGivenCount");
const statTaken = $("#statTaken");
const statTakenCount = $("#statTakenCount");
const statOpen = $("#statOpen");
const statOpenCount = $("#statOpenCount");
const statOverdue = $("#statOverdue");
const statOverdueCount = $("#statOverdueCount");
const balanceEl = $("#balance");
const topPeopleEl = $("#topPeople");

/* Modal */
const modal = $("#modal");
const modalBackdrop = $("#modalBackdrop");
const btnCloseModal = $("#btnCloseModal");
const modalTitle = $("#modalTitle");
const modalBody = $("#modalBody");
const modalFoot = $("#modalFoot");

/* Lock */
const lockScreen = $("#lockScreen");
const pinInput = $("#pinInput");
const btnUnlock = $("#btnUnlock");
const btnSetPin = $("#btnSetPin");
const btnRemovePin = $("#btnRemovePin");

/* Toast */
const toastWrap = $("#toastWrap");

/* ------------------------------
  Toast
------------------------------ */
function toast(title, sub = "") {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <div class="toast-title">${safeText(title)}</div>
    <div class="toast-sub">${safeText(sub)}</div>
  `;
  toastWrap.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
  }, 2500);

  setTimeout(() => el.remove(), 3200);
}

/* ------------------------------
  Modal
------------------------------ */
function openModal({ title, bodyHTML, footHTML }) {
  modalTitle.textContent = title || "Modal";
  modalBody.innerHTML = bodyHTML || "";
  modalFoot.innerHTML = footHTML || "";
  modal.classList.remove("hidden");
}
function closeModal() {
  modal.classList.add("hidden");
  modalBody.innerHTML = "";
  modalFoot.innerHTML = "";
}

/* ------------------------------
  Theme
------------------------------ */
function applyTheme(theme) {
  settings.theme = theme;
  saveSettings(settings);
  document.documentElement.setAttribute("data-theme", theme);
  btnTheme.textContent = theme === "dark" ? "🌙" : "☀️";
}

/* ------------------------------
  Lock
------------------------------ */
function applyLockCheck() {
  const pin = getPin();
  if (pin && pin.length >= 4) {
    state.unlocked = false;
    lockScreen.classList.remove("hidden");
  } else {
    state.unlocked = true;
    lockScreen.classList.add("hidden");
  }
}
function showLock() {
  state.unlocked = false;
  lockScreen.classList.remove("hidden");
  toast("🔒 Lock yoqildi", "PIN: 123456");
}
function unlock() {
  const entered = (pinInput.value || "").trim();
  if (entered === "123456") {
    state.unlocked = true;
    lockScreen.classList.add("hidden");
    pinInput.value = "";
    toast("✅ Unlock", "Xush kelibsiz!");
    render();
  } else {
    toast("❌ Xato PIN", "PIN 123456");
  }
}

/* ------------------------------
  Debt calc
------------------------------ */
function calcPaidSum(debt) {
  return (debt.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
}
function calcRemaining(debt) {
  return Math.max(0, Number(debt.amount || 0) - calcPaidSum(debt));
}
function isOverdue(debt) {
  if (!debt.dueDate) return false;
  if (debt.status === "paid") return false;
  const due = parseISODate(debt.dueDate);
  const now = new Date();
  return due && now.getTime() > due.getTime() + 1000 * 60 * 60 * 24 - 1;
}

/* ------------------------------
  Add / reset form
------------------------------ */
function addDebt(data) {
  const debt = {
    id: uid(),
    type: data.type,
    person: data.person.trim(),
    phone: data.phone.trim(),
    amount: Number(data.amount),
    date: data.date,
    dueDate: data.dueDate || "",
    note: data.note.trim(),
    createdAt: Date.now(),
    payments: [],
    status: "open",
  };
  db.debts.unshift(debt);
  saveDB(db);
  toast("✅ Saqlandi", `${debt.person} — ${fmtMoneyUZS(debt.amount)}`);
}
function resetForm() {
  debtForm.reset();
  dateEl.value = todayISO();
}

/* ------------------------------
  Filter / sort
------------------------------ */
function getFilteredDebts() {
  let debts = [...db.debts];

  const q = state.search.trim().toLowerCase();
  if (q) {
    debts = debts.filter(d => {
      const text = `${d.person} ${d.phone} ${d.note}`.toLowerCase();
      return text.includes(q);
    });
  }

  if (state.filterType !== "all") debts = debts.filter(d => d.type === state.filterType);

  if (state.filterStatus !== "all") {
    if (state.filterStatus === "overdue") debts = debts.filter(isOverdue);
    else debts = debts.filter(d => d.status === state.filterStatus);
  }

  debts.sort((a, b) => {
    const s = state.sortBy;
    if (s === "created_desc") return b.createdAt - a.createdAt;
    if (s === "created_asc") return a.createdAt - b.createdAt;
    if (s === "amount_desc") return Number(b.amount) - Number(a.amount);
    if (s === "amount_asc") return Number(a.amount) - Number(b.amount);
    if (s === "name_asc") return a.person.localeCompare(b.person);
    if (s === "name_desc") return b.person.localeCompare(a.person);
    return 0;
  });

  return debts;
}

/* ------------------------------
  Render
------------------------------ */
function renderDebtCard(d) {
  const paid = calcPaidSum(d);
  const remaining = calcRemaining(d);
  const percent = d.amount > 0 ? Math.min(100, Math.round((paid / d.amount) * 100)) : 0;

  const typeBadge = d.type === "given"
    ? `<span class="badge given">Men berdim</span>`
    : `<span class="badge taken">Men oldim</span>`;

  const statusBadge = d.status === "paid"
    ? `<span class="badge paid">✅ To‘langan</span>`
    : isOverdue(d)
      ? `<span class="badge overdue">⏰ Muddati o‘tgan</span>`
      : `<span class="badge open">🟦 Ochiq</span>`;

  return `
    <div class="item" data-id="${d.id}">
      <div class="item-left">
        <div class="item-head">
          ${typeBadge}
          ${statusBadge}
          <span class="item-name">${safeText(d.person)}</span>
        </div>

        <div class="item-meta">
          Sana: <b>${safeText(d.date)}</b> • Muddat: <b>${safeText(d.dueDate || "yo‘q")}</b> • Tel: <b>${safeText(d.phone || "yo‘q")}</b>
        </div>

        <div class="item-note">📝 ${d.note ? safeText(d.note) : `<span style="opacity:.7">Izoh yo‘q</span>`}</div>

        <div class="item-meta">
          To‘langan: <b>${fmtMoneyUZS(paid)}</b> • Qolgan: <b>${fmtMoneyUZS(remaining)}</b>
        </div>

        <div class="progress"><div style="width:${percent}%"></div></div>
      </div>

      <div class="item-right">
        <div class="item-amount">${fmtMoneyUZS(d.amount)}</div>

        <div class="item-actions">
          <button class="small-btn" data-action="payment">💳 To‘lov</button>
          <button class="small-btn" data-action="details">📄 Detail</button>
          <button class="small-btn" data-action="togglePaid">${d.status==="paid"?"↩️ Qaytarish":"✅ Paid"}</button>
          <button class="small-btn danger" data-action="delete">🗑</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  if (!state.unlocked) return;

  const debts = getFilteredDebts();
  if (debts.length === 0) {
    listEl.innerHTML = "";
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
    listEl.innerHTML = debts.map(renderDebtCard).join("");
  }

  renderStats();
  bindCardEvents();
}

/* ------------------------------
  Stats
------------------------------ */
function renderTopPeople() {
  const map = new Map();
  for (const d of db.debts) {
    if (d.status === "paid") continue;
    const rem = calcRemaining(d);
    if (rem <= 0) continue;
    const k = d.person.toLowerCase().trim();
    const v = map.get(k) || { person: d.person, sum: 0, type: d.type };
    v.sum += rem;
    map.set(k, v);
  }
  const arr = [...map.values()].sort((a,b)=>b.sum-a.sum).slice(0,8);

  if (arr.length === 0) {
    topPeopleEl.innerHTML = `
      <div class="top-item">
        <div class="top-left">
          <div class="top-name">Hozircha yo‘q</div>
          <div class="top-sub">To‘lanmagan qarzlar chiqadi</div>
        </div>
        <div class="top-sum">—</div>
      </div>
    `;
    return;
  }

  topPeopleEl.innerHTML = arr.map((x,i)=>`
    <div class="top-item">
      <div class="top-left">
        <div class="top-name">${i+1}. ${safeText(x.person)}</div>
        <div class="top-sub">${x.type==="given"?"siz bergansiz":"siz olgansiz"}</div>
      </div>
      <div class="top-sum">${fmtMoneyUZS(x.sum)}</div>
    </div>
  `).join("");
}

function renderStats() {
  const all = db.debts;

  const given = all.filter(d => d.type === "given");
  const taken = all.filter(d => d.type === "taken");

  const sumGiven = given.reduce((s,d)=>s+calcRemaining(d),0);
  const sumTaken = taken.reduce((s,d)=>s+calcRemaining(d),0);

  const open = all.filter(d => d.status === "open");
  const overdue = all.filter(d => isOverdue(d));

  const sumOpen = open.reduce((s,d)=>s+calcRemaining(d),0);
  const sumOver = overdue.reduce((s,d)=>s+calcRemaining(d),0);

  statGiven.textContent = fmtMoneyUZS(sumGiven);
  statGivenCount.textContent = `${given.length} ta`;
  statTaken.textContent = fmtMoneyUZS(sumTaken);
  statTakenCount.textContent = `${taken.length} ta`;
  statOpen.textContent = fmtMoneyUZS(sumOpen);
  statOpenCount.textContent = `${open.length} ta`;
  statOverdue.textContent = fmtMoneyUZS(sumOver);
  statOverdueCount.textContent = `${overdue.length} ta`;

  balanceEl.textContent = fmtMoneyUZS(sumGiven - sumTaken);
  renderTopPeople();
}

/* ------------------------------
  Card actions
------------------------------ */
function findDebt(id) {
  return db.debts.find(d => d.id === id);
}

function bindCardEvents() {
  $$(".item").forEach(card => {
    const id = card.getAttribute("data-id");
    card.querySelectorAll("[data-action]").forEach(btn => {
      btn.onclick = () => {
        const action = btn.getAttribute("data-action");
        if (action === "delete") return deleteDebt(id);
        if (action === "togglePaid") return togglePaid(id);
        if (action === "details") return showDetails(id);
        if (action === "payment") return addPaymentFlow(id);
      };
    });
  });
}

function deleteDebt(id) {
  const d = findDebt(id);
  if (!d) return;

  openModal({
    title: "🗑 O‘chirish",
    bodyHTML: `<p><b>${safeText(d.person)}</b> yozuvini o‘chiramizmi?</p>`,
    footHTML: `
      <button class="btn btn-ghost" id="mCancel">Bekor</button>
      <button class="btn btn-danger" id="mOk">O‘chirish</button>
    `
  });

  $("#mCancel").onclick = closeModal;
  $("#mOk").onclick = () => {
    db.debts = db.debts.filter(x => x.id !== id);
    saveDB(db);
    closeModal();
    toast("✅ O‘chirildi");
    render();
  };
}

function togglePaid(id) {
  const d = findDebt(id);
  if (!d) return;

  if (d.status === "paid") {
    d.status = "open";
    saveDB(db);
    toast("↩️ Qayta ochildi", d.person);
    render();
    return;
  }

  const rem = calcRemaining(d);

  // auto close payment
  if (rem > 0) {
    d.payments.push({
      id: uid(),
      amount: rem,
      date: todayISO(),
      note: "Auto close payment",
      createdAt: Date.now(),
    });
  }
  d.status = "paid";
  saveDB(db);
  toast("✅ Paid belgilandi", d.person);
  render();
}

function showDetails(id) {
  const d = findDebt(id);
  if (!d) return;

  const paid = calcPaidSum(d);
  const rem = calcRemaining(d);

  openModal({
    title: "📄 Detail",
    bodyHTML: `
      <div style="line-height:1.65">
        <b>${safeText(d.person)}</b> (${d.type==="given"?"Men berdim":"Men oldim"})<br/>
        📞 Tel: <b>${safeText(d.phone || "yo‘q")}</b><br/>
        💰 Summa: <b>${fmtMoneyUZS(d.amount)}</b><br/>
        ✅ To‘langan: <b>${fmtMoneyUZS(paid)}</b><br/>
        🟦 Qolgan: <b>${fmtMoneyUZS(rem)}</b><br/>
        📅 Sana: <b>${safeText(d.date)}</b><br/>
        ⏳ Muddat: <b>${safeText(d.dueDate || "yo‘q")}</b><br/>
        📝 Izoh: <b>${safeText(d.note || "yo‘q")}</b><br/>
      </div>
    `,
    footHTML: `<button class="btn btn-primary" id="mClose">Yopish</button>`
  });

  $("#mClose").onclick = closeModal;
}

function addPaymentFlow(id) {
  const d = findDebt(id);
  if (!d) return;
  if (d.status === "paid") return toast("Paid", "Bu yozuv yopilgan");

  const remaining = calcRemaining(d);

  openModal({
    title: "💳 To‘lov qo‘shish",
    bodyHTML: `
      <p><b>${safeText(d.person)}</b> uchun to‘lov qo‘shish</p>
      <p style="opacity:.85">Qolgan: <b>${fmtMoneyUZS(remaining)}</b></p>

      <label class="label">To‘lov miqdori</label>
      <input id="payAmount" class="input" type="number" min="0" step="100" value="${Math.min(remaining, remaining)}"/>

      <label class="label">Sana</label>
      <input id="payDate" class="input" type="date" value="${todayISO()}"/>

      <label class="label">Izoh</label>
      <input id="payNote" class="input" type="text" placeholder="Masalan: 1-qism to‘lov"/>
    `,
    footHTML: `
      <button class="btn btn-ghost" id="mCancel">Bekor</button>
      <button class="btn btn-primary" id="mOk">✅ Qo‘shish</button>
    `
  });

  $("#mCancel").onclick = closeModal;
  $("#mOk").onclick = () => {
    const a = Number($("#payAmount").value || 0);
    const dt = $("#payDate").value || todayISO();
    const nt = ($("#payNote").value || "").trim();

    if (a <= 0) return toast("Xatolik", "To‘lov noto‘g‘ri");
    if (a > remaining) return toast("Xatolik", "Qolgan summadan katta bo‘lmaydi");

    d.payments = d.payments || [];
    d.payments.push({
      id: uid(),
      amount: a,
      date: dt,
      note: nt,
      createdAt: Date.now(),
    });

    if (calcRemaining(d) === 0) d.status = "paid";
    saveDB(db);

    closeModal();
    toast("✅ To‘lov qo‘shildi", fmtMoneyUZS(a));
    render();
  };
}

/* ------------------------------
  Export/Import/CSV/Print
------------------------------ */
function exportJSON() {
  const payload = {
    app: "Qarz Daftari Pro",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: db
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qarz-daftari-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("⬇️ Export tayyor", "JSON yuklandi");
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const data = obj?.data?.debts ? obj.data : obj;
      if (!data || !Array.isArray(data.debts)) throw new Error("Invalid format");

      db = { debts: data.debts };
      saveDB(db);
      toast("✅ Import bo‘ldi");
      render();
    } catch {
      toast("Xatolik", "JSON format noto‘g‘ri");
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  const headers = ["type","person","phone","amount","date","dueDate","note","status","paidSum","remaining"];
  const rows = db.debts.map(d => {
    const paid = calcPaidSum(d);
    const rem = calcRemaining(d);
    const values = [d.type,d.person,d.phone||"",d.amount,d.date,d.dueDate||"", (d.note||"").replaceAll("\n"," "), d.status, paid, rem];
    return values.map(v => `"${String(v).replaceAll('"','""')}"`).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `qarz-daftari-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast("📄 CSV tayyor", "CSV yuklandi");
}

function doPrint() {
  const debts = getFilteredDebts();
  const win = window.open("", "_blank");
  const html = `
  <html>
  <head>
    <title>Qarz Daftari — Print</title>
    <style>
      body{font-family:Arial; padding:18px}
      h1{margin:0}
      .sub{color:#555;margin:8px 0 14px}
      table{width:100%; border-collapse:collapse}
      th,td{border:1px solid #ddd; padding:8px; font-size:12px}
      th{background:#f5f5f5}
    </style>
  </head>
  <body>
    <h1>Qarz Daftari</h1>
    <div class="sub">Chop etilgan: ${new Date().toLocaleString("uz-UZ")}</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Turi</th><th>Ism</th><th>Summa</th><th>Qolgan</th><th>Sana</th><th>Muddat</th><th>Status</th><th>Izoh</th>
        </tr>
      </thead>
      <tbody>
        ${debts.map((d,i)=>{
          const rem = calcRemaining(d);
          return `
          <tr>
            <td>${i+1}</td>
            <td>${d.type==="given"?"Men berdim":"Men oldim"}</td>
            <td>${safeText(d.person)}</td>
            <td>${fmtMoneyUZS(d.amount)}</td>
            <td>${fmtMoneyUZS(rem)}</td>
            <td>${safeText(d.date)}</td>
            <td>${safeText(d.dueDate||"-")}</td>
            <td>${d.status==="paid"?"Paid":(isOverdue(d)?"Overdue":"Open")}</td>
            <td>${safeText(d.note||"")}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
    <script>window.print();</script>
  </body>
  </html>`;
  win.document.write(html);
  win.document.close();
}

/* ------------------------------
  Demo
------------------------------ */
function addDemo() {
  const demo = [
    { type:"given", person:"Shaxlo", phone:"+998901234567", amount:350000, date: todayISO(), dueDate:"", note:"2 haftada qaytaradi" },
    { type:"taken", person:"Doston", phone:"+998933334455", amount:1200000, date: todayISO(), dueDate:"", note:"Ishga kerak bo‘ldi" },
    { type:"given", person:"Aziz", phone:"", amount:50000, date: todayISO(), dueDate:"", note:"Yo‘l kira" },
  ];
  demo.forEach(addDebt);
  toast("✨ Demo qo‘shildi");
  render();
}

/* ------------------------------
  Help
------------------------------ */
function showHelp() {
  openModal({
    title: "❓ Yordam",
    bodyHTML: `
      <div style="line-height:1.6; opacity:.9">
        ✅ PIN: <b>123456</b><br/><br/>
        - Qarz qo‘shish: chap panel<br/>
        - To‘lov: kartada “💳 To‘lov”<br/>
        - Export/Import: backup<br/>
        - CSV: Excel uchun<br/>
        - Print: chop etish<br/>
      </div>
    `,
    footHTML: `<button class="btn btn-primary" id="mOk">Ok</button>`
  });
  $("#mOk").onclick = closeModal;
}

/* ------------------------------
  Bind events
------------------------------ */
function bindEvents() {
  debtForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = [...debtForm.querySelectorAll('input[name="type"]')]
      .find(x => x.checked)?.value || "given";

    const person = personEl.value;
    const phone = phoneEl.value;
    const amount = amountEl.value;
    const date = dateEl.value || todayISO();
    const dueDate = dueDateEl.value || "";
    const note = noteEl.value;

    if (!person.trim()) return toast("Xatolik", "Ism kiritish shart");
    if (!amount || Number(amount) <= 0) return toast("Xatolik", "Summa kiritish shart");

    addDebt({ type, person, phone, amount, date, dueDate, note });
    resetForm();
    render();
  });

  btnReset.onclick = () => { resetForm(); toast("♻️ Tozalandi"); };

  searchEl.oninput = () => { state.search = searchEl.value; render(); };
  filterTypeEl.onchange = () => { state.filterType = filterTypeEl.value; render(); };
  filterStatusEl.onchange = () => { state.filterStatus = filterStatusEl.value; render(); };
  sortByEl.onchange = () => { state.sortBy = sortByEl.value; render(); };

  $("#btnResetFilters").onclick = () => {
    state.search = "";
    state.filterType = "all";
    state.filterStatus = "all";
    state.sortBy = "created_desc";
    searchEl.value = "";
    filterTypeEl.value = "all";
    filterStatusEl.value = "all";
    sortByEl.value = "created_desc";
    toast("♻️ Filter reset");
    render();
  };

  btnClearAll.onclick = () => {
    db = { debts: [] };
    saveDB(db);
    toast("✅ Hammasi o‘chirildi");
    render();
  };

  btnExport.onclick = exportJSON;
  btnImport.onclick = () => importFile.click();
  importFile.onchange = () => {
    const file = importFile.files?.[0];
    if (file) importJSON(file);
    importFile.value = "";
  };

  btnCSV.onclick = exportCSV;
  btnPrint.onclick = doPrint;
  btnAddDemo.onclick = addDemo;

  btnTheme.onclick = () => {
    const next = settings.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    toast("🎨 Theme", next);
  };

  btnHelp.onclick = showHelp;

  btnLock.onclick = showLock;

  modalBackdrop.onclick = closeModal;
  btnCloseModal.onclick = closeModal;

  btnUnlock.onclick = unlock;
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });

  // PIN buttons disabled now (because forced)
  btnSetPin.onclick = () => toast("PIN o‘zgarmaydi", "PIN doim 123456 ✅");
  btnRemovePin.onclick = () => toast("PIN o‘chmaydi", "PIN doim 123456 ✅");
}

/* ------------------------------
  Init
------------------------------ */
function init() {
  // ✅ FORCE PIN ALWAYS
  forcePin123456();

  dateEl.value = todayISO();
  applyTheme(settings.theme);
  applyLockCheck();
  bindEvents();
  render();

  toast("🔐 PIN tayyor", "PIN: 123456");
}

init();

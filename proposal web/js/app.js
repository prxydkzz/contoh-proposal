/* app.js — logika halaman dasbor setelah pengguna masuk */

const session = DB.requireSession();
let charts = {}; // simpan instance Chart.js supaya bisa di-destroy sebelum digambar ulang

const rupiah = (n) =>
  "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : ""; // "YYYY-MM"
}

/* ---------------------------------------------------------
   NAVIGASI ANTAR HALAMAN (SPA sederhana pakai show/hide)
   --------------------------------------------------------- */
function goToView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  document.querySelectorAll(".nav-item").forEach((v) => v.classList.remove("is-active"));
  document.getElementById("view-" + name).classList.add("is-active");
  document.querySelector(`.nav-item[data-view="${name}"]`).classList.add("is-active");

  const titles = {
    dashboard: "Dasbor", income: "Catat Pemasukan", expense: "Catat Pengeluaran",
    goal: "Target Tabungan", charts: "Grafik Keuangan", report: "Laporan Bulanan",
    notice: "Notifikasi",
  };
  document.getElementById("page-title").textContent = titles[name];
  document.getElementById("app-shell").classList.remove("nav-open");

  if (name === "dashboard") renderDashboard();
  if (name === "income") renderIncomeList();
  if (name === "expense") renderExpenseList();
  if (name === "goal") renderGoal();
  if (name === "charts") renderAllCharts();
  if (name === "notice") renderNotices();
}

/* ---------------------------------------------------------
   PERHITUNGAN DASAR
   --------------------------------------------------------- */
function computeTotals() {
  const tx = DB.getTransactions(session.email);
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense, tx };
}

/* ---------------------------------------------------------
   DASHBOARD
   --------------------------------------------------------- */
function renderDashboard() {
  const { income, expense, balance, tx } = computeTotals();
  document.getElementById("stat-balance").textContent = rupiah(balance);
  document.getElementById("stat-income").textContent = rupiah(income);
  document.getElementById("stat-expense").textContent = rupiah(expense);

  const goal = DB.getGoal(session.email);
  const pct = goal && goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  document.getElementById("stat-goal-pct").textContent = Math.round(pct) + "%";

  if (goal) {
    document.getElementById("dash-goal-name").textContent = goal.name;
    document.getElementById("dash-goal-fill").style.width = pct + "%";
    document.getElementById("dash-goal-detail").textContent =
      `${rupiah(goal.current)} dari ${rupiah(goal.target)} (${Math.round(pct)}%)`;
  } else {
    document.getElementById("dash-goal-name").textContent = "Belum ada target — atur di menu Target Tabungan";
    document.getElementById("dash-goal-fill").style.width = "0%";
    document.getElementById("dash-goal-detail").textContent = "";
  }

  // 5 transaksi terbaru
  const recent = [...tx].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const box = document.getElementById("dash-recent");
  box.innerHTML = recent.length ? "" : `<p class="empty-note">Belum ada transaksi. Yuk mulai catat di menu Pemasukan/Pengeluaran.</p>`;
  recent.forEach((t) => box.appendChild(buildReceiptRow(t)));

  // mini chart bulan berjalan
  const thisMonth = new Date().toISOString().slice(0, 7);
  const mIncome = tx.filter((t) => t.type === "income" && monthKey(t.date) === thisMonth).reduce((s, t) => s + t.amount, 0);
  const mExpense = tx.filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth).reduce((s, t) => s + t.amount, 0);
  drawChart("chart-mini", "bar", {
    labels: ["Bulan ini"],
    datasets: [
      { label: "Pemasukan", data: [mIncome], backgroundColor: "#2f8f5b", borderRadius: 6, maxBarThickness: 46 },
      { label: "Pengeluaran", data: [mExpense], backgroundColor: "#c65a3d", borderRadius: 6, maxBarThickness: 46 },
    ],
  });
}

function buildReceiptRow(t, showDelete = true) {
  const row = document.createElement("div");
  row.className = "receipt-row";
  row.innerHTML = `
    <div class="meta">
      <span class="tag ${t.type}">${t.type === "income" ? "Masuk" : "Keluar"}</span>
      <div class="desc">
        <div class="cat">${t.category}</div>
        <div class="note">${t.note ? t.note + " • " : ""}${t.date}</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px">
      <div class="amt ${t.type}">${t.type === "income" ? "+" : "-"}${rupiah(t.amount)}</div>
      ${showDelete ? `<button class="del" data-id="${t.id}" title="Hapus">✕</button>` : ""}
    </div>
  `;
  if (showDelete) {
    row.querySelector(".del").addEventListener("click", () => {
      DB.deleteTransaction(session.email, t.id);
      goToView(t.type === "income" ? "income" : "expense");
      renderDashboard();
    });
  }
  return row;
}

/* ---------------------------------------------------------
   PEMASUKAN
   --------------------------------------------------------- */
document.getElementById("form-income").addEventListener("submit", (e) => {
  e.preventDefault();
  DB.addTransaction(session.email, {
    type: "income",
    amount: document.getElementById("income-amount").value,
    date: document.getElementById("income-date").value,
    category: document.getElementById("income-category").value,
    note: document.getElementById("income-note").value.trim(),
  });
  e.target.reset();
  document.getElementById("income-date").value = todayStr();
  renderIncomeList();
});

function renderIncomeList() {
  const list = DB.getTransactions(session.email)
    .filter((t) => t.type === "income")
    .sort((a, b) => b.createdAt - a.createdAt);
  const box = document.getElementById("income-list");
  box.innerHTML = list.length ? "" : `<p class="empty-note">Belum ada pemasukan tercatat.</p>`;
  list.forEach((t) => box.appendChild(buildReceiptRow(t)));
}

/* ---------------------------------------------------------
   PENGELUARAN
   --------------------------------------------------------- */
document.getElementById("form-expense").addEventListener("submit", (e) => {
  e.preventDefault();
  DB.addTransaction(session.email, {
    type: "expense",
    amount: document.getElementById("expense-amount").value,
    date: document.getElementById("expense-date").value,
    category: document.getElementById("expense-category").value,
    note: document.getElementById("expense-note").value.trim(),
  });
  e.target.reset();
  document.getElementById("expense-date").value = todayStr();
  renderExpenseList();
});

function renderExpenseList() {
  const list = DB.getTransactions(session.email)
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.createdAt - a.createdAt);
  const box = document.getElementById("expense-list");
  box.innerHTML = list.length ? "" : `<p class="empty-note">Belum ada pengeluaran tercatat.</p>`;
  list.forEach((t) => box.appendChild(buildReceiptRow(t)));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   TARGET TABUNGAN
   --------------------------------------------------------- */
document.getElementById("form-goal").addEventListener("submit", (e) => {
  e.preventDefault();
  DB.setGoal(session.email, {
    name: document.getElementById("goal-name").value.trim(),
    target: document.getElementById("goal-target").value,
    current: document.getElementById("goal-current").value || 0,
  });
  renderGoal();
});

document.getElementById("btn-goal-add").addEventListener("click", () => {
  const amount = Number(document.getElementById("goal-add-amount").value || 0);
  if (amount <= 0) return;
  DB.addToGoal(session.email, amount);
  document.getElementById("goal-add-amount").value = "";
  renderGoal();
});

function renderGoal() {
  const goal = DB.getGoal(session.email);
  const card = document.getElementById("goal-progress-card");
  if (!goal) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  document.getElementById("goal-title").textContent = goal.name;
  document.getElementById("goal-sub").textContent = `Target ${rupiah(goal.target)}`;
  document.getElementById("goal-fill").style.width = pct + "%";
  document.getElementById("goal-pct-label").textContent =
    `${rupiah(goal.current)} terkumpul dari ${rupiah(goal.target)} — ${Math.round(pct)}%`;

  // isi ulang form dengan nilai terakhir supaya mudah diedit
  document.getElementById("goal-name").value = goal.name;
  document.getElementById("goal-target").value = goal.target;
  document.getElementById("goal-current").value = goal.current;
}

/* ---------------------------------------------------------
   GRAFIK KEUANGAN
   --------------------------------------------------------- */
function drawChart(canvasId, type, data, extraOptions = {}) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { family: "Plus Jakarta Sans" } } } },
      scales: type === "pie" ? {} : {
        y: { beginAtZero: true, ticks: { font: { family: "Space Mono", size: 10 } } },
        x: { ticks: { font: { family: "Plus Jakarta Sans", size: 11 } } },
      },
      ...extraOptions,
    },
  });
}

function lastSixMonthKeys() {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function renderAllCharts() {
  const tx = DB.getTransactions(session.email);
  const keys = lastSixMonthKeys();
  const labels = keys.map((k) => {
    const [y, m] = k.split("-");
    return MONTH_NAMES[Number(m) - 1].slice(0, 3) + " " + y.slice(2);
  });

  const incomeByMonth = keys.map((k) =>
    tx.filter((t) => t.type === "income" && monthKey(t.date) === k).reduce((s, t) => s + t.amount, 0)
  );
  const expenseByMonth = keys.map((k) =>
    tx.filter((t) => t.type === "expense" && monthKey(t.date) === k).reduce((s, t) => s + t.amount, 0)
  );
  const balanceTrend = [];
  incomeByMonth.forEach((v, i) => {
    const prev = i === 0 ? 0 : balanceTrend[i - 1];
    balanceTrend.push(prev + v - expenseByMonth[i]);
  });

  drawChart("chart-income-month", "line", {
    labels,
    datasets: [{ label: "Pemasukan", data: incomeByMonth, borderColor: "#2f8f5b", backgroundColor: "rgba(47,143,91,0.12)", tension: 0.35, fill: true }],
  });

  drawChart("chart-expense-month", "line", {
    labels,
    datasets: [{ label: "Pengeluaran", data: expenseByMonth, borderColor: "#c65a3d", backgroundColor: "rgba(198,90,61,0.12)", tension: 0.35, fill: true }],
  });

  drawChart("chart-compare", "bar", {
    labels,
    datasets: [
      { label: "Pemasukan", data: incomeByMonth, backgroundColor: "#2f8f5b", borderRadius: 5, maxBarThickness: 26 },
      { label: "Pengeluaran", data: expenseByMonth, backgroundColor: "#c65a3d", borderRadius: 5, maxBarThickness: 26 },
    ],
  });

  drawChart("chart-balance-trend", "line", {
    labels,
    datasets: [{ label: "Saldo kumulatif", data: balanceTrend, borderColor: "#c8912f", backgroundColor: "rgba(200,145,47,0.12)", tension: 0.3, fill: true }],
  });

  // kategori pengeluaran (semua waktu)
  const catTotals = {};
  tx.filter((t) => t.type === "expense").forEach((t) => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const catLabels = Object.keys(catTotals);
  const palette = ["#c65a3d", "#c8912f", "#17423d", "#4d8f7a", "#a56b3f", "#7a6a53", "#9c4a3a", "#3f6b5a"];
  drawChart("chart-category", "pie", {
    labels: catLabels.length ? catLabels : ["Belum ada data"],
    datasets: [{
      data: catLabels.length ? catLabels.map((c) => catTotals[c]) : [1],
      backgroundColor: catLabels.length ? palette : ["#e4dabf"],
    }],
  }, { scales: {} });
}

/* ---------------------------------------------------------
   LAPORAN BULANAN
   --------------------------------------------------------- */
document.getElementById("btn-report-view").addEventListener("click", renderReport);

function renderReport() {
  const val = document.getElementById("report-month").value; // "YYYY-MM"
  if (!val) return;
  const [y, m] = val.split("-");
  const tx = DB.getTransactions(session.email).filter((t) => monthKey(t.date) === val);
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const remaining = income - expense;
  const percent = income > 0 ? Math.max(0, Math.round((remaining / income) * 100)) : 0;

  document.getElementById("report-title").textContent = `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  document.getElementById("r-income").textContent = rupiah(income);
  document.getElementById("r-expense").textContent = rupiah(expense);
  document.getElementById("r-remaining").textContent = rupiah(remaining);
  document.getElementById("r-percent").textContent = percent + "%";
}

document.getElementById("btn-report-pdf").addEventListener("click", () => {
  const val = document.getElementById("report-month").value;
  if (!val) {
    alert("Pilih bulan terlebih dahulu.");
    return;
  }
  renderReport();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const [y, m] = val.split("-");
  const title = `Laporan Keuangan — ${MONTH_NAMES[Number(m) - 1]} ${y}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 20, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Nama: ${session.name}`, 20, 36);
  doc.text(`Email: ${session.email}`, 20, 43);

  doc.setDrawColor(200);
  doc.line(20, 50, 190, 50);

  const rows = [
    ["Pemasukan", document.getElementById("r-income").textContent],
    ["Pengeluaran", document.getElementById("r-expense").textContent],
    ["Sisa", document.getElementById("r-remaining").textContent],
    ["Persentase menabung", document.getElementById("r-percent").textContent],
  ];
  let y2 = 62;
  rows.forEach(([label, value]) => {
    doc.text(label, 20, y2);
    doc.text(value, 150, y2);
    y2 += 10;
  });

  doc.line(20, y2, 190, y2);
  y2 += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Rincian transaksi", 20, y2);
  y2 += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const tx = DB.getTransactions(session.email)
    .filter((t) => monthKey(t.date) === val)
    .sort((a, b) => a.date.localeCompare(b.date));

  tx.forEach((t) => {
    if (y2 > 275) { doc.addPage(); y2 = 20; }
    const line = `${t.date}  ${t.type === "income" ? "+" : "-"}${rupiah(t.amount)}  ${t.category}${t.note ? " — " + t.note : ""}`;
    doc.text(line, 20, y2);
    y2 += 6;
  });

  doc.save(`laporan-${val}.pdf`);
});

/* ---------------------------------------------------------
   NOTIFIKASI
   --------------------------------------------------------- */
function buildNotices() {
  const notices = [];
  const tx = DB.getTransactions(session.email);
  const today = todayStr();
  const todayExpense = tx.filter((t) => t.type === "expense" && t.date === today).reduce((s, t) => s + t.amount, 0);
  const DAILY_LIMIT = 100000; // batas contoh — bisa disesuaikan pengguna nantinya

  if (todayExpense > DAILY_LIMIT) {
    notices.push({
      type: "warn",
      icon: "!",
      title: "Pengeluaran hari ini sudah melebihi batas",
      text: `Total pengeluaran hari ini ${rupiah(todayExpense)}, melewati batas harian ${rupiah(DAILY_LIMIT)}.`,
    });
  }

  const hasIncomeThisMonth = tx.some((t) => t.type === "income" && monthKey(t.date) === today.slice(0, 7));
  if (!hasIncomeThisMonth) {
    notices.push({
      type: "info",
      icon: "i",
      title: "Jangan lupa mencatat pemasukan",
      text: "Belum ada pemasukan tercatat bulan ini. Catat supaya laporan lebih akurat.",
    });
  }

  const goal = DB.getGoal(session.email);
  if (goal && goal.target > 0) {
    const pct = (goal.current / goal.target) * 100;
    if (pct >= 90 && pct < 100) {
      notices.push({
        type: "ok",
        icon: "✓",
        title: "Target tabungan hampir tercapai",
        text: `Target "${goal.name}" sudah ${Math.round(pct)}% tercapai. Sedikit lagi!`,
      });
    } else if (pct >= 100) {
      notices.push({
        type: "ok",
        icon: "✓",
        title: "Target tabungan tercapai",
        text: `Selamat! Target "${goal.name}" sudah tercapai sepenuhnya.`,
      });
    }
  }

  if (notices.length === 0) {
    notices.push({
      type: "ok",
      icon: "✓",
      title: "Semua terlihat aman",
      text: "Tidak ada pengingat khusus untuk saat ini.",
    });
  }
  return notices;
}

function renderNotices() {
  const notices = buildNotices();
  const box = document.getElementById("notice-list");
  box.innerHTML = "";
  notices.forEach((n) => {
    const el = document.createElement("div");
    el.className = "notice-item " + n.type;
    el.innerHTML = `<div class="ic">${n.icon}</div><div class="txt"><strong>${n.title}</strong><span>${n.text}</span></div>`;
    box.appendChild(el);
  });
  updateNoticeDot(notices);
}

function updateNoticeDot(notices) {
  const dot = document.getElementById("notice-dot");
  const hasWarn = (notices || buildNotices()).some((n) => n.type === "warn");
  dot.style.display = hasWarn ? "inline-block" : "none";
}

/* ---------------------------------------------------------
   INISIALISASI HALAMAN
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("user-name").textContent = session.name;
  document.getElementById("user-email").textContent = session.email;
  document.getElementById("user-avatar").textContent = session.name.charAt(0).toUpperCase();

  document.getElementById("page-date").textContent =
    new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  document.getElementById("income-date").value = todayStr();
  document.getElementById("expense-date").value = todayStr();
  document.getElementById("report-month").value = todayStr().slice(0, 7);

  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => goToView(btn.dataset.view));
  });

  document.getElementById("nav-toggle").addEventListener("click", () => {
    document.getElementById("app-shell").classList.toggle("nav-open");
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    DB.logout();
    window.location.href = "index.html";
  });

  renderDashboard();
  updateNoticeDot();
});

/* ============================================================
   storage.js — Lapisan data sederhana berbasis localStorage
   Semua data disimpan di browser (tidak butuh server/database).
   Cocok untuk belajar & prototipe. Untuk versi produksi,
   ganti fungsi-fungsi ini dengan pemanggilan API ke backend.
   ============================================================ */

const DB_KEYS = {
  USERS: "kw_users",
  SESSION: "kw_session",
  TRANSACTIONS: "kw_transactions_",   // + email user
  GOAL: "kw_goal_",                   // + email user
  NOTICES_READ: "kw_notice_read_",    // + email user
};

const DB = {
  // ---------- helpers umum ----------
  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error("Gagal membaca storage:", key, e);
      return fallback;
    }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ---------- USERS ----------
  getUsers() {
    return this._get(DB_KEYS.USERS, []);
  },
  saveUsers(users) {
    this._set(DB_KEYS.USERS, users);
  },
  findUser(email) {
    return this.getUsers().find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
  },
  createUser({ name, email, password }) {
    const users = this.getUsers();
    if (this.findUser(email)) {
      throw new Error("Email sudah terdaftar. Silakan login.");
    }
    const user = { name, email, password, createdAt: Date.now() };
    users.push(user);
    this.saveUsers(users);
    return user;
  },
  updatePassword(email, newPassword) {
    const users = this.getUsers();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (idx === -1) throw new Error("Akun tidak ditemukan.");
    users[idx].password = newPassword;
    this.saveUsers(users);
  },

  // ---------- SESSION ----------
  login(email, password) {
    const user = this.findUser(email);
    if (!user || user.password !== password) {
      throw new Error("Email atau kata sandi salah.");
    }
    this._set(DB_KEYS.SESSION, { email: user.email, name: user.name });
    return user;
  },
  logout() {
    localStorage.removeItem(DB_KEYS.SESSION);
  },
  getSession() {
    return this._get(DB_KEYS.SESSION, null);
  },
  requireSession() {
    const s = this.getSession();
    if (!s) {
      window.location.href = "index.html";
    }
    return s;
  },

  // ---------- TRANSAKSI (pemasukan & pengeluaran) ----------
  _txKey(email) {
    return DB_KEYS.TRANSACTIONS + email.toLowerCase();
  },
  getTransactions(email) {
    return this._get(this._txKey(email), []);
  },
  addTransaction(email, tx) {
    const list = this.getTransactions(email);
    const entry = {
      id: "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      type: tx.type, // "income" | "expense"
      amount: Number(tx.amount),
      date: tx.date, // "YYYY-MM-DD"
      category: tx.category,
      note: tx.note || "",
      createdAt: Date.now(),
    };
    list.push(entry);
    this._set(this._txKey(email), list);
    return entry;
  },
  deleteTransaction(email, id) {
    const list = this.getTransactions(email).filter((t) => t.id !== id);
    this._set(this._txKey(email), list);
  },

  // ---------- TARGET TABUNGAN ----------
  _goalKey(email) {
    return DB_KEYS.GOAL + email.toLowerCase();
  },
  getGoal(email) {
    return this._get(this._goalKey(email), null);
  },
  setGoal(email, goal) {
    // goal = { name, target, current }
    this._set(this._goalKey(email), {
      name: goal.name,
      target: Number(goal.target),
      current: Number(goal.current) || 0,
      updatedAt: Date.now(),
    });
  },
  addToGoal(email, amount) {
    const goal = this.getGoal(email);
    if (!goal) return null;
    goal.current = Math.max(0, Number(goal.current) + Number(amount));
    this._set(this._goalKey(email), goal);
    return goal;
  },
};

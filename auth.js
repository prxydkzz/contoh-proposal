/* auth.js — logika halaman login, daftar, dan lupa kata sandi */

function showTab(tabName) {
  document.querySelectorAll(".auth-panel").forEach((el) => el.classList.remove("is-active"));
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("is-active"));
  document.getElementById("panel-" + tabName).classList.add("is-active");
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("is-active");
  clearAlerts();
}

function clearAlerts() {
  document.querySelectorAll(".alert").forEach((el) => (el.style.display = "none"));
}

function showAlert(panelId, message, type = "error") {
  const alertBox = document.querySelector(`#panel-${panelId} .alert`);
  alertBox.textContent = message;
  alertBox.className = `alert alert--${type}`;
  alertBox.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  // Kalau sudah login, langsung lempar ke dashboard
  if (DB.getSession()) {
    window.location.href = "dashboard.html";
    return;
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });

  // ---- LOGIN ----
  document.getElementById("form-login").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      DB.login(email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert("login", err.message);
    }
  });

  // ---- DAFTAR ----
  document.getElementById("form-register").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    if (password.length < 6) {
      showAlert("register", "Kata sandi minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      showAlert("register", "Konfirmasi kata sandi tidak cocok.");
      return;
    }
    try {
      DB.createUser({ name, email, password });
      showAlert("register", "Akun berhasil dibuat. Silakan masuk.", "success");
      setTimeout(() => {
        showTab("login");
        document.getElementById("login-email").value = email;
      }, 900);
    } catch (err) {
      showAlert("register", err.message);
    }
  });

  // ---- LUPA PASSWORD ----
  document.getElementById("form-forgot").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();
    const newPassword = document.getElementById("forgot-new").value;

    if (!DB.findUser(email)) {
      showAlert("forgot", "Email tidak terdaftar.");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("forgot", "Kata sandi baru minimal 6 karakter.");
      return;
    }
    DB.updatePassword(email, newPassword);
    showAlert("forgot", "Kata sandi berhasil diganti. Silakan masuk.", "success");
    setTimeout(() => {
      showTab("login");
      document.getElementById("login-email").value = email;
    }, 900);
  });
});

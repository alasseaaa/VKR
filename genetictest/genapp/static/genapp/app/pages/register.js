function renderShell(pageEl, innerHtml) {
  pageEl.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-lg-6">
        <div class="card shadow-sm">
          ${innerHtml}
        </div>
      </div>
    </div>
  `;
}

export async function render(pageEl, { api, showAlert }) {
  renderShell(
    pageEl,
    `
    <div class="card-header bg-white">
      <h5 class="mb-0">Регистрация</h5>
      <div class="text-muted small">Создайте учетную запись пациента</div>
    </div>
    <div class="card-body">
      <form id="register-form">
        <div class="mb-3">
          <label class="form-label">Имя пользователя</label>
          <input name="username" type="text" class="form-control" required />
        </div>
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input name="email" type="email" class="form-control" required />
        </div>
        <div class="row g-2">
          <div class="col-md-6 mb-3">
            <label class="form-label">Имя</label>
            <input name="first_name" type="text" class="form-control" required />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">Фамилия</label>
            <input name="last_name" type="text" class="form-control" required />
          </div>
        </div>
        <div class="row g-2">
          <div class="col-md-6 mb-3">
            <label class="form-label">Пароль</label>
            <input name="password1" type="password" class="form-control" required />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">Повтор пароля</label>
            <input name="password2" type="password" class="form-control" required />
          </div>
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" type="submit">Создать аккаунт</button>
          <a class="btn btn-outline-secondary" href="#/login">Назад</a>
        </div>
      </form>
    </div>
  `,
  );

  const form = pageEl.querySelector("#register-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await api.auth.register(payload);
      window.location.hash = "#/login";
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}


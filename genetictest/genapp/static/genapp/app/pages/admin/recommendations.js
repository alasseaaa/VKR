function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка рекомендаций...</div></div>`;

  let recs = await api.admin.listRecommendations();
  recs = Array.isArray(recs) ? recs : [];

  const refresh = async () => render(pageEl, { api, showAlert });

  pageEl.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h3 class="mb-0">Управление рекомендациями</h3>
      <a class="btn btn-outline-secondary btn-sm" href="#/admin/genes">Назад</a>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold">Добавить рекомендацию</div>
      <div class="card-body">
        <form id="create-form" class="row g-2 align-items-end">
          <div class="col-md-6">
            <label class="form-label small">title</label>
            <input name="title" class="form-control" required />
          </div>
          <div class="col-md-3">
            <label class="form-label small">category</label>
            <input name="category" class="form-control" placeholder="vitamins/sport/nutrition/general" required />
          </div>
          <div class="col-md-3">
            <button class="btn btn-primary w-100" type="submit">
              <i class="bi bi-plus-circle me-1"></i>Создать
            </button>
          </div>
          <div class="col-12">
            <label class="form-label small">description</label>
            <textarea name="description" class="form-control" rows="3" required></textarea>
          </div>
        </form>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header bg-white fw-semibold">Список рекомендаций</div>
      <div class="card-body p-0">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Заголовок</th>
              <th>Категория</th>
              <th class="text-end">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${
              recs.length
                ? recs
                    .map(
                      (r) => `
                <tr>
                  <td class="text-muted">${r.id}</td>
                  <td>
                    <div class="fw-semibold">${escapeHtml(r.title || "")}</div>
                    <div class="text-muted small" style="max-width: 520px;">${escapeHtml(r.description || "").slice(0, 110)}${r.description && r.description.length > 110 ? "..." : ""}</div>
                  </td>
                  <td>${escapeHtml(r.category || "")}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${r.id}">Изменить</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${r.id}">Удалить</button>
                  </td>
                </tr>
              `,
                    )
                    .join("")
                : `<tr><td colspan="4" class="text-center text-muted py-4">Пока нет данных</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div id="edit-modal" class="modal" tabindex="-1" style="display:none">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Редактирование рекомендации</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <form id="edit-form" class="row g-2">
              <input type="hidden" name="id" />
              <div class="col-12">
                <label class="form-label small">title</label>
                <input name="title" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label small">category</label>
                <input name="category" class="form-control" required />
              </div>
              <div class="col-md-6">
                <div class="text-muted small mt-4">Категория берётся как строка</div>
              </div>
              <div class="col-12">
                <label class="form-label small">description</label>
                <textarea name="description" class="form-control" rows="3" required></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" form="edit-form" type="submit">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const createForm = pageEl.querySelector("#create-form");
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(createForm).entries());
      await api.admin.createRecommendation(payload);
      showAlert("success", "Создано");
      await refresh();
    } catch (err) {
      showAlert("danger", err.message);
    }
  });

  const modalEl = pageEl.querySelector("#edit-modal");
  const editModal = new bootstrap.Modal(modalEl, {});

  pageEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === "delete") {
      if (!confirm("Удалить рекомендацию?")) return;
      try {
        await api.admin.deleteRecommendation(id);
        showAlert("success", "Удалено");
        await refresh();
      } catch (err) {
        showAlert("danger", err.message);
      }
      return;
    }

    if (action === "edit") {
      const r = recs.find((x) => Number(x.id) === id);
      if (!r) return;
      const form = modalEl.querySelector("#edit-form");
      form.querySelector('input[name="id"]').value = String(r.id);
      form.querySelector('input[name="title"]').value = r.title || "";
      form.querySelector('input[name="category"]').value = r.category || "";
      form.querySelector('textarea[name="description"]').value = r.description || "";
      editModal.show();
    }
  });

  const editForm = modalEl.querySelector("#edit-form");
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(editForm).entries());
      const id = Number(payload.id);
      delete payload.id;
      await api.admin.updateRecommendation(id, payload);
      editModal.hide();
      showAlert("success", "Сохранено");
      await refresh();
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}


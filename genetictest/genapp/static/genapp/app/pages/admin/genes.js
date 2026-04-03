function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function geneRow(g) {
  return `
    <tr>
      <td class="text-muted">${g.id}</td>
      <td><div class="fw-semibold">${escapeHtml(g.symbol)}</div></td>
      <td>${escapeHtml(g.category || "")}</td>
      <td style="max-width: 260px;">${escapeHtml(g.full_name || "")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${g.id}">Изменить</button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${g.id}">Удалить</button>
      </td>
    </tr>
  `;
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка генов...</div></div>`;

  let genes = await api.admin.listGenes();
  if (!Array.isArray(genes)) genes = [];

  const refresh = async () => {
    genes = await api.admin.listGenes();
    if (!Array.isArray(genes)) genes = [];
    await render(pageEl, { api, showAlert });
  };

  pageEl.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h3 class="mb-0">Управление генами</h3>
      <a class="btn btn-outline-secondary btn-sm" href="#/admin/gene-variants">К вариантам</a>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold">Добавить ген</div>
      <div class="card-body">
        <form id="create-form" class="row g-2">
          <div class="col-md-4">
            <label class="form-label small">symbol</label>
            <input name="symbol" class="form-control" required />
          </div>
          <div class="col-md-4">
            <label class="form-label small">category</label>
            <input name="category" class="form-control" placeholder="metabolism/vitamins/sport/nutrition" required />
          </div>
          <div class="col-md-4">
            <label class="form-label small">rs_id</label>
            <input name="rs_id" class="form-control" placeholder="например rs123" />
          </div>
          <div class="col-md-6">
            <label class="form-label small">full_name</label>
            <input name="full_name" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label small">effect_description</label>
            <input name="effect_description" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label small">description</label>
            <textarea name="description" class="form-control" rows="3"></textarea>
          </div>
          <div class="col-12">
            <button class="btn btn-primary" type="submit">
              <i class="bi bi-plus-circle me-1"></i>Создать
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header bg-white fw-semibold">Список генов</div>
      <div class="card-body p-0">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Символ</th>
              <th>Категория</th>
              <th>Полное название</th>
              <th class="text-end">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${genes.length ? genes.map(geneRow).join("") : `<tr><td colspan="5" class="text-center text-muted py-4">Пока нет генов</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div id="edit-modal" class="modal" tabindex="-1" style="display:none">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Редактирование гена</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <form id="edit-form" class="row g-2">
              <input type="hidden" name="id" />
              <div class="col-md-6">
                <label class="form-label small">symbol</label>
                <input name="symbol" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label small">category</label>
                <input name="category" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label small">rs_id</label>
                <input name="rs_id" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label small">full_name</label>
                <input name="full_name" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label small">effect_description</label>
                <input name="effect_description" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label small">description</label>
                <textarea name="description" class="form-control" rows="3"></textarea>
              </div>
              <div class="col-12">
                <div class="text-muted small">ID генотипа редактируется через symbol/category/описания.</div>
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

  // create
  const createForm = pageEl.querySelector("#create-form");
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(createForm).entries());
      await api.admin.createGene(payload);
      showAlert("success", "Ген создан");
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
      if (!confirm("Удалить ген?")) return;
      try {
        await api.admin.deleteGene(id);
        showAlert("success", "Удалено");
        await refresh();
      } catch (err) {
        showAlert("danger", err.message);
      }
      return;
    }

    if (action === "edit") {
      const g = genes.find((x) => Number(x.id) === id);
      if (!g) return;
      const form = modalEl.querySelector("#edit-form");
      form.querySelector('input[name="id"]').value = String(g.id);
      form.querySelector('input[name="symbol"]').value = g.symbol || "";
      form.querySelector('input[name="category"]').value = g.category || "";
      form.querySelector('input[name="rs_id"]').value = g.rs_id || "";
      form.querySelector('input[name="full_name"]').value = g.full_name || "";
      form.querySelector('input[name="effect_description"]').value = g.effect_description || "";
      form.querySelector('textarea[name="description"]').value = g.description || "";
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
      await api.admin.updateGene(id, payload);
      editModal.hide();
      showAlert("success", "Сохранено");
      await refresh();
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}


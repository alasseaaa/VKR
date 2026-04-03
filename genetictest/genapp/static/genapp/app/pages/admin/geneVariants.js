function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка вариантов генов...</div></div>`;

  let [variants, genes] = await Promise.all([api.admin.listGeneVariants(), api.admin.listGenes()]);
  variants = Array.isArray(variants) ? variants : [];
  genes = Array.isArray(genes) ? genes : [];

  const geneOptions = genes.map((g) => `<option value="${g.id}">${escapeHtml(g.symbol)}${g.full_name ? ` - ${escapeHtml(g.full_name)}` : ""}</option>`).join("");

  const refresh = async () => {
    await render(pageEl, { api, showAlert });
  };

  pageEl.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-2">
      <h3 class="mb-0">Варианты генов</h3>
      <a class="btn btn-outline-secondary btn-sm" href="#/admin/genes">К генам</a>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold">Добавить вариант</div>
      <div class="card-body">
        <form id="create-form" class="row g-2 align-items-end">
          <div class="col-md-6">
            <label class="form-label small">gene</label>
            <select name="gene" class="form-select" required>${geneOptions || ""}</select>
          </div>
          <div class="col-md-3">
            <label class="form-label small">genotype</label>
            <input name="genotype" class="form-control" required placeholder="AA/AG/GG" />
          </div>
          <div class="col-md-3">
            <label class="form-label small">risk_type</label>
            <select name="risk_type" class="form-select">
              <option value="" selected>—</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div class="col-12">
            <label class="form-label small">variant_description</label>
            <textarea name="variant_description" class="form-control" rows="3"></textarea>
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
      <div class="card-header bg-white fw-semibold">Список вариантов</div>
      <div class="card-body p-0">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Ген</th>
              <th>Генотип</th>
              <th>Риск</th>
              <th>Описание</th>
              <th class="text-end">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${
              variants.length
                ? variants
                    .map(
                      (v) => `
                <tr>
                  <td class="text-muted">${v.id}</td>
                  <td>${escapeHtml(v.gene_symbol || "")}</td>
                  <td><span class="fw-semibold">${escapeHtml(v.genotype || "")}</span></td>
                  <td>${escapeHtml(v.risk_type || "")}</td>
                  <td style="max-width: 380px;">${escapeHtml(v.variant_description || "")}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${v.id}">Изменить</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${v.id}">Удалить</button>
                  </td>
                </tr>
              `,
                    )
                    .join("")
                : `<tr><td colspan="6" class="text-center text-muted py-4">Пока нет данных</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <div id="edit-modal" class="modal" tabindex="-1" style="display:none">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Редактирование варианта</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <form id="edit-form" class="row g-2">
              <input type="hidden" name="id" />
              <div class="col-12">
                <label class="form-label small">gene</label>
                <select name="gene" class="form-select" required>${geneOptions || ""}</select>
              </div>
              <div class="col-6">
                <label class="form-label small">genotype</label>
                <input name="genotype" class="form-control" required />
              </div>
              <div class="col-6">
                <label class="form-label small">risk_type</label>
                <select name="risk_type" class="form-select">
                  <option value="">—</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label small">variant_description</label>
                <textarea name="variant_description" class="form-control" rows="3"></textarea>
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
      payload.gene = Number(payload.gene);
      if (payload.risk_type === "") payload.risk_type = null;
      await api.admin.createGeneVariant(payload);
      showAlert("success", "Вариант создан");
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
      if (!confirm("Удалить вариант?")) return;
      try {
        await api.admin.deleteGeneVariant(id);
        showAlert("success", "Удалено");
        await refresh();
      } catch (err) {
        showAlert("danger", err.message);
      }
    }
    if (action === "edit") {
      const v = variants.find((x) => Number(x.id) === id);
      if (!v) return;
      const form = modalEl.querySelector("#edit-form");
      form.querySelector('input[name="id"]').value = String(v.id);
      form.querySelector('select[name="gene"]').value = String(v.gene);
      form.querySelector('input[name="genotype"]').value = v.genotype || "";
      form.querySelector('select[name="risk_type"]').value = v.risk_type || "";
      form.querySelector('textarea[name="variant_description"]').value = v.variant_description || "";
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
      payload.gene = Number(payload.gene);
      if (payload.risk_type === "") payload.risk_type = null;
      await api.admin.updateGeneVariant(id, payload);
      editModal.hide();
      showAlert("success", "Сохранено");
      await refresh();
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}


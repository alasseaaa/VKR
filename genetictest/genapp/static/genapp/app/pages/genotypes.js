import { getWithoutGeneticTestFlag } from "../services/wellness.js";

const PENDING_STORAGE_KEY = "genapp_genotypes_pending";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function riskLabel(r) {
  const m = { low: "Низкий", medium: "Средний", high: "Высокий" };
  return m[r] || r || "—";
}

/** В списке и поиске используем только символ гена. */
function geneOptionLabel(g) {
  return (g.symbol || "").trim() || `Ген #${g.id}`;
}

function filterGenesBySymbol(genes, q) {
  if (!q?.trim()) return genes;
  const n = q.trim().toLowerCase();
  return genes.filter((g) => String(g.symbol || "").toLowerCase().includes(n));
}

function geneOptionsHtml(genes, emptyLabel) {
  const head = `<option value="">${emptyLabel}</option>`;
  if (!genes?.length) {
    return `${head}<option value="" disabled>Ничего не найдено</option>`;
  }
  return (
    head +
    genes.map((g) => `<option value="${g.id}">${escapeHtml(geneOptionLabel(g))}</option>`).join("")
  );
}

function variantOptionsHtml(variants) {
  if (!variants?.length) {
    return '<option value="">Нет вариантов для этого гена</option>';
  }
  return (
    '<option value="">Выберите вариант…</option>' +
    variants
      .map((v) => {
        const rt = riskLabel(v.risk_type);
        const line = v.genotype ? `${v.genotype} — ${rt}` : rt;
        return `<option value="${v.id}">${escapeHtml(line)}</option>`;
      })
      .join("")
  );
}

function fillGeneSelect(selectEl, genes, { preserveId, emptyLabel } = {}) {
  const prev = preserveId != null ? String(preserveId) : selectEl.value;
  selectEl.innerHTML = geneOptionsHtml(genes, emptyLabel);
  if (prev && genes.some((g) => String(g.id) === prev)) {
    selectEl.value = prev;
  } else {
    selectEl.value = "";
  }
}

async function loadVariantsForGene(api, geneId) {
  if (!geneId) return [];
  const data = await api.patient.listGeneVariantCatalog({ gene: geneId });
  return Array.isArray(data) ? data : [];
}

function wireGeneSearch({ searchInput, geneSelect, allGenes, onGeneCleared, emptyLabel }) {
  const applyFilter = () => {
    const filtered = filterGenesBySymbol(allGenes, searchInput.value);
    const hadGene = geneSelect.value;
    fillGeneSelect(geneSelect, filtered, { preserveId: hadGene, emptyLabel });
    if (!geneSelect.value && hadGene) {
      onGeneCleared?.();
    }
  };
  searchInput.addEventListener("input", applyFilter);
  return applyFilter;
}

function readPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writePending(items) {
  sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(items));
}

function variantLineFromSelect(optionEl) {
  if (!optionEl || !optionEl.value) return "";
  return optionEl.textContent?.trim() || "";
}

export async function render(pageEl, { api, showAlert }) {
  if (pageEl._genotypesClickHandler) {
    pageEl.removeEventListener("click", pageEl._genotypesClickHandler);
    pageEl._genotypesClickHandler = null;
  }

  pageEl.innerHTML = `<div class="card app-card"><div class="card-body">Загрузка…</div></div>`;

  let genes = [];
  try {
    genes = await api.patient.listGeneCatalog();
    if (!Array.isArray(genes)) genes = [];
  } catch (e) {
    showAlert("danger", e.message);
  }

  genes.sort((a, b) => String(a.symbol || "").localeCompare(String(b.symbol || ""), "ru"));

  const load = async () => {
    const data = await api.patient.listGenotypes();
    return Array.isArray(data) ? data : [];
  };

  let genotypes = await load();
  let pending = readPending();

  const refresh = async () => {
    genotypes = await load();
    pending = readPending();
    await render(pageEl, { api, showAlert });
  };

  const geneEmpty = "Выберите ген…";

  const pendingRowsHtml = () =>
    pending.length
      ? pending
          .map(
            (p, idx) => `
        <tr>
          <td>${escapeHtml(p.gene_symbol || "")}</td>
          <td>${escapeHtml(p.line || "")}</td>
          <td class="text-end">
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-pending" data-index="${idx}">
              Убрать
            </button>
          </td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" class="text-center text-muted py-3">Добавьте варианты кнопкой «В список»</td></tr>`;

  const wellnessBanner = getWithoutGeneticTestFlag()
    ? `<div class="alert alert-info border-0 bg-info bg-opacity-10 small mb-3">У вас включён режим «без генетического теста». Раздел доступен по прямой ссылке; чтобы скрыть его в меню снова, снимите галочку в <a href="#/profile">профиле</a>.</div>`
    : "";

  pageEl.innerHTML = `
    <div class="app-page">
    ${wellnessBanner}
    <div class="app-page-header d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <h1 class="app-page-title h3 mb-0">Генетические данные</h1>
      <a class="btn btn-outline-secondary btn-sm" href="#/passport">Открыть паспорт</a>
    </div>

    <div class="card app-card shadow-sm mb-3">
      <div class="card-header bg-white">
        <div class="fw-semibold">Добавить варианты</div>
        <div class="text-muted small">Ищите ген по <strong>символу</strong>, выберите вариант, нажмите «В список». Когда всё готово — «Сохранить и открыть паспорт».</div>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-5">
            <label class="form-label small mb-1">Ген (символ)</label>
            <input type="search" id="create-gene-search" class="form-control form-control-sm mb-2" placeholder="Например: MTHFR" autocomplete="off" ${genes.length ? "" : "disabled"} />
            <select id="create-gene-select" class="form-select" ${genes.length ? "" : "disabled"}>${geneOptionsHtml(genes, geneEmpty)}</select>
          </div>
          <div class="col-lg-4">
            <label class="form-label small mb-1">Вариант гена</label>
            <select id="create-variant-select" class="form-select" disabled>
              <option value="">Сначала выберите ген</option>
            </select>
          </div>
          <div class="col-lg-3">
            <button type="button" class="btn btn-outline-primary w-100 mb-2" id="btn-add-pending" disabled>
              <i class="bi bi-plus-lg me-1"></i>В список
            </button>
          </div>
        </div>

        <div class="table-responsive border rounded mt-3">
          <table class="table table-sm mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Ген</th>
                <th>Вариант</th>
                <th class="text-end">Очередь</th>
              </tr>
            </thead>
            <tbody id="pending-tbody">
              ${pendingRowsHtml()}
            </tbody>
          </table>
        </div>
        <div class="d-grid gap-2 mt-3">
          <button type="button" class="btn btn-primary btn-lg" id="btn-save-passport" ${pending.length ? "" : "disabled"}>
            <i class="bi bi-check2-circle me-2"></i>Сохранить и открыть паспорт
          </button>
        </div>
      </div>
    </div>

    <div class="card app-card shadow-sm">
      <div class="card-header bg-white">
        <div class="fw-semibold">Уже сохранённые генотипы</div>
      </div>
      <div class="card-body p-0">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Ген</th>
              <th>Вариант</th>
              <th>Риск</th>
              <th>Добавлен</th>
              <th class="text-end">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${
              genotypes.length
                ? genotypes
                    .map(
                      (g) => `
                <tr>
                  <td class="text-muted">${g.id}</td>
                  <td>${escapeHtml(g.gene_symbol || "")}</td>
                  <td>${escapeHtml(g.variant_genotype || "")}</td>
                  <td>${escapeHtml(g.risk_type ? riskLabel(g.risk_type) : "")}</td>
                  <td>${escapeHtml(g.created_at ? String(g.created_at).slice(0, 10) : "")}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${g.id}">Изменить</button>
                    <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${g.id}">Удалить</button>
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
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Редактирование</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <form id="edit-form">
              <input type="hidden" name="id" />
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small mb-1">Ген (символ)</label>
                  <input type="search" id="edit-gene-search" class="form-control form-control-sm mb-2" placeholder="Символ гена" autocomplete="off" />
                  <select id="edit-gene-select" class="form-select"></select>
                </div>
                <div class="col-md-6">
                  <label class="form-label small mb-1">Вариант гена</label>
                  <select name="gene_variant" id="edit-variant-select" class="form-select" disabled required>
                    <option value="">Сначала выберите ген</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" form="edit-form" type="submit" id="edit-submit" disabled>Сохранить</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  `;

  const pendingTbody = pageEl.querySelector("#pending-tbody");
  const btnSavePassport = pageEl.querySelector("#btn-save-passport");
  const btnAddPending = pageEl.querySelector("#btn-add-pending");

  const syncPendingUi = () => {
    pending = readPending();
    if (pendingTbody) pendingTbody.innerHTML = pendingRowsHtml();
    if (btnSavePassport) btnSavePassport.disabled = !pending.length;
  };

  const createGeneSearch = pageEl.querySelector("#create-gene-search");
  const createGeneSelect = pageEl.querySelector("#create-gene-select");
  const createVariantSelect = pageEl.querySelector("#create-variant-select");

  const resetCreateVariant = () => {
    createVariantSelect.innerHTML = '<option value="">Сначала выберите ген</option>';
    createVariantSelect.disabled = true;
    btnAddPending.disabled = true;
  };

  const syncAddPendingBtn = () => {
    btnAddPending.disabled = !createVariantSelect.value || createVariantSelect.disabled;
  };

  if (genes.length) {
    wireGeneSearch({
      searchInput: createGeneSearch,
      geneSelect: createGeneSelect,
      allGenes: genes,
      emptyLabel: geneEmpty,
      onGeneCleared: resetCreateVariant,
    });

    createGeneSelect.addEventListener("change", async () => {
      const gid = createGeneSelect.value;
      if (!gid) {
        resetCreateVariant();
        return;
      }
      createVariantSelect.disabled = true;
      createVariantSelect.innerHTML = '<option value="">Загрузка…</option>';
      btnAddPending.disabled = true;
      try {
        const vars = await loadVariantsForGene(api, gid);
        createVariantSelect.innerHTML = variantOptionsHtml(vars);
        createVariantSelect.disabled = !vars.length;
      } catch (err) {
        showAlert("danger", err.message);
        createVariantSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        createVariantSelect.disabled = true;
      }
      syncAddPendingBtn();
    });

    createVariantSelect.addEventListener("change", syncAddPendingBtn);
  }

  btnAddPending.addEventListener("click", () => {
    const vid = Number(createVariantSelect.value);
    if (!vid) return;

    const sym =
      genes.find((g) => String(g.id) === createGeneSelect.value)?.symbol || createGeneSelect.selectedOptions[0]?.text || "";
    const opt = createVariantSelect.selectedOptions[0];
    const line = variantLineFromSelect(opt);

    if (genotypes.some((g) => Number(g.gene_variant) === vid)) {
      showAlert("warning", "Такой вариант уже есть в сохранённых данных.");
      return;
    }
    if (pending.some((p) => Number(p.gene_variant) === vid)) {
      showAlert("warning", "Этот вариант уже в списке.");
      return;
    }

    pending.push({ gene_variant: vid, gene_symbol: sym, line });
    writePending(pending);
    syncPendingUi();
    showAlert("success", "Добавлено в список. Продолжайте или сохраните.");

    createGeneSearch.value = "";
    createGeneSelect.innerHTML = geneOptionsHtml(genes, geneEmpty);
    resetCreateVariant();
  });

  btnSavePassport.addEventListener("click", async () => {
    const queue = readPending();
    if (!queue.length) return;

    btnSavePassport.disabled = true;
    const failed = [];
    for (const p of queue) {
      try {
        await api.patient.createGenotype({ gene_variant: p.gene_variant });
      } catch (err) {
        failed.push({ ...p, error: err.message });
      }
    }

    if (failed.length === queue.length) {
      showAlert("danger", failed.map((f) => `${f.gene_symbol}: ${f.error}`).join("; "));
      btnSavePassport.disabled = false;
      return;
    }

    const remaining = failed.map((f) => ({ gene_variant: f.gene_variant, gene_symbol: f.gene_symbol, line: f.line }));
    writePending(remaining);

    if (remaining.length) {
      showAlert(
        "warning",
        `Сохранено ${queue.length - remaining.length} из ${queue.length}. Исправьте ошибки для оставшихся записей.`,
      );
      await refresh();
      return;
    }

    sessionStorage.removeItem(PENDING_STORAGE_KEY);
    showAlert("success", "Данные сохранены");
    window.location.hash = "#/passport";
  });

  const modalEl = pageEl.querySelector("#edit-modal");
  const editModal = new bootstrap.Modal(modalEl, {});
  const editGeneSearch = modalEl.querySelector("#edit-gene-search");
  const editGeneSelect = modalEl.querySelector("#edit-gene-select");
  const editVariantSelect = modalEl.querySelector("#edit-variant-select");
  const editSubmit = modalEl.querySelector("#edit-submit");

  const resetEditVariant = () => {
    editVariantSelect.innerHTML = '<option value="">Сначала выберите ген</option>';
    editVariantSelect.disabled = true;
    editSubmit.disabled = true;
  };

  const syncEditSubmit = () => {
    editSubmit.disabled = !editVariantSelect.value || editVariantSelect.disabled;
  };

  let editFilterApply = () => {};
  if (genes.length) {
    editFilterApply = wireGeneSearch({
      searchInput: editGeneSearch,
      geneSelect: editGeneSelect,
      allGenes: genes,
      emptyLabel: geneEmpty,
      onGeneCleared: resetEditVariant,
    });
    fillGeneSelect(editGeneSelect, genes, { emptyLabel: geneEmpty });

    editGeneSelect.addEventListener("change", async () => {
      const gid = editGeneSelect.value;
      if (!gid) {
        resetEditVariant();
        return;
      }
      editVariantSelect.disabled = true;
      editVariantSelect.innerHTML = '<option value="">Загрузка…</option>';
      editSubmit.disabled = true;
      try {
        const vars = await loadVariantsForGene(api, gid);
        editVariantSelect.innerHTML = variantOptionsHtml(vars);
        editVariantSelect.disabled = !vars.length;
      } catch (err) {
        showAlert("danger", err.message);
        editVariantSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
      }
      syncEditSubmit();
    });

    editVariantSelect.addEventListener("change", syncEditSubmit);
  }

  const onPageClick = async (e) => {
    const pendingBtn = e.target.closest("button[data-action='remove-pending']");
    if (pendingBtn) {
      const idx = Number(pendingBtn.dataset.index);
      pending = readPending();
      pending.splice(idx, 1);
      writePending(pending);
      syncPendingUi();
      return;
    }

    const btn = e.target.closest("button[data-action]");
    if (!btn || btn.dataset.action === "remove-pending") return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === "delete") {
      if (!confirm("Удалить генотип?")) return;
      try {
        await api.patient.deleteGenotype(id);
        showAlert("success", "Удалено");
        await refresh();
      } catch (err) {
        showAlert("danger", err.message);
      }
    }

    if (action === "edit") {
      const row = genotypes.find((x) => Number(x.id) === id);
      modalEl.querySelector('input[name="id"]').value = String(id);

      if (!genes.length) {
        showAlert("warning", "Справочник генов недоступен");
        return;
      }

      editGeneSearch.value = "";
      editFilterApply();
      const geneId = row?.gene != null ? String(row.gene) : "";
      if (geneId && genes.some((g) => String(g.id) === geneId)) {
        editGeneSelect.value = geneId;
      } else {
        editGeneSelect.value = "";
      }

      resetEditVariant();
      if (editGeneSelect.value) {
        editVariantSelect.innerHTML = '<option value="">Загрузка…</option>';
        try {
          const vars = await loadVariantsForGene(api, editGeneSelect.value);
          editVariantSelect.innerHTML = variantOptionsHtml(vars);
          editVariantSelect.disabled = !vars.length;
          if (row?.gene_variant != null) {
            editVariantSelect.value = String(row.gene_variant);
          }
        } catch (err) {
          showAlert("danger", err.message);
        }
      }
      syncEditSubmit();
      editModal.show();
    }
  };
  pageEl._genotypesClickHandler = onPageClick;
  pageEl.addEventListener("click", onPageClick);

  const editForm = pageEl.querySelector("#edit-form");
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const formData = Object.fromEntries(new FormData(editForm).entries());
      const recId = Number(formData.id);
      const vid = Number(editVariantSelect.value);
      if (!vid) return;
      await api.patient.updateGenotype(recId, { gene_variant: vid });
      editModal.hide();
      showAlert("success", "Сохранено");
      await refresh();
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}

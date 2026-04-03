function statusPill(status) {
  if (!status) return "";
  const map = {
    new: { cls: "bg-primary", label: "Новая" },
    seen: { cls: "bg-secondary", label: "Просмотрена" },
    applied: { cls: "bg-success", label: "Применена" },
    dismissed: { cls: "bg-danger", label: "Отклонена" },
  };
  const v = map[status];
  if (!v) return `<span class="badge bg-secondary">${status}</span>`;
  return `<span class="badge ${v.cls}">${v.label}</span>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filterCategories(categories, q) {
  const t = (q || "").trim().toLowerCase();
  if (!t) return categories;
  const out = {};
  for (const [key, cat] of Object.entries(categories)) {
    const recs = (cat.recommendations || []).filter((r) => {
      const blob = `${r.title || ""} ${r.description || ""} ${(r.genes || []).join(" ")}`.toLowerCase();
      return blob.includes(t);
    });
    if (recs.length) out[key] = { ...cat, recommendations: recs };
  }
  return out;
}

/** Сначала узкая категория, затем текстовый поиск. */
function applyRecommendationFilters(raw, categoryKey, q) {
  let scoped = raw;
  if (categoryKey && raw[categoryKey]) {
    scoped = { [categoryKey]: raw[categoryKey] };
  }
  return filterCategories(scoped, q);
}

function sortedCategoryEntries(categories) {
  return Object.entries(categories).sort((a, b) => {
    const la = (a[1].label || a[0]).toLowerCase();
    const lb = (b[1].label || b[0]).toLowerCase();
    return la.localeCompare(lb, "ru");
  });
}

function renderCategories(categories) {
  const entries = sortedCategoryEntries(categories);
  if (!entries.length) {
    return `<div class="alert alert-info border-0 bg-info bg-opacity-10">По заданному фильтру ничего не найдено.</div>`;
  }
  return entries
    .map(
      ([key, cat]) => `
    <section class="rec-category card app-card shadow-sm mb-4 border-start border-primary border-4">
      <div class="card-header bg-light py-2">
        <h2 class="h6 mb-0 fw-semibold">${escapeHtml(cat.label || key)}</h2>
      </div>
      <div class="card-body pt-3">
        <div class="d-flex flex-column gap-3">
          ${(cat.recommendations || [])
            .map(
              (rec) => `
            <div class="rec-item p-3 rounded-3 bg-white border">
              <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                <div>
                  <div class="fw-semibold">${escapeHtml(rec.title || "")}</div>
                  <div class="text-muted small mt-1">${rec.genes?.length ? `Маркеры: ${escapeHtml(rec.genes.join(", "))}` : ""}</div>
                </div>
                <div>${statusPill(rec.user_status)}</div>
              </div>
              <div class="small text-body-secondary" style="white-space: pre-wrap;">${escapeHtml(rec.description || "")}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `,
    )
    .join("");
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка рекомендаций...</div></div>`;

  try {
    const data = await api.patient.getRecommendations();
    const raw = data?.categories || {};

    const catOptions = sortedCategoryEntries(raw)
      .map(
        ([key, cat]) =>
          `<option value="${escapeHtml(key)}">${escapeHtml(cat.label || key)}</option>`,
      )
      .join("");

    pageEl.innerHTML = `
      <div class="app-page">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h3 class="mb-0">Рекомендации</h3>
        <a class="btn btn-outline-secondary btn-sm" href="#/dashboard">На дашборд</a>
      </div>

      <div class="card app-card shadow-sm mb-4">
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-5">
              <label class="form-label small mb-1">Категория</label>
              <select id="rec-category" class="form-select">
                <option value="">Все категории</option>
                ${catOptions}
              </select>
            </div>
            <div class="col-md-7">
              <label class="form-label small mb-1">Поиск по тексту</label>
              <input type="search" id="rec-search" class="form-control" placeholder="Заголовок, описание или ген…" autocomplete="off" />
            </div>
          </div>
        </div>
      </div>

      <div id="rec-mount"></div>
      </div>
    `;

    const mount = pageEl.querySelector("#rec-mount");
    const searchEl = pageEl.querySelector("#rec-search");
    const catEl = pageEl.querySelector("#rec-category");

    const paint = () => {
      const q = searchEl.value;
      const catKey = catEl.value;
      const filtered = applyRecommendationFilters(raw, catKey, q);
      if (!Object.keys(raw).length) {
        mount.innerHTML = `<div class="alert alert-info">Пока нет рекомендаций. Добавьте генотипы и анализы витаминов.</div>`;
        return;
      }
      mount.innerHTML = renderCategories(filtered);
    };

    paint();
    let debounce;
    searchEl.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(paint, 300);
    });
    catEl.addEventListener("change", paint);
  } catch (err) {
    showAlert("danger", err.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

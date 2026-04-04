function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function consultationTitle(c) {
  const date = c.created_at || "—";
  if (c.genetic_result_id) {
    const gene = c.gene_symbol ? `гену ${c.gene_symbol}` : "генетическому маркеру";
    return `Комментарий к ${gene} от ${date}`;
  }
  if (c.vitamin_reading_id) {
    const v = c.vitamin_name ? `анализу (${c.vitamin_name})` : "анализу витамина";
    return `Комментарий к ${v} от ${date}`;
  }
  return `Общая рекомендация от ${date}`;
}

function commentBodyHtml(c) {
  const edited = c.was_edited ? ` <span class="text-muted small">(отредактировано)</span>` : "";
  const doctor = escapeHtml(c.doctor_name || "");
  const text = escapeHtml(c.text || "");
  return `
    <div class="mt-2 p-3 rounded-3 border border-info border-opacity-50 bg-info bg-opacity-10">
      <div class="d-flex align-items-start gap-2 mb-2">
        <span class="fs-4 lh-1" aria-hidden="true">👩‍⚕️</span>
        <div class="small flex-grow-1 min-w-0">
          <span class="fw-semibold">${doctor}</span>${edited}
        </div>
      </div>
      <div class="small" style="white-space: pre-wrap;">${text}</div>
    </div>
  `;
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card app-card"><div class="card-body">Загрузка истории…</div></div>`;

  let items = [];
  try {
    const data = await api.comments.list({});
    items = Array.isArray(data) ? data : [];
  } catch (err) {
    showAlert("danger", err.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    return;
  }

  const cards = items.length
    ? items
        .map((c) => {
          const title = consultationTitle(c);
          let extra = "";
          if (c.genetic_result_id) {
            extra = `<a class="btn btn-sm btn-outline-primary mt-2" href="#/passport/genotype/${c.genetic_result_id}">К маркеру в паспорте</a>`;
          } else if (c.vitamin_reading_id) {
            extra = `<a class="btn btn-sm btn-outline-primary mt-2" href="#/vitamin-tests/focus/${c.vitamin_reading_id}">К анализу</a>`;
          } else {
            extra = `<span class="badge text-bg-secondary mt-2 d-inline-block">Общая рекомендация</span>`;
          }
          return `
          <div class="card app-card shadow-sm mb-3" id="consultation-${c.id}">
            <div class="card-body">
              <div class="fw-semibold mb-2">${escapeHtml(title)}</div>
              ${commentBodyHtml(c)}
              ${extra}
            </div>
          </div>`;
        })
        .join("")
    : `<div class="alert alert-light border text-muted">Пока нет опубликованных комментариев врача.</div>`;

  pageEl.innerHTML = `
    <div class="app-page">
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 class="mb-0">История консультаций</h3>
        <a class="btn btn-outline-secondary btn-sm" href="#/dashboard">На дашборд</a>
      </div>
      <p class="text-muted small mb-4">Опубликованные комментарии лечащего врача (новые сверху).</p>
      ${cards}
    </div>
  `;
}

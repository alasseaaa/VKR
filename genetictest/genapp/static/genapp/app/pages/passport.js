import { doctorCommentsForMarkerHtml } from "../components/doctorComment.js";

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

function textBlock(title, text) {
  const t = (text || "").trim();
  if (!t) return "";
  return `
    <div class="mb-3">
      <div class="text-muted small text-uppercase fw-semibold mb-1">${escapeHtml(title)}</div>
      <div class="small" style="white-space: pre-wrap;">${escapeHtml(t)}</div>
    </div>`;
}

export async function render(pageEl, { api, showAlert, route }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Формирование паспорта...</div></div>`;

  try {
    const [genotypes, allCommentsRaw] = await Promise.all([
      api.patient.listGenotypes(),
      api.comments.list({}).catch(() => []),
    ]);
    const list = Array.isArray(genotypes) ? genotypes : [];
    const allComments = Array.isArray(allCommentsRaw) ? allCommentsRaw : [];

    const byGenotype = new Map();
    for (const c of allComments) {
      const gid = c.genetic_result_id;
      if (gid == null) continue;
      const k = Number(gid);
      if (!byGenotype.has(k)) byGenotype.set(k, []);
      byGenotype.get(k).push(c);
    }

    const cards =
      list.length === 0
        ? `<div class="alert alert-light border text-muted">Нет сохранённых генотипов. Добавьте данные в разделе «Генетические данные».</div>`
        : list
            .map((g) => {
              const head = `${escapeHtml(g.gene_symbol || "")}${g.gene_full_name ? ` — ${escapeHtml(g.gene_full_name)}` : ""}`;
              const varLine = `${escapeHtml(g.variant_genotype || "—")} · риск: ${escapeHtml(riskLabel(g.risk_type))}`;
              const markerComments = byGenotype.get(Number(g.id)) || [];
              const doctorBlocks = doctorCommentsForMarkerHtml(
                markerComments,
                "Комментарий лечащего врача",
              );
              return `
          <div class="card app-card shadow-sm mb-3" id="passport-genotype-${g.id}">
            <div class="card-body">
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <div>
                  <h2 class="h5 mb-1 fw-semibold">${head}</h2>
                  <div class="text-muted small">Вариант: ${varLine}</div>
                </div>
              </div>
              ${textBlock("Описание гена", g.gene_description)}
              ${textBlock("Эффект / значение гена", g.gene_effect_description)}
              ${textBlock("Описание варианта", g.variant_description)}
              ${doctorBlocks}
            </div>
          </div>`;
            })
            .join("");

    pageEl.innerHTML = `
      <div class="app-page">
      <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 class="mb-0">Генетический паспорт</h3>
        <a class="btn btn-outline-secondary btn-sm" href="#/dashboard">На дашборд</a>
      </div>
      <p class="text-muted small mb-4">Только ваши маркеры из справочника: ген, вариант и текстовые описания из базы.</p>
      ${cards}
      </div>
    `;

    const focusId = route?.focusGenotypeId;
    if (focusId != null) {
      requestAnimationFrame(() => {
        document.getElementById(`passport-genotype-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  } catch (err) {
    showAlert("danger", err.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
  }
}

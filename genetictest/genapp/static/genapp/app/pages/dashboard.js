function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(status) {
  if (status === "Дефицит") return `<span class="badge bg-danger badge-status">${status}</span>`;
  if (status === "Норма") return `<span class="badge bg-success badge-status">${status}</span>`;
  if (status === "Профицит") return `<span class="badge bg-warning text-dark badge-status">${status}</span>`;
  return `<span class="badge bg-secondary badge-status">${status || "—"}</span>`;
}

function renderCards({ genotypesCount, vitaminTestsCount, deficiencyCount, normalCount, proficitCount }) {
  return `
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Генотипы</div>
            <div class="fs-4 fw-semibold">${genotypesCount}</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Анализы витаминов</div>
            <div class="fs-4 fw-semibold">${vitaminTestsCount}</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="text-muted small">Сводка по статусам</div>
            <div class="mt-2 d-flex gap-2 flex-wrap">
              <span class="badge bg-danger">${deficiencyCount} дефицит</span>
              <span class="badge bg-success">${normalCount} норма</span>
              <span class="badge bg-warning text-dark">${proficitCount} профицит</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function render(pageEl, { api, auth, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка...</div></div>`;

  const [genotypes, vitaminTests, recommendations] = await Promise.all([
    api.patient.listGenotypes(),
    api.patient.listVitaminTests(),
    api.patient.getRecommendations().catch(() => null),
  ]);

  const genotypesCount = genotypes.length || 0;
  const vitaminTestsCount = vitaminTests.length || 0;
  const deficiencyCount = vitaminTests.filter((t) => t.status === "Дефицит").length;
  const normalCount = vitaminTests.filter((t) => t.status === "Норма").length;
  const proficitCount = vitaminTests.filter((t) => t.status === "Профицит").length;

  const topRecCats = recommendations ? Object.keys(recommendations.categories || {}).length : 0;
  const recItems = recommendations
    ? Object.values(recommendations.categories || {}).reduce((n, c) => n + (c.recommendations?.length || 0), 0)
    : 0;

  let profileHint = "";
  let patientDisplay = auth.username || "";

  if (auth.role === "patient" || auth.role === "admin") {
    try {
      const p = await api.patient.getProfile();
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      patientDisplay = full || p.username || auth.username || "";
      const miss = [];
      if (!p.birth_date) miss.push("дата рождения");
      if (!p.gender) miss.push("пол");
      if (!p.height) miss.push("рост");
      if (!p.weight) miss.push("вес");
      if (miss.length) {
        profileHint = `<div class="alert alert-light border mb-0 small"><i class="bi bi-info-circle me-2"></i>Для более точной интерпретации укажите в <a href="#/profile">профиле</a>: ${miss.join(", ")}.</div>`;
      } else {
        profileHint = `<div class="text-success small mb-0"><i class="bi bi-check-circle me-1"></i>Профиль заполнен основными антропометрическими данными.</div>`;
      }
    } catch {
      profileHint = "";
    }
  }

  pageEl.innerHTML = `
    <div class="app-page">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h3 class="mb-1">Дашборд</h3>
        <div class="text-muted small">Пациент: <span class="text-dark fw-medium">${escapeHtml(patientDisplay)}</span></div>
      </div>
      <div class="text-end small text-muted">
        <div>Категорий рекомендаций: <strong class="text-dark">${topRecCats}</strong></div>
        <div>Всего рекомендаций: <strong class="text-dark">${recItems}</strong></div>
      </div>
    </div>

    ${renderCards({ genotypesCount, vitaminTestsCount, deficiencyCount, normalCount, proficitCount })}

    <div class="card shadow-sm mb-3">
      <div class="card-header bg-white fw-semibold">Сводка и подсказки</div>
      <div class="card-body">
        ${profileHint || `<p class="text-muted small mb-2">Заполните генотипы и анализы — тогда на паспорте и в рекомендациях появится больше контекста.</p>`}
        <ul class="small text-muted mb-0 ps-3">
          <li class="mb-1">Новые варианты генов удобно добавлять списком и сразу переходить в паспорт.</li>
          <li class="mb-1">Статусы витаминов считаются относительно справочных диапазонов в системе.</li>
          <li>Рекомендации группируются по смысловым категориям — на странице «Рекомендации» есть поиск и фильтр по категории.</li>
        </ul>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header bg-white">
        <div class="fw-semibold">Последние анализы витаминов</div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Витамин</th>
                <th>Значение</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              ${(vitaminTests || [])
                .slice(0, 8)
                .map(
                  (t) => `
                <tr>
                  <td><div class="fw-semibold">${t.vitamin_name}</div><div class="text-muted small">${t.vitamin_unit_test || ""}</div></td>
                  <td>${t.test_value}</td>
                  <td>${statusBadge(t.status)}</td>
                  <td>${t.test_date}</td>
                </tr>
              `,
                )
                .join("")}
              ${(vitaminTests || []).length === 0 ? `<tr><td colspan="4" class="text-center text-muted py-4">Нет данных</td></tr>` : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  `;
}

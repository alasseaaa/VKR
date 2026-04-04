const GENDER_OPTS = [
  { v: "", t: "Не указано" },
  { v: "male", t: "Мужской" },
  { v: "female", t: "Женский" },
];

const ACTIVITY_OPTS = [
  { v: "", t: "Не указано" },
  { v: "low", t: "Низкий" },
  { v: "medium", t: "Средний" },
  { v: "high", t: "Высокий" },
];

import { renderSidebar } from "../components/sidebar.js";
import { setWithoutGeneticTestFlag } from "../services/wellness.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optHtml(options, selected) {
  return options
    .map((o) => `<option value="${escapeHtml(o.v)}" ${String(selected) === String(o.v) ? "selected" : ""}>${escapeHtml(o.t)}</option>`)
    .join("");
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card app-card"><div class="card-body">Загрузка профиля…</div></div>`;

  let data;
  try {
    data = await api.patient.getProfile();
  } catch (e) {
    showAlert("danger", e.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(e.message)}</div>`;
    return;
  }

  pageEl.innerHTML = `
    <div class="app-page">
    <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <h1 class="app-page-title h3 mb-0">Профиль пациента</h1>
      <a class="btn btn-outline-secondary btn-sm" href="#/dashboard">На дашборд</a>
    </div>

    <div class="card app-card shadow-sm">
      <div class="card-header bg-white">
        <div class="fw-semibold">Личные данные и анкета</div>
        <div class="text-muted small">Логин и email меняются только администратором.</div>
      </div>
      <div class="card-body">
        <form id="profile-form" class="row g-3">
          <div class="col-md-6">
            <label class="form-label small">Логин</label>
            <input class="form-control" value="${escapeHtml(data.username || "")}" disabled />
          </div>
          <div class="col-md-6">
            <label class="form-label small">Email</label>
            <input class="form-control" value="${escapeHtml(data.email || "")}" disabled />
          </div>
          <div class="col-md-6">
            <label class="form-label small">Имя</label>
            <input name="first_name" class="form-control" value="${escapeHtml(data.first_name || "")}" />
          </div>
          <div class="col-md-6">
            <label class="form-label small">Фамилия</label>
            <input name="last_name" class="form-control" value="${escapeHtml(data.last_name || "")}" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">Дата рождения</label>
            <input name="birth_date" type="date" class="form-control" value="${escapeHtml(data.birth_date || "")}" />
          </div>
          <div class="col-md-4">
            <label class="form-label small">Пол</label>
            <select name="gender" class="form-select">${optHtml(GENDER_OPTS, data.gender || "")}</select>
          </div>
          <div class="col-md-4">
            <label class="form-label small">Активность</label>
            <select name="activity_level" class="form-select">${optHtml(ACTIVITY_OPTS, data.activity_level || "")}</select>
          </div>
          <div class="col-md-6">
            <label class="form-label small">Рост (см)</label>
            <input name="height" type="number" min="40" max="280" class="form-control" value="${data.height != null ? escapeHtml(String(data.height)) : ""}" placeholder="—" />
          </div>
          <div class="col-md-6">
            <label class="form-label small">Вес (кг)</label>
            <input name="weight" type="number" min="2" max="500" class="form-control" value="${data.weight != null ? escapeHtml(String(data.weight)) : ""}" placeholder="—" />
          </div>
          <div class="col-12">
            <label class="form-label small">Пищевые предпочтения</label>
            <textarea name="diet_preferences" class="form-control" rows="2">${escapeHtml(data.diet_preferences || "")}</textarea>
          </div>
          <div class="col-12">
            <label class="form-label small">Цели (например, сон, вес, спорт)</label>
            <textarea name="goals_text" class="form-control" rows="2">${escapeHtml(data.goals_text || "")}</textarea>
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="prof-wg" ${data.without_genetic_test ? "checked" : ""} />
              <label class="form-check-label" for="prof-wg">Режим без генетического теста</label>
            </div>
            <div class="text-muted small mt-1">Упрощённое меню без разделов «Генетические данные» и «Генетический паспорт»; на странице статей по умолчанию открывается категория «Общее здоровье». Генотипы можно добавить позже — снимите галочку.</div>
          </div>
          <div class="col-12">
            <button type="submit" class="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
    </div>
  `;

  pageEl.querySelector("#profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) {
      if (k === "height" || k === "weight") {
        const n = v === "" ? null : Number(v);
        payload[k] = Number.isFinite(n) ? n : null;
      } else if (k === "birth_date") {
        payload[k] = v || null;
      } else {
        payload[k] = v;
      }
    }
    payload.without_genetic_test = Boolean(form.querySelector("#prof-wg")?.checked);
    try {
      const updated = await api.patient.updateProfile(payload);
      setWithoutGeneticTestFlag(Boolean(updated?.without_genetic_test));
      renderSidebar();
      showAlert("success", "Профиль сохранён");
    } catch (err) {
      showAlert("danger", err.message);
    }
  });
}

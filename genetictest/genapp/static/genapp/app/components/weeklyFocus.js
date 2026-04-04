/** Простой «фокус недели»: галочки в localStorage, неделя с понедельника (локальное время). */

const TASKS = [
  { id: "sleep", label: "Сон: примерно одно и то же время сна и подъёма" },
  { id: "move", label: "Движение: хотя бы 30 минут прогулки или лёгкой активности в день" },
  { id: "water", label: "Вода: пить по жажде, не забывать в течение дня" },
  { id: "plants", label: "Питание: один приём с овощами или фруктами" },
  { id: "screen", label: "Экраны: за 30–60 минут до сна без яркого экрана" },
];

function mondayKeyLocal() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, "0");
  const dayNum = String(mon.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function loadState(weekKey) {
  const raw = localStorage.getItem(`wellness_week_focus_${weekKey}`);
  try {
    const o = raw ? JSON.parse(raw) : {};
    return typeof o === "object" && o ? o : {};
  } catch {
    return {};
  }
}

function saveState(weekKey, state) {
  localStorage.setItem(`wellness_week_focus_${weekKey}`, JSON.stringify(state));
}

export function mountWeeklyFocus(container) {
  if (!container) return;
  const weekKey = mondayKeyLocal();
  let checked = loadState(weekKey);

  const rows = TASKS.map(
    (t) => `
    <div class="form-check mb-2">
      <input class="form-check-input" type="checkbox" id="wf-${t.id}" data-id="${t.id}" ${checked[t.id] ? "checked" : ""} />
      <label class="form-check-label small" for="wf-${t.id}">${t.label}</label>
    </div>
  `,
  ).join("");

  container.innerHTML = `
    <div class="card app-card border-0 shadow-sm bg-light mb-3">
      <div class="card-body">
        <div class="fw-semibold mb-1"><i class="bi bi-calendar-check me-2 text-success"></i>Фокус недели</div>
        <p class="text-muted small mb-2">Небольшие шаги без привязки к генетике. Отмечайте по мере выполнения — список обновится в новый понедельник.</p>
        <div class="text-muted small mb-2">Неделя с ${weekKey}</div>
        ${rows}
      </div>
    </div>
  `;

  container.querySelectorAll('input[type="checkbox"][data-id]').forEach((el) => {
    el.addEventListener("change", () => {
      const id = el.dataset.id;
      if (el.checked) checked[id] = true;
      else delete checked[id];
      saveState(weekKey, checked);
    });
  });
}

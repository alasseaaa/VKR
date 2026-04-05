function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDt(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const STATUS_LABELS = {
  pending: "Ожидает ответа",
  confirmed: "Подтверждено",
  declined: "Отклонено",
  cancelled_by_patient: "Отменено пациентом",
  cancelled_by_doctor: "Отменено врачом",
};

function statusBadgeClass(st) {
  if (st === "confirmed") return "text-bg-success";
  if (st === "pending") return "text-bg-warning text-dark";
  if (st === "declined" || st === "cancelled_by_doctor" || st === "cancelled_by_patient") return "text-bg-secondary";
  return "text-bg-light text-dark";
}

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка заявок…</div></div>`;

  async function load() {
    const items = await api.doctor.listAppointments({});
    return Array.isArray(items) ? items : [];
  }

  let items = [];
  try {
    items = await load();
  } catch (err) {
    showAlert("danger", err.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    return;
  }

  function card(a) {
    const pid = a.patient;
    const pending = a.status === "pending";
    const confirmed = a.status === "confirmed";
    const actions = pending
      ? `
      <div class="d-flex flex-wrap gap-2 mt-2">
        <button type="button" class="btn btn-sm btn-success" data-appt-action="confirm" data-appt-id="${a.id}">Подтвердить</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-appt-action="decline" data-appt-id="${a.id}">Отклонить</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-appt-action="cancel_doc" data-appt-id="${a.id}">Отменить как врач</button>
      </div>`
      : confirmed
        ? `
      <div class="d-flex flex-wrap gap-2 align-items-end mt-2">
        <div>
          <label class="form-label small mb-0">Время приёма</label>
          <input type="datetime-local" class="form-control form-control-sm" data-appt-confirmed-input="${a.id}" value="${escapeHtml(toLocalInputValue(a.confirmed_start || a.requested_start))}" />
        </div>
        <button type="button" class="btn btn-sm btn-primary" data-appt-action="save_time" data-appt-id="${a.id}">Сохранить время</button>
        <button type="button" class="btn btn-sm btn-outline-danger" data-appt-action="cancel_doc" data-appt-id="${a.id}">Отменить приём</button>
      </div>`
        : "";

    return `
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="badge ${statusBadgeClass(a.status)}">${escapeHtml(STATUS_LABELS[a.status] || a.status)}</span>
            <a class="fw-semibold text-decoration-none" href="#/doctor/patients/${pid}">${escapeHtml(a.patient_name || "")}</a>
            <span class="text-muted small">#${pid}</span>
          </div>
          <div class="small"><strong>Просит:</strong> ${escapeHtml(formatDt(a.requested_start))}</div>
          ${
            confirmed && a.confirmed_start
              ? `<div class="small"><strong>Подтверждено:</strong> ${escapeHtml(formatDt(a.confirmed_start))}</div>`
              : ""
          }
          ${a.patient_note ? `<div class="small mt-2"><strong>Пациент:</strong> ${escapeHtml(a.patient_note)}</div>` : ""}
          <div class="mt-2">
            <label class="form-label small mb-0">Сообщение пациенту</label>
            <textarea class="form-control form-control-sm" rows="2" data-appt-msg="${a.id}" placeholder="Адрес кабинета, уточнения…">${escapeHtml(a.doctor_message || "")}</textarea>
            <button type="button" class="btn btn-sm btn-outline-primary mt-1" data-appt-action="save_msg" data-appt-id="${a.id}">Сохранить сообщение</button>
          </div>
          ${actions}
        </div>
      </div>`;
  }

  pageEl.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <h3 class="mb-0">Заявки на очный приём</h3>
      <div class="d-flex gap-2">
        <a class="btn btn-outline-secondary btn-sm" href="#/doctor/patients">Пациенты</a>
      </div>
    </div>
    ${items.length ? items.map(card).join("") : `<p class="text-muted">Заявок пока нет.</p>`}
  `;

  async function refresh() {
    try {
      items = await load();
      await render(pageEl, { api, showAlert });
    } catch (err) {
      showAlert("danger", err.message);
    }
  }

  pageEl.onclick = async (e) => {
    const btn = e.target.closest("[data-appt-action]");
    if (!btn || !pageEl.contains(btn)) return;
    const id = Number(btn.dataset.apptId);
    if (!Number.isFinite(id)) return;
    const msgEl = pageEl.querySelector(`[data-appt-msg="${id}"]`);
    const doctor_message = msgEl ? String(msgEl.value || "") : "";

    const action = btn.dataset.apptAction;
    try {
      if (action === "save_msg") {
        await api.doctor.updateAppointment(id, { doctor_message });
        showAlert("success", "Сообщение сохранено.");
        await refresh();
        return;
      }
      if (action === "save_time") {
        const inp = pageEl.querySelector(`[data-appt-confirmed-input="${id}"]`);
        const localDt = inp?.value;
        if (!localDt) {
          showAlert("warning", "Укажите дату и время.");
          return;
        }
        const confirmed_start = new Date(localDt).toISOString();
        await api.doctor.updateAppointment(id, { confirmed_start });
        showAlert("success", "Время обновлено.");
        await refresh();
        return;
      }
      if (action === "confirm") {
        const payload = { status: "confirmed" };
        if (doctor_message.trim()) payload.doctor_message = doctor_message;
        await api.doctor.updateAppointment(id, payload);
        showAlert("success", "Приём подтверждён, пациент получит уведомление.");
        await refresh();
        return;
      }
      if (action === "decline") {
        const extra = window.prompt("Причина или предложение другого времени (необязательно):", "") || "";
        await api.doctor.updateAppointment(id, {
          status: "declined",
          doctor_message: [doctor_message, extra].filter(Boolean).join("\n"),
        });
        showAlert("success", "Заявка отклонена.");
        await refresh();
        return;
      }
      if (action === "cancel_doc") {
        if (!window.confirm("Отменить этот приём? Пациент получит уведомление.")) return;
        const extra = window.prompt("Комментарий для пациента (необязательно):", "") || "";
        await api.doctor.updateAppointment(id, {
          status: "cancelled_by_doctor",
          doctor_message: [doctor_message, extra].filter(Boolean).join("\n"),
        });
        showAlert("success", "Приём отменён.");
        await refresh();
      }
    } catch (err) {
      showAlert("danger", err.message);
    }
  };
}

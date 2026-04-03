function safe(v) {
  return v === null || v === undefined ? "—" : String(v);
}

export async function render(pageEl, { api, showAlert }) {
  pageEl.innerHTML = `<div class="card"><div class="card-body">Загрузка пациентов...</div></div>`;

  try {
    const patients = await api.doctor.listPatients();

    pageEl.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h3 class="mb-0">Пациенты</h3>
        <span class="text-muted small">${(patients || []).length} пациентов</span>
      </div>

      <div class="card shadow-sm">
        <div class="card-body p-0">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>ID</th>
                <th>Пациент</th>
                <th>Профиль</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${
                patients?.length
                  ? patients
                      .map(
                        (p) => `
                  <tr>
                    <td class="text-muted">${p.id}</td>
                    <td>
                      <div class="fw-semibold">${p.first_name || ""} ${p.last_name || ""}</div>
                      <div class="text-muted small">@${p.username}</div>
                    </td>
                    <td>
                      <div class="small">Рост: ${safe(p.profile?.height)} см</div>
                      <div class="small">Вес: ${safe(p.profile?.weight)} кг</div>
                      <div class="small">Пол: ${safe(p.profile?.gender)}</div>
                    </td>
                    <td class="text-end">
                      <a class="btn btn-sm btn-outline-primary" href="#/doctor/patients/${p.id}">
                        Открыть
                      </a>
                    </td>
                  </tr>
                `,
                      )
                      .join("")
                  : `<tr><td colspan="4" class="text-center text-muted py-4">Список пуст</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    showAlert("danger", err.message);
    pageEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}


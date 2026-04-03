export function showAlert(type, message) {
  const area = document.getElementById("alert-area");
  if (!area) return;

  const color =
    type === "success"
      ? "alert-success"
      : type === "warning"
        ? "alert-warning"
        : type === "danger"
          ? "alert-danger"
          : "alert-secondary";

  area.innerHTML = `
    <div class="alert ${color} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Закрыть"></button>
    </div>
  `;
}

export function clearAlert() {
  const area = document.getElementById("alert-area");
  if (area) area.innerHTML = "";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


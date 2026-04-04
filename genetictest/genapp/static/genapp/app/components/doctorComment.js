function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * @param {object} comment — ответ PatientDoctorCommentReadSerializer
 * @param {string} title — заголовок блока
 */
export function doctorCommentBlockHtml(comment, title) {
  if (!comment) return "";
  const edited = comment.was_edited ? ` <span class="text-muted small">(отредактировано)</span>` : "";
  const doctor = escapeHtml(comment.doctor_name || "");
  const date = escapeHtml(comment.created_at || "");
  const text = escapeHtml(comment.text || "");
  const safeTitle = escapeHtml(title);
  return `
    <div class="mt-3 p-3 rounded-3 border border-info border-opacity-50 bg-info bg-opacity-10">
      <div class="d-flex align-items-start gap-2 mb-2">
        <span class="fs-4 lh-1" aria-hidden="true">👩‍⚕️</span>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-semibold small">${safeTitle}</div>
          <div class="text-muted small">${doctor} · ${date}${edited}</div>
        </div>
      </div>
      <div class="small" style="white-space: pre-wrap;">${text}</div>
    </div>
  `;
}

export function doctorCommentsForMarkerHtml(comments, title) {
  if (!comments?.length) return "";
  return comments.map((c) => doctorCommentBlockHtml(c, title)).join("");
}

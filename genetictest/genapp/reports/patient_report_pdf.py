"""PDF-отчёт пациента: комментарии врача (общие → по обследованиям) + авто-рекомендации + лечащий врач."""

from __future__ import annotations

import os
import platform
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from genapp.models import DoctorComment, DoctorPatient
from genapp.recommendations.services import get_user_recommendations

_FONT_REGISTERED = False
_FONT_NAME = "PatientReportSans"


def _resolve_unicode_font_path() -> str | None:
    configured = getattr(settings, "PATIENT_REPORT_FONT_PATH", None) or os.environ.get(
        "PATIENT_REPORT_FONT_PATH", ""
    ).strip()
    if configured and Path(configured).is_file():
        return configured

    candidates: list[Path] = []
    system = platform.system()
    if system == "Windows":
        windir = os.environ.get("WINDIR", "C:\\Windows")
        candidates.extend(
            [
                Path(windir) / "Fonts" / "arial.ttf",
                Path(windir) / "Fonts" / "arialuni.ttf",
                Path(windir) / "Fonts" / "segoeui.ttf",
            ]
        )
    elif system == "Darwin":
        candidates.extend(
            [
                Path("/Library/Fonts/Arial.ttf"),
                Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
                Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
            ]
        )
    else:
        candidates.extend(
            [
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
                Path("/usr/share/fonts/TTF/DejaVuSans.ttf"),
                Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
                Path("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
            ]
        )

    for p in candidates:
        if p.is_file():
            return str(p)
    return None


def _ensure_font() -> str:
    global _FONT_REGISTERED
    if _FONT_REGISTERED:
        return _FONT_NAME
    path = _resolve_unicode_font_path()
    if not path:
        raise RuntimeError(
            "Не найден TTF-шрифт с поддержкой кириллицы. "
            "Укажите settings.PATIENT_REPORT_FONT_PATH или установите Arial/DejaVu в системе."
        )
    pdfmetrics.registerFont(TTFont(_FONT_NAME, path))
    _FONT_REGISTERED = True
    return _FONT_NAME


def _p(text: str, style: ParagraphStyle) -> Paragraph:
    t = escape(str(text or "")).replace("\n", "<br/>")
    return Paragraph(t, style)


def _user_display_name(u) -> str:
    return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username


def _treating_doctor_name(user):
    """Один лечащий врач по привязке DoctorPatient; иначе — из последнего комментария."""
    dp = (
        DoctorPatient.objects.filter(patient=user)
        .select_related("doctor")
        .order_by("created_at")
        .first()
    )
    if dp and dp.doctor_id:
        return _user_display_name(dp.doctor)
    c = (
        DoctorComment.objects.filter(patient=user, status="published")
        .select_related("doctor")
        .order_by("-created_at")
        .first()
    )
    if c:
        return _user_display_name(c.doctor)
    return None


def build_patient_report_pdf(user) -> bytes:
    font = _ensure_font()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="RepTitle",
        parent=styles["Heading1"],
        fontName=font,
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor("#1a1a2e"),
    )
    h2_style = ParagraphStyle(
        name="RepH2",
        parent=styles["Heading2"],
        fontName=font,
        fontSize=13,
        spaceBefore=14,
        spaceAfter=8,
        textColor=colors.HexColor("#16213e"),
    )
    body_style = ParagraphStyle(
        name="RepBody",
        parent=styles["Normal"],
        fontName=font,
        fontSize=10,
        leading=14,
        spaceAfter=6,
    )
    small_style = ParagraphStyle(
        name="RepSmall",
        parent=body_style,
        fontSize=9,
        textColor=colors.grey,
    )

    story: list = []
    now = timezone.localtime(timezone.now())
    patient_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username

    story.append(_p("Отчёт по генетическому профилю и рекомендациям", title_style))
    story.append(_p(f"Пациент: {patient_name} (@{user.username})", body_style))
    story.append(_p(f"Дата формирования: {now.strftime('%d.%m.%Y %H:%M')}", small_style))
    story.append(Spacer(1, 0.4 * cm))

    comments = list(
        DoctorComment.objects.filter(patient=user, status="published")
        .select_related("genotype__gene_variant__gene", "vitamin_test__vitamin")
        .order_by("id")
    )

    general = [c for c in comments if not c.genotype_id and not c.vitamin_test_id]
    by_vitamin = [c for c in comments if c.vitamin_test_id]
    by_genotype = [c for c in comments if c.genotype_id]

    # --- 1. Общие рекомендации (врач), без дат ---
    story.append(_p("Общие рекомендации", h2_style))
    if not general:
        story.append(_p("Общие рекомендации врача не добавлены.", body_style))
    else:
        for c in general:
            txt = (c.text or "").strip()
            if txt:
                story.append(_p(txt, body_style))
                story.append(Spacer(1, 0.2 * cm))

    # --- 2. По анализам (витамины), затем по генетическим маркерам; без дат и без ФИО врача ---
    story.append(_p("Рекомендации по результатам анализов", h2_style))
    if not by_vitamin and not by_genotype:
        story.append(_p("Рекомендаций по конкретным анализам и маркерам нет.", body_style))
    else:
        if by_vitamin:
            story.append(_p("По анализам витаминов", ParagraphStyle(name="RepH3v", parent=h2_style, fontSize=11, spaceBefore=6)))
            for c in by_vitamin:
                vt = getattr(c, "vitamin_test", None)
                vn = getattr(getattr(vt, "vitamin", None), "name", None) or "анализ"
                story.append(_p(f"«{vn}»", small_style))
                story.append(_p((c.text or "—").strip(), body_style))
                story.append(Spacer(1, 0.2 * cm))
        if by_genotype:
            story.append(_p("По генетическим маркерам", ParagraphStyle(name="RepH3g", parent=h2_style, fontSize=11, spaceBefore=6)))
            for c in by_genotype:
                gv = getattr(c, "genotype", None)
                sym = getattr(getattr(getattr(gv, "gene_variant", None), "gene", None), "symbol", None) or "маркер"
                story.append(_p(f"«{sym}»", small_style))
                story.append(_p((c.text or "—").strip(), body_style))
                story.append(Spacer(1, 0.2 * cm))

    # --- 3. Автоматически сгенерированные рекомендации ---
    story.append(_p("Рекомендации, сформированные автоматически", h2_style))
    rec_data = get_user_recommendations(user)
    categories = rec_data.get("categories") or {}
    if not categories:
        story.append(_p("По текущим генотипам персональных рекомендаций в базе нет.", body_style))
    else:
        for cat_key, cat in categories.items():
            label = cat.get("label") or cat_key
            story.append(_p(label, ParagraphStyle(name="Cat", parent=h2_style, fontSize=11, spaceBefore=8)))
            for rec in cat.get("recommendations") or []:
                title = rec.get("title") or "—"
                desc = (rec.get("description") or "").strip()
                genes = rec.get("genes") or []
                genes_s = ", ".join(genes) if genes else ""
                status = rec.get("user_status")
                status_s = f" (статус: {status})" if status else ""
                story.append(Paragraph(f"<b>{escape(title)}</b>{escape(status_s)}", body_style))
                if genes_s:
                    story.append(_p(f"Связанные маркеры: {genes_s}", small_style))
                if desc:
                    story.append(_p(desc, body_style))
                story.append(Spacer(1, 0.15 * cm))


    story.append(Spacer(1, 0.4 * cm))
    story.append(_p("Лечащий врач", h2_style))
    doc_name = _treating_doctor_name(user)
    if doc_name:
        story.append(_p(doc_name, body_style))
    else:
        story.append(_p("Не указан (нет привязки врача в системе).", small_style))

    story.append(Spacer(1, 0.5 * cm))
    story.append(
        _p(
            "Документ сформирован автоматически в личном кабинете. "
            "Не заменяет очную консультацию специалиста.",
            small_style,
        )
    )

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Отчёт пациента",
    )
    doc.build(story)
    return buf.getvalue()

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from genapp.models import DoctorComment, PatientNotification


@receiver(pre_save, sender=DoctorComment)
def _doctor_comment_cache_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._prev_comment_status = None
        return
    try:
        old = DoctorComment.objects.get(pk=instance.pk)
        instance._prev_comment_status = old.status
    except DoctorComment.DoesNotExist:
        instance._prev_comment_status = None


def _should_create_patient_notification(instance, created):
    if instance.status != "published":
        return False
    prev = getattr(instance, "_prev_comment_status", None)
    if created:
        return True
    return prev is not None and prev != "published"


def _notification_title_body(comment):
    doctor = comment.doctor
    dname = f"{doctor.first_name or ''} {doctor.last_name or ''}".strip() or doctor.username
    if comment.genotype_id:
        title = "Комментарий к генетическому маркеру"
    elif comment.vitamin_test_id:
        title = "Комментарий к анализу витамина"
    else:
        title = "Комментарий врача"
    preview = (comment.text or "").strip()[:240]
    body = f"{dname}: {preview}" if preview else f"Сообщение от врача {dname}"
    return title, body


@receiver(post_save, sender=DoctorComment)
def notify_patient_on_published_comment(sender, instance, created, **kwargs):
    if not _should_create_patient_notification(instance, created):
        return
    title, body = _notification_title_body(instance)
    PatientNotification.objects.create(
        user_id=instance.patient_id,
        comment=instance,
        title=title,
        body=body,
    )

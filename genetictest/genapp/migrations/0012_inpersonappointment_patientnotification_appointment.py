import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("genapp", "0011_userprofile_without_genetic_test_article_wellness"),
    ]

    operations = [
        migrations.CreateModel(
            name="InPersonAppointment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("requested_start", models.DateTimeField(verbose_name="Желаемая дата и время")),
                (
                    "confirmed_start",
                    models.DateTimeField(blank=True, null=True, verbose_name="Подтверждённая дата и время"),
                ),
                ("patient_note", models.TextField(blank=True, verbose_name="Комментарий пациента")),
                ("doctor_message", models.TextField(blank=True, verbose_name="Сообщение врача")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Ожидает ответа"),
                            ("confirmed", "Подтверждено"),
                            ("declined", "Отклонено"),
                            ("cancelled_by_patient", "Отменено пациентом"),
                            ("cancelled_by_doctor", "Отменено врачом"),
                        ],
                        default="pending",
                        max_length=32,
                        verbose_name="Статус",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создано")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Обновлено")),
                (
                    "doctor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="in_person_appointments_as_doctor",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Врач",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="in_person_appointments_as_patient",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Пациент",
                    ),
                ),
            ],
            options={
                "verbose_name": "Заявка на очный приём",
                "verbose_name_plural": "Заявки на очные приёмы",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="inpersonappointment",
            index=models.Index(fields=["patient", "status"], name="genapp_inpe_patient_2b5_idx"),
        ),
        migrations.AddIndex(
            model_name="inpersonappointment",
            index=models.Index(fields=["doctor", "status"], name="genapp_inpe_doctor_8a1_idx"),
        ),
        migrations.AddField(
            model_name="patientnotification",
            name="appointment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="patient_notifications",
                to="genapp.inpersonappointment",
                verbose_name="Заявка на приём",
            ),
        ),
    ]

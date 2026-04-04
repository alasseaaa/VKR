import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("genapp", "0009_doctorcomment_doctorcommenthistory_doctorpatient"),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200, verbose_name="Заголовок")),
                ("body", models.TextField(blank=True, verbose_name="Текст")),
                ("is_read", models.BooleanField(default=False, verbose_name="Прочитано")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создано")),
                (
                    "comment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="patient_notifications",
                        to="genapp.doctorcomment",
                        verbose_name="Комментарий",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="patient_notifications",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Пациент",
                    ),
                ),
            ],
            options={
                "verbose_name": "Уведомление пациента",
                "verbose_name_plural": "Уведомления пациентов",
                "ordering": ["-created_at"],
            },
        ),
    ]

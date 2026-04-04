from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("genapp", "0010_patientnotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="without_genetic_test",
            field=models.BooleanField(
                default=False,
                help_text="Акцент на статьях и привычках; разделы с генотипами скрыты в меню.",
                verbose_name="Режим без генетического теста",
            ),
        ),
        migrations.AlterField(
            model_name="article",
            name="category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("metabolism", "Метаболизм"),
                    ("sport", "Спорт"),
                    ("vitamins", "Витамины"),
                    ("nutrition", "Питание"),
                    ("wellness", "Общее здоровье (без теста)"),
                ],
                max_length=32,
                verbose_name="Категория",
            ),
        ),
    ]

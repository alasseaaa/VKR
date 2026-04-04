from django.apps import AppConfig


class GenappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'genapp'

    def ready(self):
        import genapp.signals  # noqa: F401

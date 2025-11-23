from django.apps import AppConfig


class UrgenciasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'urgencias'
    
    def ready(self):
        import urgencias.signals  # Registrar los signals

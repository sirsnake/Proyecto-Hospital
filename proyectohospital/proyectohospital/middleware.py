"""
Middleware personalizado para el proyecto hospital
"""
from django.utils.deprecation import MiddlewareMixin


class DisableCSRFForAPI(MiddlewareMixin):
    """
    Middleware que desactiva la verificación CSRF para las rutas de API
    durante desarrollo. Las peticiones que vienen de devtunnels necesitan
    esto porque las cookies cross-site no funcionan bien.
    
    IMPORTANTE: Solo usar en desarrollo, no en producción.
    """
    
    def process_request(self, request):
        # Verificar si es una petición a la API
        if request.path.startswith('/api/'):
            # Marcar la petición como exenta de CSRF
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

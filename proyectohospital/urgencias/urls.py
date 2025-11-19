from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pacientes', views.PacienteViewSet, basename='paciente')
router.register(r'fichas', views.FichaEmergenciaViewSet, basename='ficha')
router.register(r'signos-vitales', views.SignosVitalesViewSet, basename='signos-vitales')
router.register(r'solicitudes-medicamentos', views.SolicitudMedicamentoViewSet, basename='solicitud-medicamento')
router.register(r'anamnesis', views.AnamnesisViewSet, basename='anamnesis')
router.register(r'diagnosticos', views.DiagnosticoViewSet, basename='diagnostico')

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('current-user/', views.current_user, name='current-user'),
    path('', include(router.urls)),
]

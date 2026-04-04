from django.urls import include, path
from rest_framework.routers import DefaultRouter

from genapp.api.patient_catalog import (
    PatientGeneCatalogAPIView,
    PatientGeneVariantCatalogAPIView,
    PatientVitaminCatalogAPIView,
)
from genapp.api.views import (
    AdminGeneVariantViewSet,
    AdminGeneViewSet,
    AdminRecommendationViewSet,
    PublicArticleViewSet,
    DoctorCommentListAPIView,
    DoctorCommentCreateAPIView,
    DoctorCommentUpdateAPIView,
    DoctorConclusionCreateAPIView,
    DoctorPatientsListAPIView,
    DoctorPatientProfileAPIView,
    LoginAPIView,
    PatientGenotypeViewSet,
    PatientInterpretationAPIView,
    PatientNotificationsMarkReadAPIView,
    PatientNotificationsUnreadAPIView,
    PatientOwnProfileAPIView,
    PatientRecommendationsAPIView,
    PatientReportPDFAPIView,
    PatientVitaminTestViewSet,
    RegisterAPIView,
)

router = DefaultRouter()
router.register(r"patient/genotypes", PatientGenotypeViewSet, basename="patient-genotypes")
router.register(r"patient/vitamin-tests", PatientVitaminTestViewSet, basename="patient-vitamin-tests")

router.register(r"admin/genes", AdminGeneViewSet, basename="admin-genes")
router.register(r"admin/gene-variants", AdminGeneVariantViewSet, basename="admin-gene-variants")
router.register(r"admin/recommendations", AdminRecommendationViewSet, basename="admin-recommendations")
router.register(r"articles", PublicArticleViewSet, basename="public-articles")

urlpatterns = [
    path("v1/comments/", DoctorCommentListAPIView.as_view()),
    path("auth/register/", RegisterAPIView.as_view()),
    path("auth/login/", LoginAPIView.as_view()),

    path("patient/interpretation/", PatientInterpretationAPIView.as_view()),
    path("patient/profile/", PatientOwnProfileAPIView.as_view()),
    path("patient/notifications/unread/", PatientNotificationsUnreadAPIView.as_view()),
    path("patient/notifications/mark-read/", PatientNotificationsMarkReadAPIView.as_view()),
    path("patient/recommendations/", PatientRecommendationsAPIView.as_view()),
    path("patient/report/pdf/", PatientReportPDFAPIView.as_view()),
    path("patient/vitamins/catalog/", PatientVitaminCatalogAPIView.as_view()),
    path("patient/genes/catalog/", PatientGeneCatalogAPIView.as_view()),
    path("patient/gene-variants/catalog/", PatientGeneVariantCatalogAPIView.as_view()),

    path("doctor/patients/", DoctorPatientsListAPIView.as_view()),
    path("doctor/patients/<int:patient_id>/profile/", DoctorPatientProfileAPIView.as_view()),
    path("doctor/patients/<int:patient_id>/comments/", DoctorCommentCreateAPIView.as_view()),
    path("doctor/patients/<int:patient_id>/conclusion/", DoctorConclusionCreateAPIView.as_view()),
    path("doctor/comments/<int:comment_id>/", DoctorCommentUpdateAPIView.as_view()),

    path("", include(router.urls)),
]


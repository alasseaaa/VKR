from rest_framework.permissions import BasePermission

from genapp.doctor.services import check_doctor_access
from genapp.models import DoctorPatient


def get_user_role(user):
    """
    Роль пользователя для API.

    Приоритет:
    - admin: staff/superuser
    - doctor: принадлежит группе `doctor` или существует привязка DoctorPatient (doctor->patients)
    - иначе patient
    """
    if not user or not getattr(user, "is_authenticated", False):
        return None

    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return "admin"

    # Группа задаёт роль явно (удобно для реальной эксплуатации).
    if user.groups.filter(name="doctor").exists():
        return "doctor"

    # Подстраховка: если врач уже имеет закрепленных пациентов, считаем его врачом.
    if DoctorPatient.objects.filter(doctor=user).exists():
        return "doctor"

    return "patient"


class RolePermission(BasePermission):
    """
    Базовый permission по роли.

    Используется как подкласс с заданным class attribute `required_roles`.
    """

    required_roles = set()

    def has_permission(self, request, view):
        role = get_user_role(request.user)
        if not role:
            return False
        return role in self.required_roles


class IsPatientOrAdmin(RolePermission):
    required_roles = {"patient", "admin"}


class IsDoctor(RolePermission):
    required_roles = {"doctor"}


class IsAdminOnly(RolePermission):
    required_roles = {"admin"}


class IsPatientOwner(BasePermission):
    """
    Для объектов, которые принадлежат пользователю через поле `user`.
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "user", None)
        if owner is None:
            return False
        return owner_id_equal(owner, request.user)


def owner_id_equal(owner, user):
    return getattr(owner, "id", None) == getattr(user, "id", None)


class IsDoctorCommentAuthor(BasePermission):
    def has_object_permission(self, request, view, obj):
        if getattr(obj, "doctor_id", None) != request.user.id:
            return False
        # Дополнительно проверяем, что врач имеет доступ к пациенту.
        return check_doctor_access(request.user.id, obj.patient_id)


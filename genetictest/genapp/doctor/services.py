from genapp.models import DoctorPatient


def check_doctor_access(doctor_id, patient_id):
    """
    Проверяет, закреплён ли пациент за врачом.

    Возвращает True/False.
    """
    if not doctor_id or not patient_id:
        return False
    return DoctorPatient.objects.filter(doctor_id=doctor_id, patient_id=patient_id).exists()


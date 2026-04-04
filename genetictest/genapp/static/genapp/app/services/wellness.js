const LS_WITHOUT_GT = "patient_without_genetic_test";

export function setWithoutGeneticTestFlag(value) {
  if (value) localStorage.setItem(LS_WITHOUT_GT, "1");
  else localStorage.removeItem(LS_WITHOUT_GT);
}

export function getWithoutGeneticTestFlag() {
  return localStorage.getItem(LS_WITHOUT_GT) === "1";
}

export function clearWithoutGeneticTestFlag() {
  localStorage.removeItem(LS_WITHOUT_GT);
}

export async function syncPatientWellnessFromProfile(api) {
  const p = await api.patient.getProfile();
  setWithoutGeneticTestFlag(Boolean(p.without_genetic_test));
}

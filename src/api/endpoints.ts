import { api } from "./client";
import type {
  Agreement,
  Area,
  Assignment,
  Category,
  Committee,
  CommitteeCompliance,
  CommitteeMember,
  ComplianceMetrics,
  EppDelivery,
  EppItem,
  ExperimentResults,
  Inspection,
  InspectionSchedule,
  IpercEntry,
  IpercMatrix,
  Meeting,
  MttrMetrics,
  Paginated,
  Report,
  User,
} from "./types";

/** Helper: casi todos los endpoints son listas paginadas de DRF. */
const results = <T,>(url: string, params?: object) =>
  api.get<Paginated<T>>(url, { params }).then((r) => r.data.results);

export const auth = {
  login: (username: string, password: string) =>
    api
      .post<{ access: string; refresh: string; user: User }>("/auth/login/", {
        username,
        password,
      })
      .then((r) => r.data),
  register: (payload: Record<string, unknown>) =>
    api.post<User>("/auth/register/", payload).then((r) => r.data),
  me: () => api.get<User>("/auth/me/").then((r) => r.data),
};

export const users = {
  list: (params?: object) => results<User>("/auth/users/", params),
  create: (payload: Record<string, unknown>) =>
    api.post<User>("/auth/users/", payload).then((r) => r.data),
  update: (id: number, payload: Record<string, unknown>) =>
    api.patch<User>(`/auth/users/${id}/`, payload).then((r) => r.data),
};

export const areas = {
  list: () => results<Area>("/auth/areas/"),
  create: (payload: Partial<Area>) =>
    api.post<Area>("/auth/areas/", payload).then((r) => r.data),
};

export const reports = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get<Paginated<Report>>("/reports/", { params }).then((r) => r.data),
  detail: (id: number) => api.get<Report>(`/reports/${id}/`).then((r) => r.data),
  create: (payload: FormData | Record<string, unknown>) =>
    api.post<Report>("/reports/", payload).then((r) => r.data),
  assign: (id: number, assigned_to: number, note = "") =>
    api.post<Report>(`/reports/${id}/assign/`, { assigned_to, note }).then((r) => r.data),
  close: (id: number, closure_note: string) =>
    api.post<Report>(`/reports/${id}/close/`, { closure_note }).then((r) => r.data),
  changeStatus: (id: number, status: string, note = "") =>
    api.post<Report>(`/reports/${id}/change-status/`, { status, note }).then((r) => r.data),
};

export const categories = {
  list: () => results<Category>("/categories/"),
  create: (payload: Partial<Category>) =>
    api.post<Category>("/categories/", payload).then((r) => r.data),
};

export const iperc = {
  matrices: () => results<IpercMatrix>("/iperc/matrices/"),
  createMatrix: (payload: Record<string, unknown>) =>
    api.post<IpercMatrix>("/iperc/matrices/", payload).then((r) => r.data),
  updateMatrix: (id: number, payload: Record<string, unknown>) =>
    api.patch<IpercMatrix>(`/iperc/matrices/${id}/`, payload).then((r) => r.data),
  entries: (params?: object) => results<IpercEntry>("/iperc/entries/", params),
  createEntry: (payload: Record<string, unknown>) =>
    api.post<IpercEntry>("/iperc/entries/", payload).then((r) => r.data),
  updateEntry: (id: number, payload: Record<string, unknown>) =>
    api.patch<IpercEntry>(`/iperc/entries/${id}/`, payload).then((r) => r.data),
  deleteEntry: (id: number) => api.delete(`/iperc/entries/${id}/`).then(() => id),
};

export const epp = {
  items: () => results<EppItem>("/epp/items/"),
  createItem: (payload: Record<string, unknown>) =>
    api.post<EppItem>("/epp/items/", payload).then((r) => r.data),
  updateItem: (id: number, payload: Record<string, unknown>) =>
    api.patch<EppItem>(`/epp/items/${id}/`, payload).then((r) => r.data),
  deliveries: (params?: object) => results<EppDelivery>("/epp/deliveries/", params),
  createDelivery: (payload: Record<string, unknown>) =>
    api.post<EppDelivery>("/epp/deliveries/", payload).then((r) => r.data),
  acknowledge: (id: number) =>
    api.patch<EppDelivery>(`/epp/deliveries/${id}/`, { acknowledged: true }).then((r) => r.data),
};

export const inspections = {
  schedules: () => results<InspectionSchedule>("/inspections/schedules/"),
  createSchedule: (payload: Record<string, unknown>) =>
    api.post<InspectionSchedule>("/inspections/schedules/", payload).then((r) => r.data),
  generateNext: (scheduleId: number) =>
    api
      .post<Inspection>(`/inspections/schedules/${scheduleId}/generate-next/`)
      .then((r) => r.data),
  list: (params?: object) => results<Inspection>("/inspections/", params),
  complete: (id: number, findings: string, checklistResults: Record<string, boolean>) =>
    api
      .post<Inspection>(`/inspections/${id}/complete/`, {
        findings,
        results: checklistResults,
      })
      .then((r) => r.data),
};

export const committee = {
  get: () => results<Committee>("/committee/").then((list) => list[0] ?? null),
  create: (payload: Record<string, unknown>) =>
    api.post<Committee>("/committee/", payload).then((r) => r.data),
  members: () => results<CommitteeMember>("/committee/members/"),
  addMember: (payload: Record<string, unknown>) =>
    api.post<CommitteeMember>("/committee/members/", payload).then((r) => r.data),
  meetings: () => results<Meeting>("/committee/meetings/"),
  createMeeting: (payload: Record<string, unknown>) =>
    api.post<Meeting>("/committee/meetings/", payload).then((r) => r.data),
  updateMeeting: (id: number, payload: Record<string, unknown>) =>
    api.patch<Meeting>(`/committee/meetings/${id}/`, payload).then((r) => r.data),
  addAgreement: (payload: Record<string, unknown>) =>
    api.post<Agreement>("/committee/agreements/", payload).then((r) => r.data),
  updateAgreement: (id: number, payload: Record<string, unknown>) =>
    api.patch<Agreement>(`/committee/agreements/${id}/`, payload).then((r) => r.data),
  compliance: () =>
    api.get<CommitteeCompliance>("/committee-compliance/").then((r) => r.data),
};

export const metrics = {
  mttr: (days = 90) =>
    api.get<MttrMetrics>("/metrics/mttr/", { params: { days } }).then((r) => r.data),
  compliance: (days = 90) =>
    api
      .get<ComplianceMetrics>("/metrics/inspection-compliance/", { params: { days } })
      .then((r) => r.data),
  summary: () => api.get("/metrics/reports-summary/").then((r) => r.data),
};

export const experiments = {
  myVariant: (key = "report_form") =>
    api.get<Assignment>("/experiments/my-variant/", { params: { key } }).then((r) => r.data),
  results: (key = "report_form") =>
    api.get<ExperimentResults>(`/experiments/${key}/results/`).then((r) => r.data),
};

/**
 * Descarga un .xlsx de evidencia.
 *
 * Va por axios y no por un <a href> porque el endpoint exige el token JWT en la cabecera:
 * un enlace directo llegaría sin autenticación y devolvería 401.
 */
export const exportar = async (
  recurso: "reports" | "iperc" | "epp" | "inspections" | "committee",
  params?: object,
) => {
  const response = await api.get(`/exports/${recurso}.xlsx`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${recurso}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};

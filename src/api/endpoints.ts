import { api } from "./client";
import type {
  Area,
  Category,
  ComplianceMetrics,
  ExperimentResults,
  MttrMetrics,
  Paginated,
  Report,
  User,
} from "./types";

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
};

export const catalog = {
  areas: () => api.get<Paginated<Area>>("/auth/areas/").then((r) => r.data.results),
  categories: () => api.get<Paginated<Category>>("/categories/").then((r) => r.data.results),
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
  results: (key = "report_form") =>
    api.get<ExperimentResults>(`/experiments/${key}/results/`).then((r) => r.data),
};

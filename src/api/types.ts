/** Tipos que reflejan el contrato del API (sst-api). Si cambia el API, cambia este archivo. */

export type Role = "OPERARIO" | "SUPERVISOR" | "COMITE" | "ADMIN";
export type ReportKind = "ACTO" | "CONDICION";
export type Severity = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
export type ReportStatus = "ABIERTO" | "EN_PROCESO" | "CERRADO" | "DESCARTADO";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  dni: string;
  phone: string;
  company: number | null;
  company_name?: string;
  area: number | null;
  area_name?: string | null;
}

export interface Area {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  kind: ReportKind;
  icon: string;
  is_active: boolean;
}

export interface ReportAction {
  id: number;
  note: string;
  new_status: ReportStatus | "";
  author_name: string;
  created_at: string;
}

export interface Report {
  id: number;
  client_uuid: string;
  kind: ReportKind;
  category: number | null;
  category_name: string | null;
  area: number | null;
  area_name: string | null;
  description: string;
  severity: Severity;
  photo: string | null;
  latitude: string | null;
  longitude: string | null;
  status: ReportStatus;
  assigned_to: number | null;
  assigned_to_name: string | null;
  closure_note: string;
  reported_by: number;
  reported_by_name: string;
  occurred_at: string;
  created_at: string;
  closed_at: string | null;
  resolution_hours: number | null;
  form_variant: string;
  synced_offline: boolean;
  actions: ReportAction[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MttrMetrics {
  window_days: number;
  closed_reports: number;
  open_reports: number;
  mttr_hours: number | null;
  by_severity: Record<string, { mttr_hours: number; closed: number }>;
}

export interface ComplianceMetrics {
  window_days: number;
  scheduled: number;
  performed: number;
  pending: number;
  overdue: number;
  compliance_rate_pct: number | null;
  by_area: { area: string | null; scheduled: number; performed: number }[];
}

export interface ExperimentResults {
  experiment: { key: string; name: string; description: string; variants: string[] };
  results: {
    variant: string;
    users: number;
    reports: number;
    reports_per_user: number | null;
    reports_with_photo: number;
    mttr_hours: number | null;
    daily: { day: string; total: number }[];
  }[];
  lift_pct_first_vs_second: number | null;
}

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

// ---------------------------------------------------------------------------
// IPERC
// ---------------------------------------------------------------------------

export type MatrixStatus = "BORRADOR" | "VIGENTE" | "HISTORICA";
export type RiskLevel = "TRIVIAL" | "TOLERABLE" | "MODERADO" | "IMPORTANTE" | "INTOLERABLE";

export interface IpercEntry {
  id: number;
  matrix: number;
  area: number;
  area_name: string;
  job_position: string;
  hazard: string;
  risk: string;
  probability: number;
  consequence: number;
  risk_score: number;
  risk_level: RiskLevel;
  existing_controls: string;
  proposed_controls: string;
  responsible: number | null;
  source_report: number | null;
  updated_at: string;
}

export interface IpercMatrix {
  id: number;
  version: number;
  status: MatrixStatus;
  valid_from: string | null;
  approved_by: number | null;
  created_at: string;
  entry_count: number;
  entries: IpercEntry[];
}

// ---------------------------------------------------------------------------
// EPP
// ---------------------------------------------------------------------------

export interface EppItem {
  id: number;
  name: string;
  description: string;
  lifespan_days: number;
  stock: number;
  is_active: boolean;
}

export interface EppDelivery {
  id: number;
  item: number;
  item_name: string;
  worker: number;
  worker_name: string;
  delivered_by: number | null;
  quantity: number;
  delivered_at: string;
  expires_at: string | null;
  acknowledged: boolean;
  notes: string;
  is_expired: boolean;
}

// ---------------------------------------------------------------------------
// Inspecciones
// ---------------------------------------------------------------------------

export type Frequency = "SEMANAL" | "QUINCENAL" | "MENSUAL" | "TRIMESTRAL";
export type InspectionStatus = "PENDIENTE" | "REALIZADA" | "VENCIDA";

export interface InspectionSchedule {
  id: number;
  title: string;
  area: number;
  area_name: string;
  checklist: string[];
  frequency: Frequency;
  responsible: number | null;
  is_active: boolean;
}

export interface Inspection {
  id: number;
  schedule: number;
  title: string;
  area_name: string;
  due_date: string;
  performed_at: string | null;
  performed_by: number | null;
  status: InspectionStatus;
  findings: string;
  results: Record<string, boolean>;
  is_overdue: boolean;
}

// ---------------------------------------------------------------------------
// Comité de SST
// ---------------------------------------------------------------------------

export type MemberRole = "PRESIDENTE" | "SECRETARIO" | "TITULAR" | "SUPLENTE" | "SUPERVISOR";
export type Represents = "EMPLEADOR" | "TRABAJADORES";
export type AgreementStatus = "PENDIENTE" | "EN_PROCESO" | "CUMPLIDO" | "NO_CUMPLIDO";

export interface CommitteeMember {
  id: number;
  committee: number;
  user: number;
  user_name: string;
  role: MemberRole;
  represents: Represents;
  is_active: boolean;
}

export interface Agreement {
  id: number;
  meeting: number;
  description: string;
  responsible: number | null;
  responsible_name: string | null;
  due_date: string | null;
  status: AgreementStatus;
  related_report: number | null;
  related_iperc_entry: number | null;
}

export interface Meeting {
  id: number;
  committee: number;
  number: number;
  date: string;
  place: string;
  is_extraordinary: boolean;
  agenda: string;
  minutes: string;
  attendees: number[];
  attendee_count: number;
  quorum_reached: boolean;
  agreements: Agreement[];
  created_at: string;
}

export interface Committee {
  id: number;
  period_start: string;
  period_end: string;
  is_supervisor_mode: boolean;
  members: CommitteeMember[];
  member_count: number;
  quorum_required: number;
  is_paritario: boolean;
}

export interface CommitteeCompliance {
  has_committee: boolean;
  is_supervisor_mode?: boolean;
  is_paritario?: boolean;
  members?: number;
  quorum_required?: number;
  meetings_total?: number;
  meetings_with_quorum?: number;
  agreements_total?: number;
  agreements_done?: number;
  agreements_pending?: number;
  agreements_compliance_pct?: number | null;
}

// ---------------------------------------------------------------------------
// Experimento A/B
// ---------------------------------------------------------------------------

export interface Assignment {
  id: number;
  experiment: number;
  experiment_key: string;
  variant: string;
  assigned_at: string;
}

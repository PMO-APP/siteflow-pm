-- ============================================================
-- LAKOWE LAKES SPA — SUPABASE DATABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── PROFILES (extends Supabase auth.users) ───────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  role text not null default 'viewer'
    check (role in ('admin','pm','engineer','contractor','client','viewer')),
  company text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TASKS (Programme Schedule) ──────────────────────────
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  task_number integer,
  name text not null,
  phase text not null,
  category text,
  start_date date,
  finish_date date,
  duration_days integer generated always as
    (case when finish_date is not null and start_date is not null
     then (finish_date - start_date) + 1 else null end) stored,
  dependencies text,
  responsible text,
  status text default 'Not Started'
    check (status in ('Not Started','In Progress','Completed','On Hold','Blocked')),
  rag text default 'GREEN' check (rag in ('RED','AMBER','GREEN','')),
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  procurement_deadline date,
  approval_deadline date,
  notes text,
  is_milestone boolean default false,
  actual_start date,
  actual_finish date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "All authenticated users can view tasks" on public.tasks for select using (auth.role() = 'authenticated');
create policy "PMs and admins can modify tasks" on public.tasks for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer'))
);

-- ─── PROCUREMENT ITEMS ────────────────────────────────────
create table public.procurement_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  specification text,
  category text,
  quantity numeric,
  unit text,
  unit_cost numeric,
  total_cost numeric generated always as (quantity * coalesce(unit_cost, 0)) stored,
  currency text default 'NGN',
  vendor text,
  vendor_contact text,
  vendor_email text,
  order_by_date date,
  required_on_site date,
  lead_time_days integer,
  is_imported boolean default false,
  customs_clearance_days integer,
  status text default 'Pending'
    check (status in ('Pending','RFQ Sent','PO Raised','Ordered','In Transit','Customs','Delivered','Rejected')),
  po_number text,
  po_date date,
  delivery_date date,
  notes text,
  task_id uuid references public.tasks(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.procurement_items enable row level security;
create policy "Authenticated users view procurement" on public.procurement_items for select using (auth.role() = 'authenticated');
create policy "PM+ can modify procurement" on public.procurement_items for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer'))
);

-- ─── APPROVALS ───────────────────────────────────────────
create table public.approvals (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  type text not null
    check (type in ('Material','Shop Drawing','Design','Sample','RFI Response','Client Signoff','Other')),
  description text,
  submitted_by uuid references public.profiles(id),
  submitted_date date,
  deadline date,
  reviewer_id uuid references public.profiles(id),
  status text default 'Draft'
    check (status in ('Draft','Submitted','Under Review','Approved','Rejected','Resubmit')),
  approved_by uuid references public.profiles(id),
  approved_date date,
  rejection_reason text,
  revision_number integer default 1,
  task_id uuid references public.tasks(id),
  procurement_id uuid references public.procurement_items(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.approvals enable row level security;
create policy "Authenticated can view approvals" on public.approvals for select using (auth.role() = 'authenticated');
create policy "Can manage own approvals" on public.approvals for all using (auth.role() = 'authenticated');

-- ─── SITE REPORTS ────────────────────────────────────────
create table public.site_reports (
  id uuid default uuid_generate_v4() primary key,
  report_date date not null,
  report_type text default 'Daily' check (report_type in ('Daily','Weekly')),
  weather text,
  temperature_c integer,
  works_carried_out text,
  planned_vs_actual text,
  overall_progress_pct integer check (overall_progress_pct between 0 and 100),
  -- Labour
  total_labour integer default 0,
  skilled_labour integer default 0,
  unskilled_labour integer default 0,
  -- Equipment
  equipment_on_site text,
  -- Safety
  safety_incidents integer default 0,
  safety_notes text,
  near_misses integer default 0,
  -- Issues
  issues_encountered text,
  actions_required text,
  materials_received text,
  visitors text,
  -- Next day plan
  next_day_plan text,
  submitted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.site_reports enable row level security;
create policy "Authenticated view site reports" on public.site_reports for select using (auth.role() = 'authenticated');
create policy "Engineers+ can submit reports" on public.site_reports for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer','contractor'))
);

-- ─── SITE PHOTOS ─────────────────────────────────────────
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  storage_path text not null,
  public_url text,
  caption text,
  location text,
  photo_date date default current_date,
  report_id uuid references public.site_reports(id) on delete cascade,
  task_id uuid references public.tasks(id),
  snag_id uuid references public.snags(id),
  approval_id uuid references public.approvals(id),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
-- (snag_id FK will work after snags table created — see below)
alter table public.photos enable row level security;
create policy "Authenticated can view photos" on public.photos for select using (auth.role() = 'authenticated');
create policy "Authenticated can upload photos" on public.photos for insert with check (auth.role() = 'authenticated');

-- ─── SNAGS ───────────────────────────────────────────────
create table public.snags (
  id uuid default uuid_generate_v4() primary key,
  snag_number serial,
  title text not null,
  description text,
  location text,
  room text,
  severity text default 'Minor'
    check (severity in ('Critical','Major','Minor')),
  status text default 'Open'
    check (status in ('Open','In Progress','Pending Verification','Closed')),
  assigned_to uuid references public.profiles(id),
  assigned_contractor text,
  raised_by uuid references public.profiles(id),
  raised_date date default current_date,
  target_close_date date,
  closed_date date,
  verified_by uuid references public.profiles(id),
  task_id uuid references public.tasks(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.snags enable row level security;
create policy "Authenticated view snags" on public.snags for select using (auth.role() = 'authenticated');
create policy "Authenticated manage snags" on public.snags for all using (auth.role() = 'authenticated');

-- ─── DOCUMENTS ───────────────────────────────────────────
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  document_number text,
  type text not null
    check (type in ('Drawing','Specification','BOQ','Contract','RFI','Method Statement','Submittal','Report','Other')),
  discipline text check (discipline in ('Architectural','Structural','MEP','ELV','Landscape','General')),
  revision text default 'A',
  revision_date date,
  status text default 'Current'
    check (status in ('Draft','For Review','Current','Superseded','Void')),
  storage_path text,
  public_url text,
  file_size_kb integer,
  file_type text,
  description text,
  issued_by text,
  approved_by uuid references public.profiles(id),
  task_id uuid references public.tasks(id),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Authenticated view documents" on public.documents for select using (auth.role() = 'authenticated');
create policy "PM+ manage documents" on public.documents for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer'))
);

-- ─── FINANCIAL / VARIATIONS ──────────────────────────────
create table public.financial_items (
  id uuid default uuid_generate_v4() primary key,
  type text not null
    check (type in ('Contract Sum','Variation','Provisional Sum','Contingency','PC Sum','Payment','Retention')),
  reference text,
  description text not null,
  amount numeric not null default 0,
  currency text default 'NGN',
  direction text check (direction in ('Addition','Omission','N/A')) default 'N/A',
  status text default 'Pending'
    check (status in ('Pending','Submitted','Approved','Rejected','Certified','Paid')),
  submitted_date date,
  approved_date date,
  certified_date date,
  payment_date date,
  submitted_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.financial_items enable row level security;
create policy "Authenticated view financial" on public.financial_items for select using (auth.role() = 'authenticated');
create policy "Admin/PM manage financial" on public.financial_items for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm'))
);

-- ─── RISKS ───────────────────────────────────────────────
create table public.risks (
  id uuid default uuid_generate_v4() primary key,
  risk_number serial,
  title text not null,
  description text,
  category text check (category in ('Procurement','Programme','Design','Financial','Safety','External','Contractor')),
  likelihood integer check (likelihood between 1 and 5) default 3,
  impact integer check (impact between 1 and 5) default 3,
  risk_score integer generated always as (likelihood * impact) stored,
  status text default 'Open' check (status in ('Open','Mitigated','Closed','Transferred')),
  mitigation_action text,
  contingency_action text,
  owner uuid references public.profiles(id),
  review_date date,
  closed_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.risks enable row level security;
create policy "Authenticated view risks" on public.risks for select using (auth.role() = 'authenticated');
create policy "PM+ manage risks" on public.risks for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer'))
);

-- ─── COMMENTS ────────────────────────────────────────────
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  author_id uuid references public.profiles(id) not null,
  -- Polymorphic references
  task_id uuid references public.tasks(id) on delete cascade,
  snag_id uuid references public.snags(id) on delete cascade,
  procurement_id uuid references public.procurement_items(id) on delete cascade,
  approval_id uuid references public.approvals(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  risk_id uuid references public.risks(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.comments enable row level security;
create policy "Authenticated view comments" on public.comments for select using (auth.role() = 'authenticated');
create policy "Authenticated post comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "Authors edit own comments" on public.comments for update using (auth.uid() = author_id);

-- ─── MEETING MINUTES ─────────────────────────────────────
create table public.meetings (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  meeting_date date not null,
  meeting_type text check (meeting_type in ('Site','Design','Client','Contractor','Progress','Other')),
  location text,
  chair_id uuid references public.profiles(id),
  attendees text,
  agenda text,
  minutes text,
  action_points text,
  next_meeting_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.meetings enable row level security;
create policy "Authenticated view meetings" on public.meetings for select using (auth.role() = 'authenticated');
create policy "PM+ manage meetings" on public.meetings for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm','engineer'))
);

-- ─── CONTRACTOR PERFORMANCE ──────────────────────────────
create table public.contractor_scores (
  id uuid default uuid_generate_v4() primary key,
  contractor_name text not null,
  period_month integer check (period_month between 1 and 12),
  period_year integer,
  quality_score integer check (quality_score between 1 and 10),
  programme_score integer check (programme_score between 1 and 10),
  safety_score integer check (safety_score between 1 and 10),
  communication_score integer check (communication_score between 1 and 10),
  overall_score numeric generated always as
    ((quality_score + programme_score + safety_score + communication_score)::numeric / 4) stored,
  notes text,
  scored_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.contractor_scores enable row level security;
create policy "Authenticated view scores" on public.contractor_scores for select using (auth.role() = 'authenticated');
create policy "PM+ manage scores" on public.contractor_scores for all using (
  exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','pm'))
);

-- ─── NOTIFICATIONS ───────────────────────────────────────
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  message text,
  type text check (type in ('alert','info','success','warning')),
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- ─── STORAGE BUCKETS ─────────────────────────────────────
-- Run these in Supabase Dashboard → Storage (or via API):
-- insert into storage.buckets (id, name, public) values ('site-photos', 'site-photos', true);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- insert into storage.buckets (id, name, public) values ('snag-photos', 'snag-photos', true);
-- insert into storage.buckets (id, name, public) values ('approval-docs', 'approval-docs', false);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage policies (run after creating buckets)
-- create policy "Anyone can view site photos" on storage.objects for select using (bucket_id = 'site-photos');
-- create policy "Auth users upload site photos" on storage.objects for insert with check (bucket_id = 'site-photos' and auth.role() = 'authenticated');

-- ─── REALTIME ────────────────────────────────────────────
-- Enable realtime for key tables in Supabase Dashboard → Database → Replication
-- Or run:
-- alter publication supabase_realtime add table public.tasks;
-- alter publication supabase_realtime add table public.snags;
-- alter publication supabase_realtime add table public.comments;
-- alter publication supabase_realtime add table public.notifications;

-- ─── SEED DATA — Programme Tasks ─────────────────────────
insert into public.tasks (task_number, name, phase, start_date, finish_date, dependencies, status, procurement_deadline, approval_deadline, notes) values
(1,'Column Kickers and Formwork','Program Schedule','2026-04-20','2026-04-23',null,'Completed',null,null,''),
(2,'Column Concreting','Program Schedule','2026-04-24','2026-05-02','1','In Progress',null,'2026-04-23',''),
(3,'Block Work below lintels','Program Schedule','2026-05-05','2026-05-14','2','Not Started',null,'2026-05-04',''),
(4,'Lintels','Program Schedule','2026-05-15','2026-05-19','3','Not Started',null,null,''),
(5,'Block work above lintels','Program Schedule','2026-05-20','2026-05-23','4','Not Started',null,null,''),
(6,'M&E First Fix (Superstructure)','Program Schedule','2026-05-21','2026-05-24','3','Not Started','2026-05-01',null,'Conduits, initial wiring'),
(7,'Roof beams formwork','Program Schedule','2026-05-23','2026-05-25','5','Not Started',null,null,''),
(8,'Roof beam Concreting','Program Schedule','2026-05-26','2026-05-27','7','Not Started',null,null,''),
(9,'Roof carcass and covering','Program Schedule','2026-05-28','2026-06-11','8','Not Started','2026-05-01',null,''),
(10,'External Walls Plastering/Rendering','Program Schedule','2026-06-12','2026-06-26','9','Not Started',null,null,''),
(11,'Doors and window installation','Program Schedule','2026-06-27','2026-07-10','10','Not Started',null,null,''),
(12,'Cladding (External Walls)','Program Schedule','2026-06-27','2026-07-31','10','Not Started','2026-05-15',null,'KALSI board — long lead'),
(13,'Internal Waterproofing & Plastering','Internal "Wet works" (Contractor)','2026-06-01','2026-06-15','3','Not Started',null,null,''),
(14,'M&E Second Fix (Wiring, Piping)','Internal "Wet works" (Contractor)','2026-06-16','2026-06-30','6','Not Started',null,null,''),
(15,'Ceiling Installation (P.O.P/Timber)','Internal "Wet works" (Contractor)','2026-07-01','2026-07-15','14','Not Started',null,null,''),
(16,'Floor Screeding & Tiling','Internal "Wet works" (Contractor)','2026-07-16','2026-08-15','15','Not Started','2026-06-15','2026-05-14','Tiles — long lead'),
(17,'ELV','Internal "Wet works" (Contractor)','2026-07-16','2026-07-30',null,'Not Started','2026-07-15',null,''),
(18,'Painting','Internal "Wet works" (Contractor)','2026-08-16','2026-08-20','17','Not Started','2026-08-01',null,''),
(19,'Canopy Installation','External Works Phase','2026-08-01','2026-08-10','9','Not Started','2026-07-15','2026-06-01',''),
(20,'Driveway Construction','External Works Phase','2026-08-11','2026-08-25','1','Not Started',null,null,''),
(21,'External MEP connection','External Works Phase','2026-08-01','2026-08-14','9','Not Started','2026-07-01','2026-06-01',''),
(22,'Landscaping & Garden Works','External Works Phase','2026-08-20','2026-09-05','19','Not Started','2026-08-01','2026-07-01',''),
(23,'Specialist (Hammam/Koi/cascade)','Internal works & Interior Design','2026-08-01','2026-08-31','9','Not Started','2026-06-01','2026-05-01','Long lead — order now'),
(24,'Interior Design','Internal works & Interior Design','2026-08-01','2026-09-10','16','Not Started','2026-07-15','2026-06-01',''),
(25,'M&E Final Fix & Sanitary Wares','Internal works & Interior Design','2026-08-20','2026-08-25','17','Not Started','2026-08-01','2026-07-01',''),
(26,'Signages','Internal works & Interior Design','2026-09-01','2026-09-08','19','Not Started','2026-08-15','2026-07-10',''),
(27,'Testing & Commissioning','Internal works & Interior Design','2026-08-25','2026-09-17','15','Not Started',null,null,''),
(28,'Snagging','Internal works & Interior Design','2026-09-05','2026-09-17','27','Not Started',null,null,''),
(29,'Formal Handover','Internal works & Interior Design','2026-09-18','2026-09-18','28','Not Started',null,null,'Target date');

-- ─── SEED DATA — Financial Base ───────────────────────────
insert into public.financial_items (type, reference, description, amount, currency, direction, status) values
('Contract Sum','CS-001','Main Building Contract — Works',0,'NGN','N/A','Approved'),
('Provisional Sum','PS-001','Hammam Specialist Works',0,'NGN','N/A','Pending'),
('Provisional Sum','PS-002','Koi Pond Specialist',0,'NGN','N/A','Pending'),
('Contingency','CT-001','Project Contingency (10%)',0,'NGN','N/A','Approved'),
('Retention','RT-001','Retention held (5%)',0,'NGN','N/A','Pending');

-- ─── SEED DATA — Key Risks ────────────────────────────────
insert into public.risks (title, description, category, likelihood, impact, status, mitigation_action) values
('Curtain wall glazing delay','Specialist item — long lead, import risk','Procurement',4,5,'Open','Order immediately. Identify local alternative supplier.'),
('Hammam stone table import','Specialist import item — customs delay likely','Procurement',4,4,'Open','Engage specialist now. Confirm port of entry requirements.'),
('Tile approval delay affecting programme','Tile selection not yet finalised — affects screeding start','Design',3,4,'Open','Chase architect for final tile schedule by 14 May.'),
('MEP clash with ceiling works','M&E second fix must precede ceiling — risk of out-of-sequence work','Programme',3,3,'Open','Confirm MEP programme with OMIJLED before July.'),
('Steam generator sizing','M&E spec may require structural penetrations — needs confirmation','Design',2,4,'Open','OMIJLED to provide confirmed spec by end May.'),
('Specialist contractor not awarded','Multiple specialist works not yet awarded — programme risk','Contractor',4,5,'Open','Expedite award of all specialists by 13 May.'),
('Rain delays — external works','External works phase (Aug–Sep) coincides with wet season','External',3,3,'Open','Build weather float into external works programme.');

-- ─── SEED DATA — Approvals ───────────────────────────────
insert into public.approvals (title, type, submitted_date, deadline, status, notes) values
('Award of all specialist contractors','Client Signoff','2026-04-13','2026-05-13','Under Review','Interior designer, Koi, Hammam, water cascade, MEP, ELV, Driveway'),
('KALSI Cladding board sample','Sample','2026-04-21','2026-05-05','Under Review','Sample to be approved by architect'),
('Floor tile selection — CDK range','Material','2026-04-27','2026-05-14','Under Review','FL-01 to FL-04 as per A-604'),
('Paint colour schedule','Material','2026-04-27','2026-05-27','Under Review','Full colour schedule for all rooms'),
('Roof covering material','Material',null,'2026-05-25','Draft','To be specified by architect'),
('Interior design drawings','Shop Drawing','2026-05-14','2026-05-29','Draft','Requires specialist award first'),
('Canopy and driveway design','Design',null,'2026-06-01','Draft','Including material specifications'),
('FF & E selection','Client Signoff',null,'2026-07-01','Draft','Furniture, fittings and equipment schedule'),
('Landscape design','Design',null,'2026-08-01','Draft','Full planting scheme and hard landscape');

-- ─── INDEXES ─────────────────────────────────────────────
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_phase on public.tasks(phase);
create index idx_tasks_start on public.tasks(start_date);
create index idx_procurement_status on public.procurement_items(status);
create index idx_procurement_order_by on public.procurement_items(order_by_date);
create index idx_approvals_status on public.approvals(status);
create index idx_approvals_deadline on public.approvals(deadline);
create index idx_snags_status on public.snags(status);
create index idx_snags_severity on public.snags(severity);
create index idx_site_reports_date on public.site_reports(report_date);
create index idx_risks_score on public.risks(risk_score);
create index idx_comments_task on public.comments(task_id);
create index idx_notifications_user on public.notifications(user_id, is_read);

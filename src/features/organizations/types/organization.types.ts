export type OrganizationType = 'consultant' | 'contractor' | 'vendor' | 'client' | 'other';
export type OrganizationStatus = 'active' | 'inactive' | 'suspended';
export type OrganizationMemberRole =
  | 'organization_admin'
  | 'project_manager'
  | 'engineer'
  | 'architect'
  | 'quantity_surveyor'
  | 'viewer';

export interface Organization {
  id: string;
  name: string;
  code: string | null;
  organization_type: OrganizationType;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  is_active: boolean;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface OrganizationProjectMembership {
  id: string;
  organization_id: string;
  project_id: number;
  portal_role: OrganizationType;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  project?: {
    id: number;
    name: string;
  };
}

export interface OrganizationEngagement {
  id: string;
  organization_id: string;
  project_id: number;
  title: string;
  reference: string | null;
  scope: string | null;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationMemberRole;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export const ADMIN = [
  'e.bio-ibogomo@mixtafrica.com',
  'ebikienmo.bi@gmail.com'
]

export const PROJECT_TEAM = [
  'b.durosinmi-etti@mixtafrica.com',
  'a.busari@mixtafrica.com',
  'b.mabinuori@mixtafrica.com',
  'h.ubong@mixtafrica.com',
  'k.audu@mixtafrica.com',
  'l.onunaku@mixtafrica.com',
  'o.makinde@mixtafrica.com',
  's.awoleye@mixtafrica.com',
  't.banjo@mixtafrica.com',
  'w.salami@mixtafrica.com',
  'h.kacou@mixtafrica.com',
  'd.odeh@mixtafrica.com'
]

export const DESIGN_TEAM = [
  'a.adesiyun@mixtafrica.com',
  'a.arokodare@mixtafrica.com',
  'a.uwuigbe@mixtafrica.com',
  'o.shobajo@mixtafrica.com',
  'o.ashafa@mixtafrica.com',
  'o.edo-osagie@mixtafrica.com'
]

export const COSTING_TEAM = [
  'a.uwa-agbonikhena@mixtafrica.com',
  'j.olowe@mixtafrica.com',
  'o.james@mixtafrica.com',
  'o.ogunewu@mixtafrica.com',
  't.ibidokun@mixtafrica.com'
]

export type UserRole =
  | 'workspace_admin'
  | 'admin'
  | 'project_owner'
  | 'project'
  | 'design'
  | 'costing'
  | 'guest'

export function getRole(email?: string): UserRole {
  if (!email) return 'guest'

  email = email.toLowerCase()

  if (ADMIN.includes(email)) return 'admin'

  // TEMPORARY
  if (
    email === 'e.bio-ibogomo@mixtafrica.com' ||
    email === 'ebikienmo.bi@gmail.com'
  ) {
    return 'project_owner'
  }

  if (PROJECT_TEAM.includes(email)) return 'project'

  if (DESIGN_TEAM.includes(email)) return 'design'

  if (COSTING_TEAM.includes(email)) return 'costing'

  return 'guest'
}

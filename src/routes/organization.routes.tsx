import { RouteObject } from 'react-router-dom';
import OrganizationsPage from '../features/organizations/pages/OrganizationsPage';
import CreateOrganizationPage from '../features/organizations/pages/CreateOrganizationPage';
import OrganizationDetailPage from '../features/organizations/pages/OrganizationDetailPage';

export const organizationRoutes: RouteObject[] = [
  {
    path: '/internal/admin/organizations',
    element: <OrganizationsPage />,
  },
  {
    path: '/internal/admin/organizations/new',
    element: <CreateOrganizationPage />,
  },
  {
    path: '/internal/admin/organizations/:organizationId',
    element: <OrganizationDetailPage />,
  },
];

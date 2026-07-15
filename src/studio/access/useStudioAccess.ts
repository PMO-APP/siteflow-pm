import { useMembershipStore } from '@/store/membership'
import {
  getStudioCapabilities,
  hasStudioCapability,
} from './studioCapabilityMatrix'
import type { StudioCapability } from './studioCapabilities'

export function useStudioAccess() {
  const role = useMembershipStore(state => state.role)

  const capabilities =
    getStudioCapabilities(role)

  return {
    role,
    capabilities,
    canAccessStudio:
      hasStudioCapability(role, 'studio.access'),
    can:
      (capability: StudioCapability) =>
        hasStudioCapability(role, capability),
  }
}

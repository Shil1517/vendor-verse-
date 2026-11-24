import { Explore } from './customer1.jsx'
import { RemoteExplore } from './remote-discovery.jsx'
import { authService } from '../services/authService.js'

// Supplier marketplace for vendor buyers. With the API configured it searches real listings
// from verified suppliers and manufacturers (GET /discover/listings?vendorRole=...). Without it,
// it keeps the marketplace visual system shared with customer Explore on the seed data.
export function VendorExplore({ params = {} }) {
  if (authService.isRemote) return <RemoteExplore params={params} supplierOnly />
  return <Explore params={{ ...params, mode: params.mode || 'all' }} supplierOnlyOverride hideVendorMode />
}

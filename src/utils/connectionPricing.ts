// Ported from the web app (client/src/lib/package-proration.ts and the
// discount helper in connection-form.tsx) so the amounts shown before saving
// match exactly what the backend uses.

import {Package} from '../types';

// Monthly package fee for the selected connection type. Mirrors getPackagePrice
// in controllers/connection.go.
export function monthlyPackageFee(
  connectionType?: string | null,
  amount?: number | null,
  sameAmount?: number | null,
): number {
  const cable = Number(amount) || 0;
  const internet = Number(sameAmount) || 0;
  if (connectionType === 'internet') {
    return internet;
  }
  if (connectionType === 'both') {
    return cable + internet;
  }
  return cable;
}

export function calcDiscountedAmount(base: number, discount: string): number {
  switch (discount) {
    case 'quarter':
      return Math.round(base * 0.75);
    case 'half':
      return Math.round(base * 0.5);
    case 'full_free':
      return 0;
    case 'no_discount':
    case 'custom':
    default:
      return base;
  }
}

export function packagePrice(pkg?: Package): number {
  if (!pkg) {
    return 0;
  }
  return pkg.salePrice && pkg.salePrice > 0 ? pkg.salePrice : pkg.price;
}

export function formatPkr(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function resolvePackage(
  packages: Package[],
  name: string,
  id?: string,
): Package | undefined {
  if (id) {
    const byId = packages.find(p => p.id === id);
    if (byId) {
      return byId;
    }
  }
  return packages.find(p => p.name === name);
}
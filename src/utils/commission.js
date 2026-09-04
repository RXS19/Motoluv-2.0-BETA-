/**
 * Regla de cobro de comisión en vendedores de Motoluv:
 * - $0 a $30,000: 10%
 * - $30,001 a $50,000: 8%
 * - $50,001 a $150,000: 7%
 * - $150,001 a $300,000: 6%
 * - Mayor a $300,000: 5% (Gama Alta)
 */

export const COMMISSION_TIERS = [
  { max: 30000, rate: 0.10, label: '$0 - $30,000 MXN' },
  { max: 50000, rate: 0.08, label: '$30,001 - $50,000 MXN' },
  { max: 150000, rate: 0.07, label: '$50,001 - $150,000 MXN' },
  { max: 300000, rate: 0.06, label: '$150,001 - $300,000 MXN' },
  { max: Infinity, rate: 0.05, label: 'Más de $300,000 MXN' },
];

export function getCommissionRate(price) {
  const numericPrice = Number(price) || 0;
  if (numericPrice <= 30000) {
    return 0.10; // 10%
  } else if (numericPrice <= 50000) {
    return 0.08; // 8%
  } else if (numericPrice <= 150000) {
    return 0.07; // 7%
  } else if (numericPrice <= 300000) {
    return 0.06; // 6%
  } else {
    return 0.05; // 5%
  }
}

export function calculateCommission(price) {
  const numericPrice = Number(price) || 0;
  const rate = getCommissionRate(numericPrice);
  const percentageLabel = `${Math.round(rate * 100)}%`;
  const commissionAmount = Math.round(numericPrice * rate);
  const netEarnings = Math.max(0, numericPrice - commissionAmount);

  return {
    price: numericPrice,
    rate,
    percentageLabel,
    commissionAmount,
    netEarnings,
    netAmount: netEarnings,
  };
}

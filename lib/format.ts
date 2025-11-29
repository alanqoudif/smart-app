const OMR_FORMATTER = new Intl.NumberFormat('ar-OM', {
  style: 'currency',
  currency: 'OMR',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export function formatCurrency(value: number, options?: { currency?: string }) {
  if (options?.currency && options.currency !== 'OMR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: options.currency,
      maximumFractionDigits: 3,
    }).format(value);
  }

  return OMR_FORMATTER.format(value);
}

export function formatPhone(phone: string) {
  if (phone.startsWith('+968')) {
    return phone.slice(4);
  }
  return phone;
}

export function formatShortDate(date: string) {
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${
    d.getMonth() + 1
  }/${d.getDate()}`;
}

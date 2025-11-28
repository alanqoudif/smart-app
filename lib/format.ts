const SAR_FORMATTER = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, options?: { currency?: string }) {
  if (options?.currency && options.currency !== 'SAR') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: options.currency,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return SAR_FORMATTER.format(value);
}

export function formatPhone(phone: string) {
  if (phone.startsWith('+966')) {
    return `0${phone.slice(4)}`;
  }
  return phone;
}

export function formatShortDate(date: string) {
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${
    d.getMonth() + 1
  }/${d.getDate()}`;
}

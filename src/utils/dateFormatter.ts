/**
 * Helper to format dates into standard Gregorian calendar representation (ميلادي).
 */
export const formatGregorianDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '';
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) {
      if (typeof dateVal === 'string') return dateVal.split('T')[0] || dateVal;
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day} م`;
  } catch {
    return typeof dateVal === 'string' ? dateVal.split('T')[0] || dateVal : '';
  }
};

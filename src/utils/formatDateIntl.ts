/**
 * Formats a Date object into "dd / MON hh:mm" format using the Intl API.
 * (e.g., "25/Oct 14:30").
 * @param date The Date object to format.
 * @param locale The locale to use for the month name (e.g., 'en', 'es', 'fr').
 * @returns The formatted date and time string.
 */
const formatDateIntl = (date: Date, locale: string): string => {
  // Use Intl.DateTimeFormat to get all the necessary parts of the date and time.
  const formatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Ensures 24-hour format for hh:mm
  });

  // formatToParts gives an array like: [{type: 'day', value: '25'}, ...]
  const parts = formatter.formatToParts(date);

  // Find the specific parts we need from the array
  const dayPart = parts.find((part) => part.type === 'day');
  const monthPart = parts.find((part) => part.type === 'month');
  const hourPart = parts.find((part) => part.type === 'hour');
  const minutePart = parts.find((part) => part.type === 'minute');

  // Extract the string values from the parts
  const day = dayPart ? dayPart.value : '';
  // Capitalize the first letter of the month for consistency
  const month = monthPart
    ? monthPart.value.charAt(0).toUpperCase() + monthPart.value.slice(1)
    : '';
  const hour = hourPart ? hourPart.value : '';
  const minute = minutePart ? minutePart.value : '';

  // Safety check: if any part is missing, return a safe fallback.
  if (!day || !month || !hour || !minute) {
    return new Date().toLocaleString();
  }

  // Assemble the final string in the desired custom format.
  return `${day}/${month} ${hour}:${minute}`;
};
export default formatDateIntl;

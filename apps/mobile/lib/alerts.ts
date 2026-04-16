// Memory cache for dismissed alert categories for the current app session
const dismissedAlerts = new Set<string>();

export function isAlertDismissed(categoryName: string, month: number, year: number): boolean {
  const key = `${categoryName}-${month}-${year}`;
  return dismissedAlerts.has(key);
}

export function dismissAlert(categoryName: string, month: number, year: number) {
  const key = `${categoryName}-${month}-${year}`;
  dismissedAlerts.add(key);
}

export function clearDismissedAlerts() {
  dismissedAlerts.clear();
}

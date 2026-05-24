const AUTH_KEYS = [
  "userToken",
  "userPhone",
  "adminToken",
  "admin",
  "scannerToken",
  "scannerAuth",
  "scannerEmail",
];

export function clearAuthStorage() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function getTestBypassHeader(): Record<string,string> {
  try {
    const token = localStorage.getItem('bbc_test_bypass_token');
    if (token) return { 'X-Test-Bypass': token };
  } catch {/* ignore */}
  return {};
}

export function setTestBypassToken(token: string | null) {
  try {
    if (token) localStorage.setItem('bbc_test_bypass_token', token);
    else localStorage.removeItem('bbc_test_bypass_token');
  } catch {/* ignore */}
}

export function hasTestBypass(): boolean {
  try { return !!localStorage.getItem('bbc_test_bypass_token'); } catch { return false; }
}

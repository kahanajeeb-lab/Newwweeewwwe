const PIN_HASH_KEY = 'mahal_kita_pin_sha256';
const DEFAULT_PIN = '2580';

/**
 * Computes SHA-256 hash of a PIN using standard Web Crypto API
 */
async function hashPIN(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns true if the entered PIN matches the stored hash (or default 2580 if unset)
 */
export async function verifyPIN(enteredPin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  const enteredHash = await hashPIN(enteredPin);

  if (!storedHash) {
    const defaultHash = await hashPIN(DEFAULT_PIN);
    return enteredHash === defaultHash;
  }
  return enteredHash === storedHash;
}

/**
 * Safely changes the PIN with validation and confirmation
 */
export async function changePIN(
  currentPin: string,
  newPin: string,
  confirmPin: string
): Promise<{ success: boolean; error?: string }> {
  const isValidCurrent = await verifyPIN(currentPin);
  if (!isValidCurrent) {
    return { success: false, error: 'Current PIN is incorrect.' };
  }

  const cleanNew = newPin.trim();
  if (cleanNew.length < 4 || cleanNew.length > 8 || !/^\d+$/.test(cleanNew)) {
    return { success: false, error: 'New PIN must be 4 to 8 numeric digits.' };
  }

  if (cleanNew !== confirmPin.trim()) {
    return { success: false, error: 'New PIN and Confirmation PIN do not match.' };
  }

  const newHash = await hashPIN(cleanNew);
  localStorage.setItem(PIN_HASH_KEY, newHash);
  return { success: true };
}

/**
 * Resets PIN to default 2580 (e.g. on full app reset or explicit owner request)
 */
export function resetPINToDefault() {
  localStorage.removeItem(PIN_HASH_KEY);
}

export function isCustomPINConfigured(): boolean {
  return localStorage.getItem(PIN_HASH_KEY) !== null;
}

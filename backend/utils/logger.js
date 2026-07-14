// Centralized Logger for System & Security Auditing
// Ensures sensitive info like passwords, credit cards, or raw JWTs are never printed.

const maskSensitiveData = (data) => {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  const masked = { ...data };
  const sensitiveKeys = ['password', 'token', 'jwt', 'secret', 'panNumber', 'gstNumber', 'cvv', 'card', 'cardNumber', 'otp', 'newPassword'];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      masked[key] = '[MASKED]';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }
  return masked;
};

export const logSecurity = (event, metadata = {}) => {
  const cleanMeta = maskSensitiveData(metadata);
  console.log(`[SECURITY AUDIT] [${new Date().toISOString()}] Event: ${event} | Meta:`, JSON.stringify(cleanMeta));
};

export const logError = (message, error = null) => {
  console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error ? `| Details: ${error.message || error}` : '');
};

export const logInfo = (message, metadata = {}) => {
  const cleanMeta = maskSensitiveData(metadata);
  console.log(`[INFO] [${new Date().toISOString()}] ${message} | Meta:`, JSON.stringify(cleanMeta));
};

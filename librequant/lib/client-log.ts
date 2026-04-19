/**
 * Browser console logging with an optional build-time prefix for forks (OSS).
 * Set `NEXT_PUBLIC_CLIENT_LOG_PREFIX` (e.g. `MyQuant`) to replace the default `LibreQuant`.
 * Set to empty string to omit the bracketed prefix.
 */

function bracketPrefix(): string {
  const raw = process.env.NEXT_PUBLIC_CLIENT_LOG_PREFIX;
  if (raw === "") return "";
  const label = raw ?? "LibreQuant";
  return `[${label}]`;
}

function format(message: string): string {
  const b = bracketPrefix();
  return b ? `${b} ${message}` : message;
}

export function clientWarn(message: string, ...args: unknown[]): void {
  console.warn(format(message), ...args);
}

export function clientError(message: string, ...args: unknown[]): void {
  console.error(format(message), ...args);
}

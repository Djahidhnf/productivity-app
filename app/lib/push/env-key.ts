/** Env values pasted into a dashboard often keep their quotes or a trailing newline. */
export function cleanEnvKey(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '').trim();
}

export function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36)
  );
}

// Data local em ISO (yyyy-mm-dd) — NUNCA usar toISOString() pra "data de hoje":
// toISOString é UTC e, em UTC-3, depois das 21h retorna a data de AMANHÃ.
// Funciona tanto no server (Node usa a TZ do SO — o app roda na máquina do
// usuário via Electron/dev) quanto no client.

export function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

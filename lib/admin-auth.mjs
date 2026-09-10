export function parseAdminEmails(value = "") {
  return String(value)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user, configuredEmails = "") {
  if (!user) return false;
  const roles = Array.isArray(user.roles)
    ? user.roles
    : Array.isArray(user.appMetadata?.roles)
      ? user.appMetadata.roles
      : [];
  if (roles.includes("admin")) return true;
  const email = String(user.email || "").trim().toLowerCase();
  return Boolean(email) && parseAdminEmails(configuredEmails).includes(email);
}

export function progressSummary(state = {}, totalSessions = 0) {
  const completed = Array.isArray(state.completed) ? new Set(state.completed).size : 0;
  const badges = Array.isArray(state.badges) ? new Set(state.badges).size : 0;
  const reflections = state.reflections && typeof state.reflections === "object"
    ? Object.keys(state.reflections).length
    : 0;
  const percent = totalSessions > 0 ? Math.min(100, Math.round((completed / totalSessions) * 100)) : 0;
  return { completed, badges, reflections, percent };
}

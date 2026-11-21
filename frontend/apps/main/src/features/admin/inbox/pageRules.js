// Page rules for the widget's help articles. matchesPage mirrors the Go
// matcher proactive messages use (proactive.MatchesURL), so the admin preview
// picks the same rule the widget will.

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const matchesPage = (patterns, raw) => {
  let url
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (!url.host || (url.protocol !== 'https:' && url.protocol !== 'http:')) return false
  return (patterns || []).some((pattern) => {
    if (!pattern) return false
    const search = pattern.includes('?') ? url.search : ''
    let candidate = `${url.protocol}//${url.host}${url.pathname}${search}`
    if (pattern.startsWith('/')) candidate = `${url.pathname}${search}`
    else if (!pattern.includes('://') && !pattern.includes('/')) candidate = url.hostname
    else if (!pattern.includes('://')) candidate = `${url.host}${url.pathname}${search}`
    const expression = new RegExp(`^${escape(pattern).replaceAll('\\*', '.*')}$`)
    return expression.test(candidate)
  })
}

export const matchPageRule = (rules, raw) =>
  (rules || []).find((rule) => matchesPage((rule.pages || []).map((p) => p.trim()).filter(Boolean), raw)) ||
  null

export const MAX_PAGE_RULES = 100
export const MAX_PAGE_RULE_PATTERNS = 20
export const MAX_PAGE_RULE_ARTICLES = 10

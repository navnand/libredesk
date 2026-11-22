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

// Conditions ("Only when") narrow a rule to pages whose context, sent by the
// site as LibredeskSettings.pageContext, has one of the listed values for each
// key. Mirrors livechat.HelpPageRule.matches and ParseHelpPageContext in Go.
export const CONDITION_KEY = /^[a-z0-9_]{1,64}$/

// "role = viewer, editor" lines to [{ key, values }]; incomplete lines are skipped.
export const parseConditions = (text) =>
  (text || '')
    .split('\n')
    .map((line) => {
      const at = line.indexOf('=')
      if (at < 0) return null
      const key = line.slice(0, at).trim().toLowerCase()
      const values = line
        .slice(at + 1)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      return key && values.length ? { key, values } : null
    })
    .filter(Boolean)

export const formatConditions = (when) =>
  (when || []).map((cond) => `${cond.key} = ${(cond.values || []).join(', ')}`).join('\n')

// The page context as the server reads it: lower-cased keys, each with a list
// of lower-cased string values. Bad input gives {}.
export const normalizeContext = (value) => {
  let obj = value
  if (typeof value === 'string') {
    if (!value.trim()) return {}
    try {
      obj = JSON.parse(value)
    } catch {
      return {}
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const scalar = (v) =>
    typeof v === 'string' ? v.trim().toLowerCase() : typeof v === 'number' || typeof v === 'boolean' ? String(v) : null
  const ctx = {}
  for (const [rawKey, v] of Object.entries(obj)) {
    const key = rawKey.trim().toLowerCase()
    if (!CONDITION_KEY.test(key)) continue
    const values = (Array.isArray(v) ? v : [v]).map(scalar).filter((s) => s !== null)
    if (values.length) ctx[key] = values
  }
  return ctx
}

export const matchesConditions = (when, ctx) =>
  (when || []).every((cond) => {
    const have = ctx[(cond.key || '').toLowerCase()] || []
    return (cond.values || []).some((want) => have.includes(String(want).trim().toLowerCase()))
  })

export const matchPageRule = (rules, raw, context) => {
  const ctx = normalizeContext(context)
  return (
    (rules || []).find(
      (rule) =>
        matchesPage((rule.pages || []).map((p) => p.trim()).filter(Boolean), raw) &&
        matchesConditions(rule.when, ctx)
    ) || null
  )
}

export const MAX_PAGE_RULES = 100
export const MAX_PAGE_RULE_PATTERNS = 20
export const MAX_PAGE_RULE_ARTICLES = 10
export const MAX_PAGE_RULE_CONDITIONS = 5

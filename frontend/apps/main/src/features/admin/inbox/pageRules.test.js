import { describe, expect, test } from 'vitest'
import { matchesPage, matchPageRule, parseConditions, formatConditions, normalizeContext } from './pageRules.js'

const rules = [
  { name: 'signed out', pages: ['/session*', '/forgot_passwords*'] },
  { name: 'workspace tasks', pages: ['/workspace/*/tasks*'] },
  { name: 'workspace', pages: ['/workspace/*'] },
  { name: 'app only', pages: ['app.example.com/reports*'] },
  { name: 'host', pages: ['www.example.com'] },
  { name: 'query', pages: ['/search?q=*'] },
  { name: 'member', pages: ['/*'] }
]

describe('page rules', () => {
  test.each([
    ['https://app.example.com/session/new', 'signed out'],
    ['https://app.example.com/workspace/65/tasks', 'workspace tasks'],
    ['https://app.example.com/workspace/65/tasks?page=2#x', 'workspace tasks'],
    ['https://app.example.com/workspace/65/members', 'workspace'],
    ['https://app.example.com/reports/1', 'app only'],
    ['https://other.example.com/reports/1', 'member'],
    ['https://www.example.com/anything', 'host'],
    ['https://app.example.com/search?q=tasks', 'query'],
    ['https://app.example.com/dashboard', 'member']
  ])('%s matches %s', (url, name) => {
    expect(matchPageRule(rules, url)?.name).toBe(name)
  })

  test('nothing matches bad addresses or empty rules', () => {
    expect(matchPageRule(rules, 'not a url')).toBeNull()
    expect(matchPageRule(rules, 'ftp://app.example.com/x')).toBeNull()
    expect(matchPageRule([], 'https://app.example.com/')).toBeNull()
    expect(matchesPage(['', ' '], 'https://app.example.com/')).toBe(false)
  })

  test('regex characters in patterns are literal', () => {
    expect(matchesPage(['/a.b'], 'https://x.com/a.b')).toBe(true)
    expect(matchesPage(['/a.b'], 'https://x.com/aXb')).toBe(false)
  })
})

describe('page rule conditions', () => {
  test('parses and formats "key = values" lines, skipping incomplete ones', () => {
    const when = parseConditions('Role = viewer, guest\narea = workspace\nrole\nteam =\n')
    expect(when).toEqual([
      { key: 'role', values: ['viewer', 'guest'] },
      { key: 'area', values: ['workspace'] }
    ])
    expect(formatConditions(when)).toBe('role = viewer, guest\narea = workspace')
  })

  test('normalizes the page context like the server', () => {
    expect(normalizeContext('{"Role":" Editor ","beta":false,"team":["Support",3,{}],"bad key":1}')).toEqual({
      role: ['editor'],
      beta: ['false'],
      team: ['support', '3']
    })
    expect(normalizeContext('not json')).toEqual({})
    expect(normalizeContext('["a"]')).toEqual({})
    expect(normalizeContext('')).toEqual({})
  })

  test('picks the first rule whose pages and conditions match', () => {
    const rules = [
      { id: 'v', name: 'viewer', pages: ['/workspace/*/tasks*'], when: [{ key: 'role', values: ['viewer', 'guest'] }] },
      { id: 'd', name: 'editor', pages: ['/workspace/*/tasks*'], when: [{ key: 'role', values: ['Editor'] }] },
      { id: 'e', name: 'everyone', pages: ['/workspace/*/tasks*'] }
    ]
    const url = 'https://app.example.com/workspace/3/tasks'
    expect(matchPageRule(rules, url, '{"role":"viewer"}').name).toBe('viewer')
    expect(matchPageRule(rules, url, { role: 'EDITOR' }).name).toBe('editor')
    expect(matchPageRule(rules, url, '{"role":"owner"}').name).toBe('everyone')
    expect(matchPageRule(rules, url).name).toBe('everyone')
    expect(matchPageRule(rules.slice(0, 2), url, '{"role":"owner"}')).toBeNull()
  })
})

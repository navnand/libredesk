import { describe, expect, test } from 'vitest'
import { matchesPage, matchPageRule } from './pageRules.js'

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

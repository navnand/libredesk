// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import api from '@widget/api/index.js'
import { useHelpStore } from './help.js'

vi.mock('@widget/api/index.js', () => ({ default: { getHelp: vi.fn(), searchHelp: vi.fn() } }))

const article = (id) => ({ id, title: `Article ${id}`, slug: `a-${id}` })
const help = (extra) => ({
  data: {
    data: {
      tree: [{ articles: [article(1), article(2), article(3)] }],
      popular: [article(3)],
      featured_ids: [2],
      ...extra
    }
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('help articles per page', () => {
  test('sends the page address and shows the matching rule articles', async () => {
    const store = useHelpStore()
    await store.setPage('https://app.example.com/workspace/65/tasks')
    api.getHelp.mockResolvedValueOnce(help({ page_rules: true, page_rule: 'Tasks', page_article_ids: [1, 99] }))
    await store.load()

    expect(api.getHelp).toHaveBeenCalledWith('en-US', 'en-US', 'https://app.example.com/workspace/65/tasks')
    expect(store.pageMatch).toBe(true)
    expect(store.featured.map((a) => a.id)).toEqual([1])
  })

  test('falls back to featured, then popular, when the rule has no available articles', async () => {
    const store = useHelpStore()
    api.getHelp.mockResolvedValueOnce(help({ page_rules: true, page_rule: 'Empty', page_article_ids: [99] }))
    await store.load()
    expect(store.pageMatch).toBe(false)
    expect(store.featured.map((a) => a.id)).toEqual([2])

    api.getHelp.mockResolvedValueOnce(help({ featured_ids: [] }))
    await store.load()
    expect(store.featured.map((a) => a.id)).toEqual([3])
  })

  test('refreshes on a page change only when the inbox has page rules', async () => {
    const store = useHelpStore()
    api.getHelp.mockResolvedValueOnce(help({}))
    await store.load()
    await store.setPage('https://app.example.com/a')
    expect(api.getHelp).toHaveBeenCalledTimes(1)

    api.getHelp.mockResolvedValueOnce(help({ page_rules: true }))
    await store.load()
    api.getHelp.mockResolvedValueOnce(help({ page_rules: true, page_article_ids: [3] }))
    await store.setPage('https://app.example.com/b')
    expect(api.getHelp).toHaveBeenLastCalledWith('en-US', 'en-US', 'https://app.example.com/b')
    expect(store.featured.map((a) => a.id)).toEqual([3])
    expect(store.loading).toBe(false)

    await store.setPage('https://app.example.com/b')
    expect(api.getHelp).toHaveBeenCalledTimes(3)
  })

  test('a failed refresh keeps the current articles', async () => {
    const store = useHelpStore()
    api.getHelp.mockResolvedValueOnce(help({ page_rules: true, page_article_ids: [1] }))
    await store.load()
    api.getHelp.mockRejectedValueOnce(new Error('offline'))
    await store.setPage('https://app.example.com/c')
    expect(store.featured.map((a) => a.id)).toEqual([1])
    expect(store.failed).toBe(false)
  })

  test('a reset forgets that Home opened the article', () => {
    const store = useHelpStore()
    store.returnHome = true
    store.reset()
    expect(store.returnHome).toBe(false)
  })
})

describe('search on the Home screen', () => {
  const results = (...ids) => ({ data: { data: ids.map(article) } })

  test('shows the results for the query', async () => {
    const store = useHelpStore()
    api.searchHelp.mockResolvedValueOnce(results(2, 3))
    store.homeQuery = ' print '
    await store.searchHome()
    expect(api.searchHelp).toHaveBeenCalledWith('print', undefined)
    expect(store.homeResults.map((a) => a.id)).toEqual([2, 3])
    expect(store.homeSearching).toBe(false)
  })

  test('an older reply never replaces a newer one', async () => {
    const store = useHelpStore()
    let first
    api.searchHelp.mockReturnValueOnce(new Promise((resolve) => (first = resolve)))
    api.searchHelp.mockResolvedValueOnce(results(1))
    store.homeQuery = 'pr'
    const slow = store.searchHome()
    store.homeQuery = 'print'
    await store.searchHome()
    first(results(3))
    await slow
    expect(store.homeResults.map((a) => a.id)).toEqual([1])
  })

  test('an empty query clears the results without a request', async () => {
    const store = useHelpStore()
    store.homeResults = [article(1)]
    store.homeQuery = '  '
    await store.searchHome()
    expect(api.searchHelp).not.toHaveBeenCalled()
    expect(store.homeResults).toBe(null)
  })

  test('a failed search says so', async () => {
    const store = useHelpStore()
    api.searchHelp.mockRejectedValueOnce(new Error('offline'))
    store.homeQuery = 'print'
    await store.searchHome()
    expect(store.homeSearchFailed).toBe(true)
    expect(store.homeResults).toBe(null)
  })

  test('a reset clears the Home search', () => {
    const store = useHelpStore()
    store.homeQuery = 'print'
    store.homeResults = [article(1)]
    store.reset()
    expect(store.homeQuery).toBe('')
    expect(store.homeResults).toBe(null)
  })
})

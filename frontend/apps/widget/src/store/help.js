import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@widget/api/index.js'

const EXPAND_KEY = 'libredesk-help-expand'
const readExpandArticles = () => {
  try { return localStorage.getItem(EXPAND_KEY) !== 'false' } catch { return true }
}

export const useHelpStore = defineStore('help', () => {
  const requestedLocale = ref('en-US')
  const fallbackLocale = ref('en-US')
  const data = ref(null)
  const loading = ref(false)
  const failed = ref(false)
  const query = ref('')
  const results = ref(null)
  const collectionPath = ref([])
  const navigationHistory = ref([])
  const article = ref(null)
  const scrollTop = ref(0)
  const pendingArticle = ref(null)
  const focusSearch = ref(false)
  // Set when Home opened the article, so Back returns to Home.
  const returnHome = ref(false)
  // Search on the Home screen, kept apart from the Help view's own search.
  const homeQuery = ref('')
  const homeResults = ref(null)
  const homeSearching = ref(false)
  const homeSearchFailed = ref(false)
  let homeSearchRequest = 0
  const expandArticles = ref(readExpandArticles())
  const identity = ref(0)
  // The host page the widget is on; page rules pick articles by it.
  const pageURL = ref('')
  let generation = 0
  const articles = computed(() => {
    const collect = (nodes) =>
      (nodes || []).flatMap((node) => [...(node.articles || []), ...collect(node.children)])
    return collect(data.value?.tree)
  })
  const available = computed(() => !!data.value && articles.value.length > 0)
  const pick = (ids) =>
    (ids || []).map((id) => articles.value.find((article) => article.id === id)).filter(Boolean)
  // Articles from the page rule matching this page, when any are available.
  const pageArticles = computed(() => pick(data.value?.page_article_ids))
  const pageMatch = computed(() => pageArticles.value.length > 0)
  const hasPageRules = computed(() => !!data.value?.page_rules)
  const featured = computed(() => {
    if (pageMatch.value) return pageArticles.value
    const picked = pick(data.value?.featured_ids)
    // Featured articles outside the visitor's locale are missing from the tree.
    return picked.length ? picked : data.value?.popular || []
  })
  const reset = () => {
    generation++
    identity.value++
    loading.value = false
    scrollTop.value = 0
    pendingArticle.value = null
    focusSearch.value = false
    returnHome.value = false
    homeSearchRequest++
    homeQuery.value = ''
    homeResults.value = null
    homeSearching.value = false
    homeSearchFailed.value = false
    data.value = null
    failed.value = false
    query.value = ''
    results.value = null
    article.value = null
    collectionPath.value = []
    navigationHistory.value = []
  }
  const load = async () => {
    const request = ++generation
    loading.value = true
    failed.value = false
    try {
      const response = await api.getHelp(requestedLocale.value, fallbackLocale.value, pageURL.value)
      if (request === generation) data.value = response.data.data
    } catch {
      if (request === generation) {
        data.value = null
        failed.value = true
      }
    } finally {
      if (request === generation) loading.value = false
    }
  }
  // The host page changed. Only inboxes with page rules need fresh articles; the
  // refresh runs in the background so an open Help view doesn't flash.
  const setPage = async (url) => {
    if (typeof url !== 'string' || url === pageURL.value) return
    pageURL.value = url
    if (!data.value?.page_rules) return
    const request = ++generation
    try {
      const response = await api.getHelp(requestedLocale.value, fallbackLocale.value, url)
      if (request === generation) data.value = response.data.data
    } catch {
      // Keep the current articles; the next page change tries again.
    } finally {
      if (request === generation) loading.value = false
    }
  }
  // Only the latest search counts; a reset or a newer search drops older replies.
  const searchHome = async () => {
    const query = homeQuery.value.trim()
    const request = ++homeSearchRequest
    homeSearchFailed.value = false
    if (!query) {
      homeResults.value = null
      homeSearching.value = false
      return
    }
    homeSearching.value = true
    try {
      const response = await api.searchHelp(query, data.value?.locale)
      if (request === homeSearchRequest) homeResults.value = response.data.data || []
    } catch {
      if (request === homeSearchRequest) {
        homeResults.value = null
        homeSearchFailed.value = true
      }
    } finally {
      if (request === homeSearchRequest) homeSearching.value = false
    }
  }
  const setExpandArticles = (value) => {
    expandArticles.value = value
    try { localStorage.setItem(EXPAND_KEY, String(value)) } catch { /* storage blocked */ }
  }
  return {
    requestedLocale,
    fallbackLocale,
    focusSearch,
    returnHome,
    homeQuery,
    homeResults,
    homeSearching,
    homeSearchFailed,
    searchHome,
    expandArticles,
    setExpandArticles,
    navigationHistory,
    pendingArticle,
    identity,
    data,
    loading,
    failed,
    query,
    results,
    collectionPath,
    article,
    scrollTop,
    articles,
    available,
    featured,
    pageMatch,
    hasPageRules,
    pageURL,
    setPage,
    load,
    reset
  }
})

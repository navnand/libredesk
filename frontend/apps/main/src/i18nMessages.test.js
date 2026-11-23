import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

const locales = import.meta.glob('../../../../i18n/*.json', { eager: true, import: 'default' })

// Keys rendered only by the Go server, which does not use vue-i18n message syntax.
const SERVER_ONLY = new Set(['validation.invalidFromAddress'])

// Returns the keys in the file whose messages vue-i18n cannot compile.
const brokenMessages = (messages) => {
  const errors = []
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args.join(' ')))
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const i18n = createI18n({
    legacy: false,
    locale: 'x',
    messages: { x: messages },
    missingWarn: false,
    fallbackWarn: false,
    warnHtmlMessage: false
  })
  const broken = []
  for (const key of Object.keys(messages)) {
    if (SERVER_ONLY.has(key)) continue
    errors.length = 0
    try {
      i18n.global.t(key, {})
    } catch (err) {
      errors.push(err.message)
    }
    if (errors.length) broken.push(key)
  }
  return broken
}

afterEach(() => vi.restoreAllMocks())

describe('i18n messages', () => {
  for (const [file, messages] of Object.entries(locales)) {
    it(`${file.split('/').pop()} compiles`, () => {
      expect(brokenMessages(messages)).toEqual([])
    })
  }

  it('renders literal braces in the page-context hint', () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: locales['../../../../i18n/en-US.json'] } })
    expect(i18n.global.t('widget.previewContextHint')).toContain('e.g. {"role": "editor"}.')
  })
})

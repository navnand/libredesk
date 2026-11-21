<script setup>
import { useDebounceFn } from '@vueuse/core'
import { useHelpStore } from '@widget/store/help.js'
import { useWidgetStore } from '@widget/store/widget.js'
import { Button } from '@shared-ui/components/ui/button'
import SearchInput from '@shared-ui/components/SearchInput.vue'
const help = useHelpStore()
const widget = useWidgetStore()
// Opens the article in the Help view; Back returns here.
const open = (article) => {
  help.article = null
  help.query = ''
  help.results = null
  help.collectionPath = []
  help.navigationHistory = []
  help.scrollTop = 0
  help.pendingArticle = article
  help.focusSearch = false
  help.returnHome = true
  widget.navigateToHelp()
}
// Search runs here on the Home screen, as the visitor types.
const search = useDebounceFn(() => help.searchHome(), 300)
const onQuery = (value) => {
  help.homeQuery = value
  if (value.trim()) search()
  else help.searchHome()
}
</script>

<template>
  <section class="space-y-1 rounded-xl border border-border/80 bg-card p-2 shadow-sm">
    <form role="search" @submit.prevent="help.searchHome()">
      <SearchInput
        :model-value="help.homeQuery"
        :placeholder="$t('widget.searchArticles')"
        :clear-label="$t('globals.messages.clearSearch')"
        :loading="help.homeSearching"
        @update:model-value="onQuery"
      />
    </form>
    <template v-if="help.homeQuery.trim()">
      <p v-if="help.homeSearchFailed" role="alert" class="px-2 py-1.5 text-sm text-muted-foreground">
        {{ $t('globals.messages.helpLoadError') }}
      </p>
      <p
        v-else-if="help.homeResults?.length === 0"
        role="status"
        class="px-2 py-1.5 text-sm text-muted-foreground"
      >
        {{ $t('globals.messages.noResultsFor', { query: help.homeQuery.trim() }) }}
      </p>
      <Button
        v-for="article in help.homeResults || []"
        :key="article.id"
        type="button"
        variant="ghost"
        class="w-full h-auto justify-start px-2 py-1.5 text-left whitespace-normal"
        @click="open(article)"
        >{{ article.title }}</Button
      >
    </template>
    <template v-else>
      <p v-if="help.hasPageRules && help.featured.length" class="px-2 pt-2 pb-0.5 text-xs text-muted-foreground">
        {{ help.pageMatch ? $t('widget.helpForThisPage') : $t('helpCenter.popularArticles') }}
      </p>
      <Button
        v-for="article in help.featured"
        :key="article.id"
        type="button"
        variant="ghost"
        class="w-full h-auto justify-start px-2 py-1.5 text-left whitespace-normal"
        @click="open(article)"
        >{{ article.title }}</Button
      >
    </template>
  </section>
</template>

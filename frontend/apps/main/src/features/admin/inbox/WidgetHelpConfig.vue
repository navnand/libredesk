<script setup>
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '@shared-ui/components/ui/label'
import { Button } from '@shared-ui/components/ui/button'
import { Input } from '@shared-ui/components/ui/input'
import { Textarea } from '@shared-ui/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@shared-ui/components/ui/select'
import SwitchField from '@shared-ui/components/SwitchField.vue'
import ReorderButtons from '@shared-ui/components/ReorderButtons.vue'
import { GripVertical, X, ChevronDown, ChevronRight, Plus } from 'lucide-vue-next'
import Draggable from 'vuedraggable'
import ArticleListEditor from './ArticleListEditor.vue'
import { newCampaignId } from './livechatFormSchema.js'
import { matchPageRule, MAX_PAGE_RULES, MAX_PAGE_RULE_ARTICLES } from './pageRules.js'

const reducedMotion = usePreferredReducedMotion()

const MAX_FEATURED = 10
const AUDIENCES = ['visitors', 'users']

const props = defineProps({
  modelValue: { type: Object, required: true },
  centers: { type: Array, default: () => [] },
  articles: { type: Array, default: () => [] },
  failed: { type: Boolean, default: false },
  previewPage: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'update:previewPage'])
const { t } = useI18n()

const update = (key, value) => emit('update:modelValue', { ...props.modelValue, [key]: value })
const updateAudience = (audience, key, value) =>
  update(audience, { ...props.modelValue[audience], [key]: value })

const selectHelpCenter = (value) =>
  emit('update:modelValue', {
    ...props.modelValue,
    help_center_id: Number(value),
    featured_ids: [],
    page_rules: (props.modelValue.page_rules || []).map((rule) => ({ ...rule, article_ids: [] }))
  })

// Page rules: checked top to bottom, first match wins.
const rules = computed(() => props.modelValue.page_rules || [])
const setRules = (list) => update('page_rules', list)
const updateRule = (id, key, value) =>
  setRules(rules.value.map((rule) => (rule.id === id ? { ...rule, [key]: value } : rule)))
const moveRule = (index, direction) => {
  const list = [...rules.value]
  const [rule] = list.splice(index, 1)
  list.splice(index + direction, 0, rule)
  setRules(list)
}
const removeRule = (id) => setRules(rules.value.filter((rule) => rule.id !== id))

const filter = ref('')
const filtering = computed(() => filter.value.trim() !== '')
const visibleRules = computed(() => {
  const needle = filter.value.trim().toLowerCase()
  if (!needle) return rules.value
  return rules.value.filter(
    (rule) =>
      rule.name.toLowerCase().includes(needle) ||
      (rule.pages || []).some((page) => page.toLowerCase().includes(needle))
  )
})

const expanded = ref(new Set())
const toggle = (id) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}
const addRule = () => {
  const rule = { id: newCampaignId(), name: t('widget.newPageRule'), pages: [], article_ids: [] }
  setRules([...rules.value, rule])
  expanded.value = new Set([...expanded.value, rule.id])
  filter.value = ''
}

const matched = computed(() =>
  props.previewPage.trim() ? matchPageRule(rules.value, props.previewPage.trim()) : null
)
const firstPage = (rule) => (rule.pages || []).map((page) => page.trim()).find(Boolean) || ''
const articleCount = (rule) => (rule.article_ids || []).length
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-2">
      <Label for="widget-help-center">{{ t('globals.terms.helpCenter') }}</Label>
      <Select
        :model-value="String(modelValue.help_center_id || 0)"
        @update:model-value="selectHelpCenter"
      >
        <SelectTrigger id="widget-help-center" class="max-w-md"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="0">{{ t('globals.terms.none') }}</SelectItem>
          <SelectItem
            v-for="center in centers"
            :key="center.id"
            :value="String(center.id)"
            :disabled="!center.is_active"
          >
            {{ center.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <p v-if="failed" role="alert" class="text-sm text-destructive">
      {{ t('globals.messages.helpLoadError') }}
    </p>

    <template v-if="modelValue.help_center_id">
      <div class="space-y-4">
        <h4 class="ui-heading">{{ t('widget.helpPlacement') }}</h4>
        <div class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="audience in AUDIENCES"
            :key="audience"
            :data-help-audience="audience"
            class="space-y-4 border rounded-md p-4"
          >
            <p class="text-sm font-medium text-foreground">
              {{ t(audience === 'visitors' ? 'globals.terms.visitor' : 'globals.terms.users', 2) }}
            </p>
            <SwitchField
              :title="t('widget.showHelpTab')"
              :checked="modelValue[audience]?.tab"
              @update:checked="updateAudience(audience, 'tab', $event)"
            />
          </div>
        </div>

        <p class="ui-description">{{ t('widget.helpOnHomeHint') }}</p>
      </div>

      <div data-featured-articles class="space-y-4">
        <h4 class="ui-heading">
          {{ rules.length ? t('widget.defaultArticles') : t('globals.terms.featuredArticle', 2) }}
        </h4>
        <p class="ui-description">
          {{ rules.length ? t('widget.defaultArticlesHint') : t('widget.featuredArticlesHint') }}
        </p>
        <ArticleListEditor
          :model-value="modelValue.featured_ids || []"
          :articles="articles"
          :max="MAX_FEATURED"
          @update:model-value="update('featured_ids', $event)"
        />
      </div>

      <div data-page-rules class="space-y-4">
        <h4 class="ui-heading">{{ t('widget.pageRules') }}</h4>
        <p class="ui-description">{{ t('widget.pageRulesHint') }}</p>

        <div class="space-y-2">
          <Label for="widget-preview-page">{{ t('widget.previewAsPage') }}</Label>
          <Input
            id="widget-preview-page"
            class="max-w-md"
            :model-value="previewPage"
            placeholder="https://app.example.com/account/42/settings"
            @update:model-value="emit('update:previewPage', $event)"
          />
          <p v-if="previewPage.trim()" class="text-sm" data-preview-match>
            {{
              matched
                ? t('widget.pageRuleMatches', { name: matched.name })
                : t('widget.pageRuleNoMatch')
            }}
          </p>
          <p v-else class="ui-description">{{ t('widget.previewAsPageHint') }}</p>
        </div>

        <Input
          v-if="rules.length > 5"
          v-model="filter"
          class="max-w-md"
          :placeholder="t('widget.filterPageRules')"
          :aria-label="t('widget.filterPageRules')"
        />

        <Draggable
          :model-value="visibleRules"
          item-key="id"
          :disabled="filtering"
          :animation="reducedMotion === 'reduce' ? 0 : 200"
          handle=".drag-handle"
          :force-fallback="true"
          fallback-on-body
          :fallback-tolerance="3"
          ghost-class="drag-ghost"
          class="space-y-2"
          @update:model-value="setRules"
        >
          <template #item="{ element: rule, index }">
            <div
              class="group/reorder border rounded-md"
              :class="{ 'border-primary': matched && matched.id === rule.id }"
              :data-page-rule="rule.id"
            >
              <div class="flex items-center gap-2 p-2">
                <div v-if="!filtering" class="drag-handle cursor-move text-muted-foreground">
                  <GripVertical class="size-4" aria-hidden="true" />
                </div>
                <ReorderButtons
                  v-if="!filtering"
                  :index="index"
                  :length="rules.length"
                  @move="moveRule(index, $event)"
                />
                <button
                  type="button"
                  class="flex flex-1 min-w-0 items-center gap-2 text-left"
                  :aria-expanded="expanded.has(rule.id)"
                  @click="toggle(rule.id)"
                >
                  <ChevronDown
                    v-if="expanded.has(rule.id)"
                    class="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <ChevronRight
                    v-else
                    class="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span class="text-sm font-medium truncate">{{ rule.name }}</span>
                  <span class="text-xs text-muted-foreground font-mono truncate">
                    {{ firstPage(rule) }}
                  </span>
                  <span class="ml-auto shrink-0 text-xs text-muted-foreground">
                    {{ t('globals.messages.articleCount', { count: articleCount(rule) }, articleCount(rule)) }}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :aria-label="t('globals.terms.remove')"
                  @click="removeRule(rule.id)"
                >
                  <X class="size-4" aria-hidden="true" />
                </Button>
              </div>

              <div v-if="expanded.has(rule.id)" class="space-y-4 border-t p-4">
                <div class="space-y-2">
                  <Label :for="`page-rule-name-${rule.id}`">{{ t('widget.pageRuleName') }}</Label>
                  <Input
                    :id="`page-rule-name-${rule.id}`"
                    class="max-w-md"
                    :model-value="rule.name"
                    maxlength="128"
                    @update:model-value="updateRule(rule.id, 'name', $event)"
                  />
                </div>
                <div class="space-y-2">
                  <Label :for="`page-rule-pages-${rule.id}`">{{ t('widget.pageRulePages') }}</Label>
                  <Textarea
                    :id="`page-rule-pages-${rule.id}`"
                    class="font-mono text-sm"
                    rows="3"
                    :model-value="(rule.pages || []).join('\n')"
                    placeholder="/account/*/settings*"
                    @update:model-value="updateRule(rule.id, 'pages', $event.split('\n'))"
                  />
                  <p class="ui-description">{{ t('widget.urlPatternsHint') }}</p>
                </div>
                <div class="space-y-2">
                  <Label>{{ t('widget.pageRuleArticles') }}</Label>
                  <p class="ui-description">{{ t('widget.pageRuleArticlesHint') }}</p>
                  <ArticleListEditor
                    :model-value="rule.article_ids || []"
                    :articles="articles"
                    :max="MAX_PAGE_RULE_ARTICLES"
                    @update:model-value="updateRule(rule.id, 'article_ids', $event)"
                  />
                </div>
              </div>
            </div>
          </template>
        </Draggable>

        <p v-if="filtering && !visibleRules.length" class="ui-description">
          {{ t('widget.noPageRulesMatchFilter') }}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="rules.length >= MAX_PAGE_RULES"
          @click="addRule"
        >
          <Plus class="size-4" aria-hidden="true" />
          {{ t('widget.addPageRule') }}
        </Button>
      </div>
    </template>
  </div>
</template>

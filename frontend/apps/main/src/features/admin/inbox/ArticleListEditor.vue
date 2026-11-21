<script setup>
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@shared-ui/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@shared-ui/components/ui/select'
import ReorderButtons from '@shared-ui/components/ReorderButtons.vue'
import { GripVertical, X, FileText } from 'lucide-vue-next'
import Draggable from 'vuedraggable'

// An ordered list of help articles: pick, drag to reorder, remove. Articles that
// are no longer published show as unavailable so they can be removed.
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  articles: { type: Array, default: () => [] },
  max: { type: Number, default: 10 }
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const reducedMotion = usePreferredReducedMotion()

const ids = computed(() => props.modelValue || [])
const titleOf = (id) => props.articles.find((article) => article.id === id)?.title
const items = computed({
  get: () => ids.value.map((id) => ({ id, title: titleOf(id) })),
  set: (list) =>
    emit(
      'update:modelValue',
      list.map((item) => item.id)
    )
})
const move = (index, direction) => {
  const next = [...ids.value]
  const [id] = next.splice(index, 1)
  next.splice(index + direction, 0, id)
  emit('update:modelValue', next)
}
const unused = computed(() => props.articles.filter((article) => !ids.value.includes(article.id)))
</script>

<template>
  <div class="space-y-2">
    <Draggable
      v-model="items"
      item-key="id"
      :animation="reducedMotion === 'reduce' ? 0 : 200"
      handle=".drag-handle"
      :force-fallback="true"
      fallback-on-body
      :fallback-tolerance="3"
      ghost-class="drag-ghost"
      class="space-y-2"
    >
      <template #item="{ element: item, index }">
        <div class="group/reorder flex items-center gap-2 p-2 border rounded-md">
          <div class="drag-handle cursor-move text-muted-foreground">
            <GripVertical class="size-4" aria-hidden="true" />
          </div>
          <ReorderButtons :index="index" :length="items.length" @move="move(index, $event)" />
          <FileText class="size-4 shrink-0 text-muted-foreground" />
          <span
            class="flex-1 min-w-0 text-sm break-words"
            :class="{ 'text-destructive': !item.title }"
          >
            {{ item.title || t('globals.messages.articleUnavailable') }}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            :aria-label="t('globals.terms.remove')"
            @click="emit('update:modelValue', ids.filter((_, i) => i !== index))"
          >
            <X class="size-4" aria-hidden="true" />
          </Button>
        </div>
      </template>
    </Draggable>

    <Select
      :disabled="ids.length >= max || !unused.length"
      model-value=""
      @update:model-value="emit('update:modelValue', [...ids, Number($event)])"
    >
      <SelectTrigger class="max-w-md">
        <SelectValue :placeholder="t('placeholders.selectArticle')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="article in unused" :key="article.id" :value="String(article.id)">
          {{ article.title }} ({{ article.locale }})
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>

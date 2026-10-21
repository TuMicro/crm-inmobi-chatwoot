<script setup>
import { computed } from 'vue';
import Avatar from 'next/avatar/Avatar.vue';
import { useI18n } from 'vue-i18n';

import Button from 'dashboard/components-next/button/Button.vue';
import { BaseTableRow, BaseTableCell } from 'dashboard/components-next/table';
import { rutaDeLaPropiedad } from 'dashboard/turuta/macrosDePropiedades'; // [turuta]

const props = defineProps({
  macro: {
    type: Object,
    required: true,
  },
  canManagePublicMacros: {
    type: Boolean,
    default: true,
  },
  // [turuta] La propiedad de la que es esta macro, si es de una (22/10).
  propiedad: {
    type: Object,
    default: null,
  },
  accountId: {
    type: [Number, String],
    default: null,
  },
});

defineEmits(['delete']);
// [turuta]
const textoPropiedad = computed(() =>
  props.propiedad ? `Propiedad · ${props.propiedad.nombre}` : ''
);
const tituloPropiedad = computed(() =>
  props.propiedad ? 'Es la macro de esta propiedad: abrirla en Propiedades' : ''
);
const { t } = useI18n();

const createdByName = computed(() => {
  const createdBy = props.macro.created_by;
  return createdBy.available_name ?? createdBy.email ?? '';
});

const updatedByName = computed(() => {
  const updatedBy = props.macro.updated_by;
  return updatedBy.available_name ?? updatedBy.email ?? '';
});

const visibilityLabel = computed(() => {
  const i18nKey =
    props.macro.visibility === 'global'
      ? 'MACROS.EDITOR.VISIBILITY.GLOBAL.LABEL'
      : 'MACROS.EDITOR.VISIBILITY.PERSONAL.LABEL';
  return t(i18nKey);
});

const canManageMacro = computed(
  () => props.canManagePublicMacros || props.macro.visibility !== 'global'
);

const editTooltip = computed(() =>
  canManageMacro.value ? t('MACROS.EDIT.TOOLTIP') : t('MACROS.VIEW.TOOLTIP')
);
</script>

<template>
  <BaseTableRow :item="macro">
    <template #default>
      <BaseTableCell class="max-w-0 min-w-0">
        <span class="text-body-main text-n-slate-12 truncate block">
          {{ macro.name }}
        </span>
        <!-- [turuta] La macro de una propiedad: se ve y se llega a ella. -->
        <router-link
          v-if="propiedad"
          :to="rutaDeLaPropiedad(propiedad, accountId)"
          :title="tituloPropiedad"
          class="flex items-center gap-1 mt-0.5 text-xs text-n-slate-11 hover:text-n-blue-11 min-w-0"
          data-turuta="macro-propiedad"
        >
          <span class="flex-shrink-0 i-lucide-building-2 size-3.5" />
          <span class="truncate">{{ textoPropiedad }}</span>
        </router-link>
      </BaseTableCell>

      <BaseTableCell class="max-w-0">
        <div v-if="macro.created_by" class="flex items-center gap-2 min-w-0">
          <Avatar
            :name="createdByName"
            :size="24"
            rounded-full
            class="flex-shrink-0"
          />
          <span class="text-body-main text-n-slate-12 truncate">
            {{ createdByName }}
          </span>
        </div>
        <span v-else class="text-body-main text-n-slate-11">--</span>
      </BaseTableCell>

      <BaseTableCell class="max-w-0">
        <div v-if="macro.updated_by" class="flex items-center gap-2 min-w-0">
          <Avatar
            :name="updatedByName"
            :size="24"
            rounded-full
            class="flex-shrink-0"
          />
          <span class="text-body-main text-n-slate-12 truncate">
            {{ updatedByName }}
          </span>
        </div>
        <span v-else class="text-body-main text-n-slate-11">--</span>
      </BaseTableCell>

      <BaseTableCell class="max-w-0">
        <span class="text-body-main text-n-slate-12 whitespace-nowrap">
          {{ visibilityLabel }}
        </span>
      </BaseTableCell>

      <BaseTableCell align="end" class="w-24">
        <div class="flex gap-3 justify-end flex-shrink-0">
          <router-link
            :to="{ name: 'macros_edit', params: { macroId: macro.id } }"
          >
            <Button
              v-tooltip.top="editTooltip"
              icon="i-woot-edit-pen"
              slate
              sm
            />
          </router-link>
          <Button
            v-if="canManageMacro"
            v-tooltip.top="$t('MACROS.DELETE.TOOLTIP')"
            icon="i-woot-bin"
            slate
            sm
            class="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
            @click="$emit('delete')"
          />
        </div>
      </BaseTableCell>
    </template>
  </BaseTableRow>
</template>

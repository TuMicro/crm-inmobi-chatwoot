<script>
export default {
  props: {
    message: { type: String, default: '' },
    action: {
      type: Object,
      default: () => {},
    },
  },
  data() {
    return {
      toggleAfterTimeout: false,
    };
  },
  mounted() {},
  methods: {},
};
</script>

<template>
  <div>
    <!-- [turuta] action.turutaTipo === 'exito': aviso verde con su marca. -->
    <div
      class="shadow-sm rounded-lg items-center gap-3 inline-flex mb-2 max-w-[25rem] min-h-[1.875rem] min-w-[15rem] px-6 py-3 text-left"
      :class="
        action && action.turutaTipo === 'exito'
          ? 'bg-n-teal-9'
          : 'bg-n-slate-12 dark:bg-n-slate-7'
      "
    >
      <span
        v-if="action && action.turutaTipo === 'exito'"
        class="flex-none text-white i-lucide-circle-check-big size-5"
      />
      <div class="text-sm font-medium text-white dark:text-white">
        {{ message }}
      </div>
      <div v-if="action">
        <router-link
          v-if="action.type == 'link'"
          :to="action.to"
          class="font-medium cursor-pointer select-none text-n-blue-10 hover:text-n-brand"
        >
          {{ action.message }}
        </router-link>
      </div>
    </div>
  </div>
</template>

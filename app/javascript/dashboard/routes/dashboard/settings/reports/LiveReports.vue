<script setup>
import ReportHeader from './components/ReportHeader.vue';
import ConversationHeatmapContainer from './components/heatmaps/ConversationHeatmapContainer.vue';
// [turuta] Donde Chatwoot pintaba "Resueltos": aqui la venta es el Cierre.
import CierresHeatmap from 'dashboard/turuta/CierresHeatmap.vue';
import AgentLiveReportContainer from './components/AgentLiveReportContainer.vue';
import StatsLiveReportsContainer from './components/StatsLiveReportsContainer.vue';
</script>

<template>
  <ReportHeader :header-title="$t('OVERVIEW_REPORTS.HEADER')" />
  <div class="flex flex-col gap-4 pb-6">
    <StatsLiveReportsContainer />
    <ConversationHeatmapContainer />
    <CierresHeatmap />
    <AgentLiveReportContainer />
  </div>
</template>

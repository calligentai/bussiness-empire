<script setup lang="ts">
import { computed, ref } from "vue";
import type { VerifiedPrincipal } from "../packages/contracts/auth";
import { DealerAdLibrarySourceRegistry } from "../packages/contracts/dealer/ad-library";

const props = defineProps<{ registry: DealerAdLibrarySourceRegistry; principal: VerifiedPrincipal }>();
const url = ref("");
const competitorLabel = ref("");
const campaignLabel = ref("");
const error = ref("");
const refresh = ref(0);
const sources = computed(() => {
  refresh.value;
  return props.registry.list(props.principal);
});

function addSource() {
  error.value = "";
  let parsed: URL;
  try { parsed = new URL(url.value); } catch { error.value = "Enter a valid HTTPS URL."; return; }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    error.value = "Enter a valid HTTPS URL.";
    return;
  }
  try {
    props.registry.create(props.principal, {
      sourceId: globalThis.crypto?.randomUUID?.() ?? `source-${Date.now()}`,
      url: parsed.toString(), competitorLabel: competitorLabel.value.trim(),
      campaignLabel: campaignLabel.value.trim(), provenance: "manual", capturedAt: new Date().toISOString(),
    });
    url.value = "";
    competitorLabel.value = "";
    campaignLabel.value = "";
    refresh.value++;
  } catch {
    error.value = "Add a competitor and campaign label to continue.";
  }
}
</script>

<template>
  <main class="ad-dashboard">
    <header class="ad-dashboard__header">
      <div>
        <p class="ad-dashboard__eyebrow">LOCAL DEMO · DEALER-A</p>
        <h1>Public ad library sources</h1>
        <p class="ad-dashboard__intro">Keep track of public ads you find. Sources are added manually and stay in this local demo.</p>
      </div>
      <span class="ad-dashboard__status"><span aria-hidden="true"></span> Disconnected</span>
    </header>

    <section class="ad-dashboard__panel" aria-labelledby="add-source-heading">
      <div class="ad-dashboard__section-heading">
        <div><p class="ad-dashboard__eyebrow">SOURCE RECORD</p><h2 id="add-source-heading">Add a public source</h2></div>
        <span class="ad-dashboard__manual">Manual entry</span>
      </div>
      <p class="ad-dashboard__note">Manually supplied public sources only. Nothing is fetched, scraped, or connected.</p>
      <form class="ad-dashboard__form" @submit.prevent="addSource">
        <label class="ad-dashboard__field ad-dashboard__field--wide">Public library URL
          <input v-model="url" data-testid="source-url" type="url" inputmode="url" placeholder="https://…" required>
        </label>
        <label class="ad-dashboard__field">Competitor
          <input v-model="competitorLabel" data-testid="competitor-label" type="text" placeholder="Company or brand" required>
        </label>
        <label class="ad-dashboard__field">Campaign label
          <input v-model="campaignLabel" data-testid="campaign-label" type="text" placeholder="Campaign name" required>
        </label>
        <p v-if="error" class="ad-dashboard__error" role="alert">{{ error }}</p>
        <div class="ad-dashboard__actions"><button type="submit">Add source <span aria-hidden="true">＋</span></button></div>
      </form>
    </section>

    <section class="ad-dashboard__list" aria-labelledby="source-list-heading">
      <div class="ad-dashboard__section-heading ad-dashboard__section-heading--list">
        <div><p class="ad-dashboard__eyebrow">YOUR RECORDS</p><h2 id="source-list-heading">Saved sources <span class="ad-dashboard__count">{{ sources.length }}</span></h2></div>
        <span class="ad-dashboard__list-caption">Visible to this dealer only</span>
      </div>
      <div v-if="sources.length" class="ad-dashboard__records">
        <article v-for="source in sources" :key="source.sourceId" class="ad-dashboard__record">
          <div class="ad-dashboard__record-main">
            <span class="ad-dashboard__record-icon" aria-hidden="true">↗</span>
            <div><p class="ad-dashboard__record-label">{{ source.competitorLabel }} <span>· {{ source.campaignLabel }}</span></p><a :href="source.url" target="_blank" rel="noreferrer">{{ source.url }}</a></div>
          </div>
          <div class="ad-dashboard__metadata"><span>{{ source.provenance }}</span><span>Captured {{ new Date(source.capturedAt).toLocaleString() }}</span></div>
        </article>
      </div>
      <div v-else class="ad-dashboard__empty">
        <span class="ad-dashboard__empty-icon" aria-hidden="true">↗</span>
        <h3>No sources added yet</h3>
        <p>Add a public ad-library URL above to keep your research in one place.</p>
        <small>Disconnected · No external data is collected</small>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ad-dashboard{--ink:#25231f;--muted:#77736a;--line:#e8e5de;--paper:#fff;--wash:#f6f5f1;max-width:1040px;margin:0 auto;padding:56px 32px 80px;color:var(--ink)}
.ad-dashboard__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:36px}.ad-dashboard__eyebrow{margin:0 0 8px;color:#8b806a;font-size:10px;font-weight:700;letter-spacing:.13em}.ad-dashboard h1{margin:0;font-size:32px;line-height:1.15;letter-spacing:-.035em;font-weight:600}.ad-dashboard__intro{max-width:570px;margin:12px 0 0;color:var(--muted);font-size:14px;line-height:1.6}.ad-dashboard__status,.ad-dashboard__manual{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;padding:9px 13px;color:#716d64;font-size:11px;white-space:nowrap}.ad-dashboard__status>span{width:7px;height:7px;border-radius:50%;background:#aaa69e}.ad-dashboard__panel{padding:26px 28px 28px;border:1px solid var(--line);border-radius:16px;background:var(--paper)}.ad-dashboard__section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.ad-dashboard h2{margin:0;font-size:19px;font-weight:600;letter-spacing:-.02em}.ad-dashboard__note{margin:10px 0 20px;color:var(--muted);font-size:12px}.ad-dashboard__form{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:15px}.ad-dashboard__field{display:grid;gap:7px;color:#57534b;font-size:11px;font-weight:600}.ad-dashboard__field--wide{grid-column:1/-1}.ad-dashboard input{width:100%;height:42px;padding:0 12px;border:1px solid #dedbd3;border-radius:9px;background:#fff;color:var(--ink);font:400 13px inherit;outline:none}.ad-dashboard input:focus{border-color:#81745d;box-shadow:0 0 0 3px #81745d20}.ad-dashboard input::placeholder{color:#aaa69d}.ad-dashboard__error{grid-column:1/-1;margin:0;color:#a44535;font-size:12px}.ad-dashboard__actions{grid-column:1/-1;display:flex;justify-content:flex-end}.ad-dashboard button{min-height:40px;padding:0 18px;border:0;border-radius:999px;background:#292721;color:#fff;font-size:12px;font-weight:600;cursor:pointer}.ad-dashboard button span{padding-left:8px;font-size:16px}.ad-dashboard__manual{padding:7px 11px;background:var(--wash);border:0;font-size:10px}.ad-dashboard__list{margin-top:38px}.ad-dashboard__section-heading--list{margin-bottom:16px}.ad-dashboard__count{display:inline-flex;min-width:23px;height:23px;align-items:center;justify-content:center;margin-left:7px;border-radius:50%;background:var(--wash);color:#6f6a60;font-size:11px;vertical-align:2px}.ad-dashboard__list-caption{color:#969188;font-size:11px}.ad-dashboard__records{display:grid;gap:10px}.ad-dashboard__record{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px 18px;border:1px solid var(--line);border-radius:13px;background:#fff}.ad-dashboard__record-main{display:flex;align-items:center;gap:13px;min-width:0}.ad-dashboard__record-icon,.ad-dashboard__empty-icon{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:10px;background:var(--wash);color:#81745d}.ad-dashboard__record-label{margin:0 0 5px;font-size:13px;font-weight:600}.ad-dashboard__record-label span{color:var(--muted);font-weight:400}.ad-dashboard__record a{display:block;overflow:hidden;color:#77736a;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.ad-dashboard__metadata{display:grid;gap:5px;flex:none;color:#8d887f;font-size:10px;text-align:right;text-transform:capitalize}.ad-dashboard__empty{display:grid;justify-items:center;padding:35px 20px;border:1px dashed #dedbd3;border-radius:14px;background:#fbfaf8;text-align:center}.ad-dashboard__empty-icon{width:38px;height:38px}.ad-dashboard__empty h3{margin:13px 0 4px;font-size:14px;font-weight:600}.ad-dashboard__empty p{margin:0;color:var(--muted);font-size:12px}.ad-dashboard__empty small{margin-top:13px;color:#969188;font-size:10px}
@media(max-width:680px){.ad-dashboard{padding:34px 18px 56px}.ad-dashboard__header{display:grid;gap:16px;margin-bottom:25px}.ad-dashboard h1{font-size:27px}.ad-dashboard__status{justify-self:start}.ad-dashboard__panel{padding:21px 17px}.ad-dashboard__form{grid-template-columns:1fr;gap:13px}.ad-dashboard__field--wide,.ad-dashboard__error,.ad-dashboard__actions{grid-column:1}.ad-dashboard__actions button{width:100%}.ad-dashboard__list{margin-top:30px}.ad-dashboard__section-heading--list{align-items:flex-start}.ad-dashboard__list-caption{max-width:105px;text-align:right;line-height:1.4}.ad-dashboard__record{align-items:flex-start;flex-direction:column;gap:12px;padding:15px}.ad-dashboard__record-main{width:100%}.ad-dashboard__record a{max-width:calc(100vw - 100px)}.ad-dashboard__metadata{display:flex;justify-content:space-between;width:100%;text-align:left}}
</style>

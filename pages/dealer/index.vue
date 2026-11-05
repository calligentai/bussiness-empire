<script setup lang="ts">
useSeoMeta({
  title: "Dealer overview — Lava Bean demo",
  description: "A local read-only sample of the Lava Bean dealer overview.",
});

const overview = [
  { label: "Orders this month", value: "24", detail: "Fictional sample" },
  { label: "Coffee in the sample catalog", value: "3 lots", detail: "Virunga · Nyungwe · Kivu" },
  { label: "Last update", value: "Local fixture", detail: "No live account connected" },
];

const orders = [
  { id: "LB-2048", date: "31 Oct 2026", items: "Virunga Washed · 6 bags", total: "€ 114.00", status: "Ready to ship" },
  { id: "LB-2047", date: "29 Oct 2026", items: "Nyungwe Honey · 4 bags", total: "€ 84.00", status: "Processing" },
  { id: "LB-2046", date: "27 Oct 2026", items: "Kivu Natural · 8 bags", total: "€ 168.00", status: "Delivered" },
];

const availability = [
  { lot: "Virunga Washed", detail: "Washed · 1,900 m", bags: "18 bags" },
  { lot: "Nyungwe Honey", detail: "Honey · 1,750 m", bags: "12 bags" },
  { lot: "Kivu Natural", detail: "Natural · 1,820 m", bags: "7 bags" },
];
</script>

<template>
  <div class="dealer-page lb-container">
    <div class="dealer-heading">
      <div>
        <h1>Dealer overview</h1>
        <p class="dealer-heading__lead">A clear view of sample orders and current lots.</p>
      </div>
      <p class="dealer-account">Sample account <span>Rotterdam</span></p>
    </div>

    <p class="dealer-demo" role="note">
      <span aria-hidden="true" class="dealer-demo__mark">i</span>
      Demo data · fictional sample account. This page is read-only; no live dealer account is connected.
    </p>

    <section class="dealer-overview" aria-label="Sample dealer summary">
      <dl v-for="item in overview" :key="item.label" class="dealer-summary">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
        <dd class="dealer-summary__detail">{{ item.detail }}</dd>
      </dl>
    </section>

    <div class="dealer-content">
      <section class="dealer-section" aria-labelledby="orders-title">
        <div class="dealer-section__heading">
          <div>
            <h2 id="orders-title">Recent sample orders</h2>
            <p>Three fictional orders from the local preview.</p>
          </div>
          <span class="dealer-section__period">October 2026</span>
        </div>
        <div class="dealer-table-wrap">
          <table aria-label="Recent sample orders" class="dealer-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Placed</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <th scope="row" data-label="Order">{{ order.id }}</th>
                <td data-label="Placed">{{ order.date }}</td>
                <td data-label="Items">{{ order.items }}</td>
                <td data-label="Total" class="dealer-table__amount">{{ order.total }}</td>
                <td data-label="Status"><span class="dealer-status">{{ order.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="dealer-section dealer-lots" aria-labelledby="lots-title">
        <div class="dealer-section__heading">
          <div>
            <h2 id="lots-title">Sample lot availability</h2>
            <p>Illustrative stock for the demo catalog.</p>
          </div>
          <span class="dealer-section__period">3 lots</span>
        </div>
        <ul class="dealer-lot-list">
          <li v-for="item in availability" :key="item.lot">
            <div>
              <h3>{{ item.lot }}</h3>
              <p>{{ item.detail }}</p>
            </div>
            <span>{{ item.bags }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dealer-page {
  padding-block: var(--lb-space-8) var(--lb-space-9);
}

.dealer-heading {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-4);
  align-items: flex-start;
}

.dealer-heading h1 {
  font-size: var(--lb-text-700);
}

.dealer-heading__lead {
  margin-top: var(--lb-space-2);
  color: var(--lb-color-muted);
}

.dealer-account {
  display: flex;
  flex-direction: column;
  gap: var(--lb-space-1);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.dealer-account span {
  color: var(--lb-color-ink);
  font-weight: var(--lb-weight-medium);
}

.dealer-demo {
  display: flex;
  align-items: flex-start;
  gap: var(--lb-space-3);
  margin-top: var(--lb-space-6);
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  padding: var(--lb-space-4);
  background: var(--lb-color-surface);
  color: var(--lb-color-paper);
  font-size: var(--lb-text-200);
}

.dealer-demo__mark {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border: var(--lb-border-hairline) solid var(--lb-color-ember);
  border-radius: var(--lb-radius-pill);
  color: var(--lb-color-ember);
  font-family: var(--lb-font-mono);
}

.dealer-overview {
  display: grid;
  grid-template-columns: 1fr;
  margin-top: var(--lb-space-7);
  border-block: var(--lb-border-hairline) solid var(--lb-color-line);
}

.dealer-summary {
  padding-block: var(--lb-space-4);
}

.dealer-summary + .dealer-summary {
  border-top: var(--lb-border-hairline) solid var(--lb-color-line);
}

.dealer-summary dt,
.dealer-summary__detail {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.dealer-summary dd {
  margin: 0;
}

.dealer-summary dd:not(.dealer-summary__detail) {
  margin-top: var(--lb-space-2);
  font-family: var(--lb-font-display);
  font-size: var(--lb-text-500);
  font-weight: var(--lb-weight-bold);
  font-variant-numeric: tabular-nums;
}

.dealer-summary__detail {
  margin-top: var(--lb-space-1) !important;
}

.dealer-content {
  display: grid;
  gap: var(--lb-space-8);
  margin-top: var(--lb-space-8);
}

.dealer-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--lb-space-3);
  margin-bottom: var(--lb-space-4);
}

.dealer-section h2 {
  font-size: var(--lb-text-500);
}

.dealer-section__heading p,
.dealer-section__period {
  margin-top: var(--lb-space-1);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.dealer-section__period {
  font-family: var(--lb-font-mono);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
}

.dealer-table-wrap {
  border-block: var(--lb-border-hairline) solid var(--lb-color-line);
}

.dealer-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: var(--lb-text-200);
}

.dealer-table th,
.dealer-table td {
  padding: var(--lb-space-3) var(--lb-space-2);
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
  vertical-align: middle;
}

.dealer-table thead th {
  color: var(--lb-color-muted);
  font-size: var(--lb-text-100);
  font-weight: var(--lb-weight-medium);
  letter-spacing: var(--lb-tracking-wide);
  text-transform: uppercase;
  white-space: nowrap;
}

.dealer-table tbody tr:last-child th,
.dealer-table tbody tr:last-child td {
  border-bottom: 0;
}

.dealer-table tbody th {
  font-family: var(--lb-font-mono);
  font-weight: var(--lb-weight-medium);
  white-space: nowrap;
}

.dealer-table__amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .dealer-table,
  .dealer-table tbody {
    display: block;
  }

  .dealer-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .dealer-table tbody tr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: var(--lb-space-2) var(--lb-space-3);
    padding-block: var(--lb-space-3);
    border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
  }

  .dealer-table tbody tr:last-child {
    border-bottom: 0;
  }

  .dealer-table tbody th,
  .dealer-table tbody td {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--lb-space-1);
    padding: 0;
    border: 0;
    overflow-wrap: anywhere;
  }

  .dealer-table tbody th::before,
  .dealer-table tbody td::before {
    content: attr(data-label);
    color: var(--lb-color-muted);
    font-family: var(--lb-font-body);
    font-size: var(--lb-text-100);
    font-weight: var(--lb-weight-medium);
    letter-spacing: var(--lb-tracking-wide);
    text-transform: uppercase;
  }

  .dealer-table tbody th {
    grid-column: 1;
  }

  .dealer-table tbody td[data-label="Total"] {
    grid-column: 2;
    grid-row: 1;
    text-align: right;
  }

  .dealer-table tbody td[data-label="Total"]::before,
  .dealer-table tbody td[data-label="Status"]::before {
    align-self: flex-end;
  }

  .dealer-table tbody td[data-label="Placed"] {
    grid-column: 1;
  }

  .dealer-table tbody td[data-label="Items"] {
    grid-column: 1;
  }

  .dealer-table tbody td[data-label="Status"] {
    grid-column: 2;
    grid-row: 2 / span 2;
    align-items: flex-end;
    justify-content: center;
    text-align: right;
  }
}

.dealer-status {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border: var(--lb-border-hairline) solid var(--lb-color-line);
  padding-inline: var(--lb-space-2);
  white-space: nowrap;
}

.dealer-lot-list {
  margin: 0;
  padding: 0;
  border-top: var(--lb-border-hairline) solid var(--lb-color-line);
  list-style: none;
}

.dealer-lot-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--lb-space-4);
  padding-block: var(--lb-space-4);
  border-bottom: var(--lb-border-hairline) solid var(--lb-color-line);
}

.dealer-lot-list h3 {
  font-size: var(--lb-text-300);
}

.dealer-lot-list p {
  margin-top: var(--lb-space-1);
  color: var(--lb-color-muted);
  font-size: var(--lb-text-200);
}

.dealer-lot-list li > span {
  font-family: var(--lb-font-mono);
  font-size: var(--lb-text-200);
  white-space: nowrap;
}

@media (min-width: 768px) {
  .dealer-page {
    padding-block: var(--lb-space-9);
  }

  .dealer-heading {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .dealer-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dealer-summary {
    padding: var(--lb-space-5) var(--lb-space-4);
  }

  .dealer-summary:first-child {
    padding-left: 0;
  }

  .dealer-summary + .dealer-summary {
    border-top: 0;
    border-left: var(--lb-border-hairline) solid var(--lb-color-line);
  }

  .dealer-content {
    grid-template-columns: minmax(0, 1.7fr) minmax(16rem, 0.8fr);
    align-items: start;
    gap: var(--lb-space-7);
  }

  .dealer-table th,
  .dealer-table td {
    padding-inline: var(--lb-space-3);
  }

  .dealer-table th:first-child,
  .dealer-table td:first-child {
    padding-left: 0;
  }
}
</style>

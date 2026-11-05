<script setup lang="ts">
import { createVerifiedPrincipal } from "../../packages/contracts/auth";
<<<<<<< HEAD
import { DealerAdLibrarySourceRegistry } from "../../packages/contracts/dealer/ad-library";
=======
import { DealerAdLibrarySourceRegistry } from "../../packages/contracts/dealer";
>>>>>>> origin/feature/BUS-123-m6-r6-4-follow-up-dealer-dashboard-for-public-ad-library-sources-0

// Fixture identity only. This page is a local demo and is not production-authenticated.
const now = Math.floor(Date.now() / 1000);
const principal = createVerifiedPrincipal(
  { sub: "demo-dealer-user", dealerId: "demo-dealer", issuer: "lavabean-auth", expiresAt: now + 3600 },
  { signatureValid: true, nowEpochSeconds: now },
);
const registry = new DealerAdLibrarySourceRegistry();
</script>

<template><AdLibraryDashboard :registry="registry" :principal="principal" /></template>

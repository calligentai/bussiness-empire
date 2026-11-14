// @ts-nocheck
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { LAVABEAN_MODULE } from "../modules/lavabean";

const COUNTRIES = ["nl", "be", "de", "fr"];

interface SeedVariant {
  title: string;
  sku: string;
  fixture_variant_id: string;
  manage_inventory: boolean;
  inventory_quantity: number | null;
  option: Record<string, string>;
  prices: Array<{ amount: number; currency_code: string }>;
}

interface SeedProduct {
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  thumbnail: string | null;
  origin_country: string | null;
  metadata: Record<string, unknown> | null;
  images: Array<{ url: string }>;
  options: Array<{ title: string; values: string[] }>;
  variants: SeedVariant[];
}

const statePath = () => process.env.SEED_STATE_PATH || join(process.cwd(), ".seed-state.json");

const readCatalog = (): SeedProduct[] =>
  JSON.parse(readFileSync(join(process.cwd(), "src/data/catalog.json"), "utf8"));

export default async function seedLavaBean({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillment = container.resolve(Modules.FULFILLMENT);
  const salesChannels = container.resolve(Modules.SALES_CHANNEL);
  const stores = container.resolve(Modules.STORE);
  const lavabean = container.resolve(LAVABEAN_MODULE) as any;

  const [store] = await stores.listStores();
  let channels = await salesChannels.listSalesChannels({ name: "Lava Bean" });
  if (!channels.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Lava Bean" }] },
    });
    channels = result;
  }
  const salesChannel = channels[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "eur", is_default: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  });

  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });
  let region = (existingRegions ?? []).find((item: { name?: string }) => item.name === "Netherlands");
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Netherlands",
            currency_code: "eur",
            countries: COUNTRIES,
            payment_providers: ["pp_system_default"],
            automatic_taxes: false,
          },
        ],
      },
    });
    region = result[0];
  }

  const { data: existingLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  let location = (existingLocations ?? []).find((item: { name?: string }) => item.name === "Rotterdam");
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Rotterdam",
            address: { city: "Rotterdam", country_code: "nl", address_1: "Waalhaven" },
          },
        ],
      },
    });
    location = result[0];
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
  }

  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update: { default_location_id: location.id } },
  });

  const profiles = await fulfillment.listShippingProfiles({ type: "default" });
  let profile = profiles[0];
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    });
    profile = result[0];
  }

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  if (!(existingOptions ?? []).some((item: { name?: string }) => item.name === "Lava Bean shipping")) {
    const fulfillmentSet = await fulfillment.createFulfillmentSets({
      name: "Netherlands delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Shop countries",
          geo_zones: COUNTRIES.map((country_code) => ({ country_code, type: "country" })),
        },
      ],
    });
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    });
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Lava Bean shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: profile.id,
          type: { label: "Shipping", description: "No shipping charge on this sandbox order.", code: "lavabean" },
          prices: [
            { currency_code: "eur", amount: 0 },
            { region_id: region.id, amount: 0 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: location.id, add: [salesChannel.id] },
  });

  let publishableToken: string | undefined;
  try {
    const previous = JSON.parse(readFileSync(statePath(), "utf8")) as { publishableKey?: string };
    publishableToken = previous.publishableKey;
  } catch {
    publishableToken = undefined;
  }
  if (!publishableToken) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Lava Bean storefront", type: "publishable", created_by: "" }] },
    });
    const created = result[0] as { id: string; token?: string };
    publishableToken = created.token;
    if (!publishableToken) {
      throw new Error("Medusa did not return a publishable API key token");
    }
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: created.id, add: [salesChannel.id] },
    });
  }

  const catalog = readCatalog();
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  });
  const handles = new Set((existingProducts ?? []).map((item: { handle?: string }) => item.handle));
  const missing = catalog.filter((product) => !handles.has(product.handle));
  if (missing.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: missing.map((product) => ({
          title: product.title,
          handle: product.handle,
          subtitle: product.subtitle,
          description: product.description,
          status: ProductStatus.PUBLISHED,
          thumbnail: product.thumbnail,
          origin_country: product.origin_country?.toLowerCase() ?? null,
          metadata: product.metadata,
          shipping_profile_id: profile.id,
          images: product.images,
          options: product.options.map((option) => ({ title: option.title, values: option.values })),
          variants: product.variants.map((variant) => ({
            title: variant.title,
            sku: variant.sku,
            manage_inventory: variant.manage_inventory,
            options: variant.option,
            metadata: { fixture_variant_id: variant.fixture_variant_id },
            prices: variant.prices,
          })),
          sales_channels: [{ id: salesChannel.id }],
        })),
      },
    });
  }

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.id"],
  });
  const unleveled = (inventoryItems ?? []).filter(
    (item: { location_levels?: unknown[] }) => !item.location_levels?.length,
  );
  if (unleveled.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: unleveled.map((item: { id: string }) => ({
          location_id: location.id,
          stocked_quantity: 100,
          inventory_item_id: item.id,
        })),
      },
    });
  }

  const counters = await lavabean.listOrderNumbers({}, { take: 1 });
  if (!counters.length) {
    await lavabean.createOrderNumbers({ next_value: 100001 });
  }

  writeFileSync(
    statePath(),
    JSON.stringify({ publishableKey: publishableToken, regionId: region.id, salesChannelId: salesChannel.id }, null, 2),
  );
  logger.info("Lava Bean catalog seeded.");
}

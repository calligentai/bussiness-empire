import { fetchCatalog } from "../../../commerce/catalog";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") ?? "";
  const [product] = await fetchCatalog(decodeURIComponent(slug));
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Coffee lot not found" });
  }
  return product;
});

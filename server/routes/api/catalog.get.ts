import { fetchCatalog } from "../../commerce/catalog";

export default defineEventHandler(async () => fetchCatalog());

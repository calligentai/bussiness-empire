import { getOrder } from "../../../commerce/store";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const order = await getOrder(decodeURIComponent(id), { env: process.env });
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" });
  }
  return order;
});

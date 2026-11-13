import { CheckoutError, placeOrder } from "../../commerce/store";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  try {
    return await placeOrder(body ?? {}, { env: process.env });
  } catch (error) {
    if (error instanceof CheckoutError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: { code: error.code },
      });
    }
    throw error;
  }
});

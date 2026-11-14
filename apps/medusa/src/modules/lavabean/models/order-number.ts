import { model } from "@medusajs/framework/utils";

const OrderNumber = model.define("order_number", {
  id: model.id().primaryKey(),
  next_value: model.number(),
});

export default OrderNumber;

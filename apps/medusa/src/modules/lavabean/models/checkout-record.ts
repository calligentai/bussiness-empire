import { model } from "@medusajs/framework/utils";

const CheckoutRecord = model.define("checkout_record", {
  id: model.id().primaryKey(),
  scope_key: model.text().unique(),
  namespace: model.text(),
  idempotency_key: model.text(),
  fingerprint: model.text(),
  public_id: model.text().unique(),
  status: model.text(),
  medusa_order_id: model.text().nullable(),
  payment_id: model.text().nullable(),
  projection: model.json(),
});

export default CheckoutRecord;

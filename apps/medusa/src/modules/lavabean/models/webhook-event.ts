import { model } from "@medusajs/framework/utils";

const WebhookEvent = model.define("webhook_event", {
  id: model.id().primaryKey(),
  event_id: model.text().unique(),
  public_id: model.text(),
  outcome: model.text(),
});

export default WebhookEvent;

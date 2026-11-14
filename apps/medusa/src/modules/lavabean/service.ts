import { MedusaService } from "@medusajs/framework/utils";
import CheckoutRecord from "./models/checkout-record";
import OrderNumber from "./models/order-number";
import WebhookEvent from "./models/webhook-event";

class LavabeanModuleService extends MedusaService({
  CheckoutRecord,
  WebhookEvent,
  OrderNumber,
}) {}

export default LavabeanModuleService;

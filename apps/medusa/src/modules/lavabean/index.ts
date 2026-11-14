import { Module } from "@medusajs/framework/utils";
import LavabeanModuleService from "./service";

export const LAVABEAN_MODULE = "lavabean";

export default Module(LAVABEAN_MODULE, {
  service: LavabeanModuleService,
});

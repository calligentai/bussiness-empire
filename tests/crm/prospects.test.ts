import { describe, it, expect, beforeEach } from "vitest";
import { useCrm } from "../../composables/useCrm";

describe("M6.1 Prospects CRM — lead to pipeline", () => {
  beforeEach(() => {
    // reset shared state by recreating? useCrm returns fresh refs per call in tests
  });

  it("creates a lead", () => {
    const crm = useCrm();
    const lead = crm.createLead("dealer-a", { name: "Acme Co", email: "a@acme.test" });
    expect(lead.id).toBeTruthy();
    expect(lead.dealerId).toBe("dealer-a");
    expect(lead.name).toBe("Acme Co");
    expect(lead.stage).toBe("new");
    expect(crm.leads.value).toHaveLength(1);
  });

  it("moves a lead through pipeline stages", () => {
    const crm = useCrm();
    const lead = crm.createLead("dealer-a", { name: "Acme Co" });
    const moved = crm.movePipeline(lead.id, "dealer-a", "contacted");
    expect(moved).toBe(true);
    expect(crm.getLead(lead.id, "dealer-a")?.stage).toBe("contacted");
    const moved2 = crm.movePipeline(lead.id, "dealer-a", "qualified");
    expect(moved2).toBe(true);
    expect(crm.getLead(lead.id, "dealer-a")?.stage).toBe("qualified");
  });

  it("rejects pipeline move for wrong dealer", () => {
    const crm = useCrm();
    const lead = crm.createLead("dealer-a", { name: "Acme Co" });
    const moved = crm.movePipeline(lead.id, "dealer-b", "contacted");
    expect(moved).toBe(false);
    expect(crm.getLead(lead.id, "dealer-a")?.stage).toBe("new");
  });

  it("negative cross-dealer read: dealer-b cannot read dealer-a lead", () => {
    const crm = useCrm();
    const lead = crm.createLead("dealer-a", { name: "Acme Co" });
    expect(crm.getLead(lead.id, "dealer-a")).not.toBeNull();
    expect(crm.getLead(lead.id, "dealer-b")).toBeNull();
  });

  it("creates a contact linked to a lead", () => {
    const crm = useCrm();
    const lead = crm.createLead("dealer-a", { name: "Acme Co" });
    const contact = crm.createContact("dealer-a", { name: "Jane", email: "jane@acme.test", leadId: lead.id });
    expect(contact.id).toBeTruthy();
    expect(contact.dealerId).toBe("dealer-a");
    expect(contact.leadId).toBe(lead.id);
    expect(crm.contacts.value).toHaveLength(1);
  });

  it("lists leads filtered by dealer", () => {
    const crm = useCrm();
    crm.createLead("dealer-a", { name: "A1" });
    crm.createLead("dealer-b", { name: "B1" });
    expect(crm.listLeads("dealer-a")).toHaveLength(1);
    expect(crm.listLeads("dealer-b")).toHaveLength(1);
    expect(crm.listLeads("dealer-a")[0].name).toBe("A1");
  });
});
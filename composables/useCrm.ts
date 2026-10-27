import { computed, ref } from "vue";

export type PipelineStage = "new" | "contacted" | "qualified" | "lost" | "won";

export interface Lead {
  id: string;
  dealerId: string;
  name: string;
  email?: string | null;
  stage: PipelineStage;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  dealerId: string;
  name: string;
  email?: string | null;
  leadId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CrmError = {
  notFound: "crm.not_found",
  crossDealer: "crm.cross_dealer",
};

export const useCrm = () => {
  const leads = ref<Lead[]>([]);
  const contacts = ref<Contact[]>([]);

  const now = () => new Date().toISOString();

  const id = () => `crm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const ownLead = (id: string, dealerId: string) =>
    leads.value.find((l) => l.id === id && l.dealerId === dealerId);

  const ownContact = (id: string, dealerId: string) =>
    contacts.value.find((c) => c.id === id && c.dealerId === dealerId);

  const createLead = (dealerId: string, input: { name: string; email?: string | null }) => {
    const lead: Lead = {
      id: id(),
      dealerId,
      name: input.name,
      email: input.email ?? null,
      stage: "new",
      createdAt: now(),
      updatedAt: now(),
    };
    leads.value.push(lead);
    return lead;
  };

  const getLead = (id: string, dealerId: string) => ownLead(id, dealerId) ?? null;

  const listLeads = (dealerId: string) => leads.value.filter((l) => l.dealerId === dealerId);

  const movePipeline = (id: string, dealerId: string, stage: PipelineStage) => {
    const lead = ownLead(id, dealerId);
    if (!lead) return false;
    lead.stage = stage;
    lead.updatedAt = now();
    return true;
  };

  const createContact = (
    dealerId: string,
    input: { name: string; email?: string | null; leadId?: string | null }
  ) => {
    const contact: Contact = {
      id: id(),
      dealerId,
      name: input.name,
      email: input.email ?? null,
      leadId: input.leadId ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    contacts.value.push(contact);
    return contact;
  };

  const getContact = (id: string, dealerId: string) => ownContact(id, dealerId) ?? null;

  const listContacts = (dealerId: string) =>
    contacts.value.filter((c) => c.dealerId === dealerId);

  return {
    leads: computed(() => leads.value),
    contacts: computed(() => contacts.value),
    createLead,
    getLead,
    listLeads,
    movePipeline,
    createContact,
    getContact,
    listContacts,
  };
};
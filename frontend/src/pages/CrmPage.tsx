import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeDollarSign,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Loader2,
  PhoneCall,
  PlusCircle,
  RefreshCcw,
  Send,
  Trash2,
  TrendingUp,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type {
  Client,
  CrmDashboard,
  FollowUp,
  Lead,
  SalesPipelineItem,
} from "../types/crm";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white";

const leadStatuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const sources = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "GOOGLE_ADS",
  "META_ADS",
  "EMAIL_CAMPAIGN",
  "PHONE",
  "WALK_IN",
  "OTHER",
];

const clientStatuses = ["PROSPECT", "ACTIVE", "ON_HOLD", "INACTIVE", "CHURNED"];
const pipelineStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const followUpTypes = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "PROPOSAL", "TASK", "OTHER"];

function tomorrowDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function formatMoney(value?: number | null) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function CrmPage() {
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [pipeline, setPipeline] = useState<SalesPipelineItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [leadForm, setLeadForm] = useState({
    companyName: "New Growth Brand",
    contactName: "Primary Contact",
    email: "client@example.com",
    phone: "9999999999",
    source: "WEBSITE",
    estimatedValue: "50000",
    assignedToId: "",
  });

  const [clientForm, setClientForm] = useState({
    name: "Retainer Client",
    status: "PROSPECT",
    source: "REFERRAL",
    industry: "E-commerce",
    email: "accounts@example.com",
    phone: "8888888888",
    retainerValue: "25000",
    contractValue: "150000",
    accountOwnerId: "",
  });

  const [contactForm, setContactForm] = useState({
    clientId: "",
    name: "Decision Maker",
    designation: "Founder",
    email: "founder@example.com",
    phone: "7777777777",
  });

  const [followUpForm, setFollowUpForm] = useState({
    target: "",
    subject: "Discovery call",
    type: "CALL",
    scheduledAt: tomorrowDateTime(),
    assignedToId: "",
  });

  const [pipelineForm, setPipelineForm] = useState({
    target: "",
    name: "Monthly retainer opportunity",
    stage: "LEAD",
    amount: "75000",
    probability: "20",
    ownerId: "",
  });

  const targetOptions = useMemo(
    () => [
      ...leads.map((lead) => ({
        value: `lead:${lead.id}`,
        label: `Lead - ${lead.companyName}`,
      })),
      ...clients.map((client) => ({
        value: `client:${client.id}`,
        label: `Client - ${client.name}`,
      })),
    ],
    [clients, leads]
  );

  async function boot() {
    setLoading(true);
    setMessage("");

    try {
      const [
        dashboardResponse,
        leadsResponse,
        clientsResponse,
        followUpsResponse,
        pipelineResponse,
        employeesResponse,
      ] = await Promise.all([
        apiClient.get("/crm/dashboard"),
        apiClient.get("/crm/leads"),
        apiClient.get("/crm/clients"),
        apiClient.get("/crm/follow-ups"),
        apiClient.get("/crm/sales-pipeline"),
        apiClient.get("/employees"),
      ]);

      const nextLeads = leadsResponse.data.data || [];
      const nextClients = clientsResponse.data.data || [];
      const nextEmployees = employeesResponse.data.data || [];
      const firstEmployeeId = nextEmployees[0]?.id || "";
      const firstClientId = nextClients[0]?.id || "";
      const firstTarget =
        nextLeads[0]?.id
          ? `lead:${nextLeads[0].id}`
          : nextClients[0]?.id
            ? `client:${nextClients[0].id}`
            : "";

      setDashboard(dashboardResponse.data.data);
      setLeads(nextLeads);
      setClients(nextClients);
      setFollowUps(followUpsResponse.data.data || []);
      setPipeline(pipelineResponse.data.data || []);
      setEmployees(nextEmployees);

      setLeadForm((current) => ({
        ...current,
        assignedToId: current.assignedToId || firstEmployeeId,
      }));
      setClientForm((current) => ({
        ...current,
        accountOwnerId: current.accountOwnerId || firstEmployeeId,
      }));
      setContactForm((current) => ({
        ...current,
        clientId: current.clientId || firstClientId,
      }));
      setFollowUpForm((current) => ({
        ...current,
        target: current.target || firstTarget,
        assignedToId: current.assignedToId || firstEmployeeId,
      }));
      setPipelineForm((current) => ({
        ...current,
        target: current.target || firstTarget,
        ownerId: current.ownerId || firstEmployeeId,
      }));
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: () => Promise<unknown>, successText: string) {
    setLoading(true);
    setMessage("");

    try {
      await action();
      setMessage(successText);
      await boot();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "CRM action failed");
    } finally {
      setLoading(false);
    }
  }

  function splitTarget(target: string) {
    const [type, id] = target.split(":");
    return {
      leadId: type === "lead" ? id : null,
      clientId: type === "client" ? id : null,
    };
  }

  function createLead() {
    return runAction(
      () =>
        apiClient.post("/crm/leads", {
          ...leadForm,
          estimatedValue: leadForm.estimatedValue
            ? Number(leadForm.estimatedValue)
            : null,
        }),
      "Lead created successfully"
    );
  }

  function createClient() {
    return runAction(
      () =>
        apiClient.post("/crm/clients", {
          ...clientForm,
          retainerValue: clientForm.retainerValue
            ? Number(clientForm.retainerValue)
            : null,
          contractValue: clientForm.contractValue
            ? Number(clientForm.contractValue)
            : null,
        }),
      "Client created successfully"
    );
  }

  function createContact() {
    return runAction(
      () =>
        apiClient.post(`/crm/clients/${contactForm.clientId}/contacts`, {
          name: contactForm.name,
          designation: contactForm.designation,
          email: contactForm.email,
          phone: contactForm.phone,
          isPrimary: true,
        }),
      "Client contact saved successfully"
    );
  }

  function createFollowUp() {
    const target = splitTarget(followUpForm.target);

    return runAction(
      () =>
        apiClient.post("/crm/follow-ups", {
          ...target,
          subject: followUpForm.subject,
          type: followUpForm.type,
          scheduledAt: followUpForm.scheduledAt,
          assignedToId: followUpForm.assignedToId || null,
        }),
      "Follow-up scheduled successfully"
    );
  }

  function createPipelineItem() {
    const target = splitTarget(pipelineForm.target);

    return runAction(
      () =>
        apiClient.post("/crm/sales-pipeline", {
          ...target,
          name: pipelineForm.name,
          stage: pipelineForm.stage,
          amount: pipelineForm.amount ? Number(pipelineForm.amount) : null,
          probability: pipelineForm.probability
            ? Number(pipelineForm.probability)
            : 10,
          ownerId: pipelineForm.ownerId || null,
        }),
      "Pipeline item created successfully"
    );
  }

  function updateLeadStatus(id: string, status: string) {
    return runAction(
      () => apiClient.put(`/crm/leads/${id}`, { status }),
      "Lead status updated successfully"
    );
  }

  function convertLead(id: string) {
    return runAction(
      () => apiClient.post(`/crm/leads/${id}/convert`, {}),
      "Lead converted to client"
    );
  }

  function completeFollowUp(id: string) {
    return runAction(
      () =>
        apiClient.put(`/crm/follow-ups/${id}/complete`, {
          outcome: "Completed from CRM workspace",
        }),
      "Follow-up completed"
    );
  }

  function deleteLead(id: string) {
    return runAction(
      () => apiClient.delete(`/crm/leads/${id}`),
      "Lead deleted successfully"
    );
  }

  function deleteClient(id: string) {
    return runAction(
      () => apiClient.delete(`/crm/clients/${id}`),
      "Client deleted successfully"
    );
  }

  function updatePipelineStage(id: string, stage: string) {
    return runAction(
      () => apiClient.put(`/crm/sales-pipeline/${id}/stage`, { stage }),
      "Pipeline stage updated"
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
              Client CRM
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Lead-to-Client Pipeline
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Leads, clients, contacts, follow-ups and sales pipeline are
              connected with backend APIs.
            </p>
          </div>

          <button
            onClick={boot}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
          {message}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Leads"
          value={dashboard?.totalLeads ?? 0}
          icon={ClipboardList}
        />
        <SummaryCard
          title="Active Clients"
          value={dashboard?.activeClients ?? 0}
          icon={UsersRound}
        />
        <SummaryCard
          title="Pending Follow-ups"
          value={dashboard?.pendingFollowUps ?? 0}
          icon={PhoneCall}
        />
        <SummaryCard
          title="Open Pipeline"
          value={formatMoney(dashboard?.openPipelineValue)}
          icon={BadgeDollarSign}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Add Lead" icon={UserRoundPlus}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company">
              <input
                value={leadForm.companyName}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, companyName: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Contact">
              <input
                value={leadForm.contactName}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, contactName: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                value={leadForm.email}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, email: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                value={leadForm.phone}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, phone: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Source">
              <select
                value={leadForm.source}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, source: event.target.value })
                }
                className={inputClass}
              >
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated Value">
              <input
                value={leadForm.estimatedValue}
                onChange={(event) =>
                  setLeadForm({ ...leadForm, estimatedValue: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Owner">
              <EmployeeSelect
                employees={employees}
                value={leadForm.assignedToId}
                onChange={(value) =>
                  setLeadForm({ ...leadForm, assignedToId: value })
                }
              />
            </Field>
          </div>
          <PrimaryButton onClick={createLead} disabled={loading}>
            <PlusCircle size={18} />
            Create Lead
          </PrimaryButton>
        </Panel>

        <Panel title="Add Client" icon={Building2}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client Name">
              <input
                value={clientForm.name}
                onChange={(event) =>
                  setClientForm({ ...clientForm, name: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={clientForm.status}
                onChange={(event) =>
                  setClientForm({ ...clientForm, status: event.target.value })
                }
                className={inputClass}
              >
                {clientStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Industry">
              <input
                value={clientForm.industry}
                onChange={(event) =>
                  setClientForm({ ...clientForm, industry: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                value={clientForm.email}
                onChange={(event) =>
                  setClientForm({ ...clientForm, email: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                value={clientForm.phone}
                onChange={(event) =>
                  setClientForm({ ...clientForm, phone: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Contract Value">
              <input
                value={clientForm.contractValue}
                onChange={(event) =>
                  setClientForm({
                    ...clientForm,
                    contractValue: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Owner">
              <EmployeeSelect
                employees={employees}
                value={clientForm.accountOwnerId}
                onChange={(value) =>
                  setClientForm({ ...clientForm, accountOwnerId: value })
                }
              />
            </Field>
          </div>
          <PrimaryButton onClick={createClient} disabled={loading}>
            <PlusCircle size={18} />
            Create Client
          </PrimaryButton>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Add Contact" icon={UsersRound}>
          <div className="space-y-4">
            <Field label="Client">
              <select
                value={contactForm.clientId}
                onChange={(event) =>
                  setContactForm({ ...contactForm, clientId: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name">
              <input
                value={contactForm.name}
                onChange={(event) =>
                  setContactForm({ ...contactForm, name: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Designation">
              <input
                value={contactForm.designation}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    designation: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <PrimaryButton
              onClick={createContact}
              disabled={loading || !contactForm.clientId}
            >
              <Send size={18} />
              Save Contact
            </PrimaryButton>
          </div>
        </Panel>

        <Panel title="Schedule Follow-up" icon={PhoneCall}>
          <div className="space-y-4">
            <TargetSelect
              value={followUpForm.target}
              options={targetOptions}
              onChange={(value) =>
                setFollowUpForm({ ...followUpForm, target: value })
              }
            />
            <Field label="Subject">
              <input
                value={followUpForm.subject}
                onChange={(event) =>
                  setFollowUpForm({
                    ...followUpForm,
                    subject: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Type">
              <select
                value={followUpForm.type}
                onChange={(event) =>
                  setFollowUpForm({ ...followUpForm, type: event.target.value })
                }
                className={inputClass}
              >
                {followUpTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scheduled At">
              <input
                type="datetime-local"
                value={followUpForm.scheduledAt}
                onChange={(event) =>
                  setFollowUpForm({
                    ...followUpForm,
                    scheduledAt: event.target.value,
                  })
                }
                className={inputClass}
              />
            </Field>
            <PrimaryButton
              onClick={createFollowUp}
              disabled={loading || !followUpForm.target}
            >
              <PhoneCall size={18} />
              Schedule
            </PrimaryButton>
          </div>
        </Panel>

        <Panel title="Add Pipeline" icon={TrendingUp}>
          <div className="space-y-4">
            <TargetSelect
              value={pipelineForm.target}
              options={targetOptions}
              onChange={(value) =>
                setPipelineForm({ ...pipelineForm, target: value })
              }
            />
            <Field label="Name">
              <input
                value={pipelineForm.name}
                onChange={(event) =>
                  setPipelineForm({ ...pipelineForm, name: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Stage">
              <select
                value={pipelineForm.stage}
                onChange={(event) =>
                  setPipelineForm({ ...pipelineForm, stage: event.target.value })
                }
                className={inputClass}
              >
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input
                value={pipelineForm.amount}
                onChange={(event) =>
                  setPipelineForm({ ...pipelineForm, amount: event.target.value })
                }
                className={inputClass}
              />
            </Field>
            <PrimaryButton
              onClick={createPipelineItem}
              disabled={loading || !pipelineForm.target}
            >
              <CircleDollarSign size={18} />
              Add Deal
            </PrimaryButton>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Leads</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {leads.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">No leads found.</p>}
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{lead.companyName.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{lead.companyName}</p>
                      <p className="text-xs text-slate-500 truncate">{lead.contactName || lead.email || "—"}</p>
                      <p className="text-xs text-slate-500">Source: {lead.source}</p>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{formatMoney(lead.estimatedValue)}</span>
                    <select value={lead.status} onChange={(e) => updateLeadStatus(lead.id, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700">
                      {leadStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ActionButton onClick={() => convertLead(lead.id)} disabled={Boolean(lead.convertedClientId)}>Convert</ActionButton>
                    <button onClick={() => deleteLead(lead.id)} className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Clients</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {clients.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">No clients found.</p>}
            {clients.map((client) => (
              <div key={client.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-sm font-black text-white">{client.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{client.name}</p>
                      <p className="text-xs text-slate-500 truncate">{client.industry || client.source}</p>
                      <p className="text-xs text-slate-500">{client.contacts?.[0]?.name || client.email || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700">{client.status}</span>
                    <span className="text-xs font-bold text-slate-700">{formatMoney(client.contractValue)}</span>
                    <span className="text-xs text-slate-500">{client.accountOwner?.user?.name || "—"}</span>
                    <button onClick={() => deleteClient(client.id)} className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Follow-ups</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {followUps.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">No follow-ups found.</p>}
            {followUps.map((followUp) => (
              <div key={followUp.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{followUp.subject}</p>
                    <p className="text-xs text-slate-500">{followUp.lead?.companyName || followUp.client?.name || "—"}</p>
                  </div>
                  <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">{new Date(followUp.scheduledAt).toLocaleString()}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700">{followUp.status}</span>
                    {followUp.status === "PENDING" && <ActionButton onClick={() => completeFollowUp(followUp.id)}>Done</ActionButton>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Sales Pipeline</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {pipeline.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">No pipeline items found.</p>}
            {pipeline.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.lead?.companyName || item.client?.name || "—"}</p>
                  </div>
                  <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">{formatMoney(item.amount)}</span>
                    <select value={item.stage} onChange={(e) => updatePipelineStage(item.id, e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700">
                      {pipelineStages.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading && (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl">
          <Loader2 className="animate-spin" size={16} />
          Processing
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Icon size={24} />
        </div>
        <p className="text-3xl font-black text-slate-950">{value}</p>
      </div>
      <p className="mt-5 text-sm font-black text-slate-900">{title}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Icon size={22} />
        </div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:bg-slate-300"
    >
      {children}
    </button>
  );
}

function EmployeeSelect({
  employees,
  value,
  onChange,
}: {
  employees: Employee[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">Unassigned</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.user?.name || employee.employeeCode}
        </option>
      ))}
    </select>
  );
}

function TargetSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Linked Record">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">Select lead or client</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export default CrmPage;

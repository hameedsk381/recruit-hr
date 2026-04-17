// services/integrationRegistry.ts

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: "ATS" | "HRIS" | "Communication" | "BGV" | "E-Sign" | "Calendar" | "Assessment" | "Other";
  credentialFields: CredentialField[];
  docsUrl: string;
}

export const INTEGRATION_REGISTRY: Record<string, IntegrationDefinition> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn Jobs",
    description: "Post jobs directly and sync applicants in real-time.",
    category: "ATS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your LinkedIn app client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your LinkedIn app client secret" },
      { key: "organizationId", label: "Organization ID", type: "text", required: true, placeholder: "LinkedIn organization URN ID" },
    ],
    docsUrl: "https://developer.linkedin.com/docs/guide/v2/jobs",
  },
  indeed: {
    id: "indeed",
    name: "Indeed",
    description: "Publish jobs to Indeed and import applicants automatically.",
    category: "ATS",
    credentialFields: [
      { key: "publisherId", label: "Publisher ID", type: "text", required: true, placeholder: "Indeed publisher ID" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Indeed API key" },
    ],
    docsUrl: "https://opensource.indeedeng.io/api-documentation/docs/indeed-apply/",
  },
  naukri: {
    id: "naukri",
    name: "Naukri",
    description: "Post jobs on India's largest job portal.",
    category: "ATS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Naukri client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Naukri client secret" },
    ],
    docsUrl: "https://www.naukri.com/jobseeker/help/api",
  },
  glassdoor: {
    id: "glassdoor",
    name: "Glassdoor",
    description: "Post jobs and monitor employer reviews in one place.",
    category: "ATS",
    credentialFields: [
      { key: "partnerId", label: "Partner ID", type: "text", required: true, placeholder: "Glassdoor partner ID" },
      { key: "partnerKey", label: "Partner Key", type: "password", required: true, placeholder: "Glassdoor partner key" },
    ],
    docsUrl: "https://www.glassdoor.com/developer/index.htm",
  },
  docusign: {
    id: "docusign",
    name: "DocuSign",
    description: "Send offer letters for legally binding electronic signatures.",
    category: "E-Sign",
    credentialFields: [
      { key: "integrationKey", label: "Integration Key", type: "text", required: true, placeholder: "DocuSign integration key (client ID)" },
      { key: "secretKey", label: "Secret Key", type: "password", required: true, placeholder: "DocuSign secret key" },
      { key: "accountId", label: "Account ID", type: "text", required: true, placeholder: "DocuSign account GUID" },
      { key: "baseUrl", label: "Base URL", type: "url", required: false, placeholder: "https://na4.docusign.net (leave blank for default)" },
    ],
    docsUrl: "https://developers.docusign.com/docs/esign-rest-api/",
  },
  adobesign: {
    id: "adobesign",
    name: "Adobe Sign",
    description: "Collect e-signatures on offer letters and NDAs.",
    category: "E-Sign",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Adobe Sign application client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Adobe Sign application client secret" },
    ],
    docsUrl: "https://www.adobe.com/go/adobesign-api-overview",
  },
  authbridge: {
    id: "authbridge",
    name: "AuthBridge",
    description: "India's leading background verification and identity service.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "AuthBridge API key" },
      { key: "clientCode", label: "Client Code", type: "text", required: true, placeholder: "AuthBridge client code" },
    ],
    docsUrl: "https://authbridge.com/developer",
  },
  checkr: {
    id: "checkr",
    name: "Checkr",
    description: "US background checks and continuous criminal monitoring.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Checkr live API key" },
      { key: "packageSlug", label: "Default Package", type: "text", required: false, placeholder: "tasker_standard (optional default)" },
    ],
    docsUrl: "https://docs.checkr.com/",
  },
  idfy: {
    id: "idfy",
    name: "IDfy",
    description: "Identity verification and employee onboarding checks.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "IDfy API key" },
      { key: "accountId", label: "Account ID", type: "text", required: true, placeholder: "IDfy account ID" },
    ],
    docsUrl: "https://docs.idfy.io/",
  },
  sterling: {
    id: "sterling",
    name: "Sterling",
    description: "Global background screening and identity verification.",
    category: "BGV",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Sterling client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Sterling client secret" },
    ],
    docsUrl: "https://developer.sterlingcheck.com/",
  },
  greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    description: "Two-way ATS sync for applications and pipeline stages.",
    category: "ATS",
    credentialFields: [
      { key: "apiKey", label: "Harvest API Key", type: "password", required: true, placeholder: "Greenhouse Harvest API key" },
      { key: "onBehalfOf", label: "On-Behalf-Of User ID", type: "text", required: false, placeholder: "Greenhouse user ID for auditing" },
    ],
    docsUrl: "https://developers.greenhouse.io/harvest.html",
  },
  lever: {
    id: "lever",
    name: "Lever",
    description: "Sync candidates and opportunities with Lever ATS.",
    category: "ATS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Lever API key" },
    ],
    docsUrl: "https://hire.lever.co/developer/documentation",
  },
  workday: {
    id: "workday",
    name: "Workday",
    description: "Sync hire data and employee profiles with your HRIS.",
    category: "HRIS",
    credentialFields: [
      { key: "tenantName", label: "Tenant Name", type: "text", required: true, placeholder: "e.g. mycompany_preview1" },
      { key: "username", label: "Integration System Username", type: "text", required: true, placeholder: "ISU username" },
      { key: "password", label: "Integration System Password", type: "password", required: true, placeholder: "ISU password" },
    ],
    docsUrl: "https://developer.workday.com/",
  },
  bamboohr: {
    id: "bamboohr",
    name: "BambooHR",
    description: "Employee records, PTO, and onboarding sync.",
    category: "HRIS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "BambooHR API key" },
      { key: "subdomain", label: "Company Subdomain", type: "text", required: true, placeholder: "yourcompany" },
    ],
    docsUrl: "https://documentation.bamboohr.com/reference/",
  },
  zoho: {
    id: "zoho",
    name: "Zoho People",
    description: "HR module sync for employee lifecycle management.",
    category: "HRIS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Zoho OAuth client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Zoho OAuth client secret" },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true, placeholder: "Zoho OAuth refresh token" },
    ],
    docsUrl: "https://www.zoho.com/people/api/overview.html",
  },
  darwinbox: {
    id: "darwinbox",
    name: "Darwinbox",
    description: "South-East Asia HRIS — sync employee and offer data.",
    category: "HRIS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Darwinbox API key" },
      { key: "subdomain", label: "Domain", type: "url", required: true, placeholder: "https://yourcompany.darwinbox.in" },
    ],
    docsUrl: "https://darwinbox.com/developers",
  },
  googlecalendar: {
    id: "googlecalendar",
    name: "Google Calendar",
    description: "Sync interview schedules and check interviewer availability.",
    category: "Calendar",
    credentialFields: [
      { key: "serviceAccountJson", label: "Service Account JSON", type: "password", required: true, placeholder: "Paste the full service account JSON" },
      { key: "calendarId", label: "Calendar ID", type: "text", required: false, placeholder: "primary (leave blank for primary)" },
    ],
    docsUrl: "https://developers.google.com/calendar/api/guides/overview",
  },
  outlook: {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Microsoft 365 calendar sync for interview scheduling.",
    category: "Calendar",
    credentialFields: [
      { key: "clientId", label: "App Client ID", type: "text", required: true, placeholder: "Azure app registration client ID" },
      { key: "clientSecret", label: "App Client Secret", type: "password", required: true, placeholder: "Azure app registration client secret" },
      { key: "tenantId", label: "Azure Tenant ID", type: "text", required: true, placeholder: "Azure directory tenant ID" },
    ],
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/resources/calendar",
  },
  slack: {
    id: "slack",
    name: "Slack",
    description: "Get notified of new matches and interview approvals.",
    category: "Communication",
    credentialFields: [
      { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "xoxb-..." },
      { key: "defaultChannel", label: "Default Channel", type: "text", required: false, placeholder: "#recruiting (optional)" },
    ],
    docsUrl: "https://api.slack.com/start",
  },
  teams: {
    id: "teams",
    name: "Microsoft Teams",
    description: "Send hiring notifications and interview reminders to Teams.",
    category: "Communication",
    credentialFields: [
      { key: "webhookUrl", label: "Incoming Webhook URL", type: "url", required: true, placeholder: "https://xxx.webhook.office.com/..." },
    ],
    docsUrl: "https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/",
  },
  resend: {
    id: "resend",
    name: "Resend",
    description: "Transactional email delivery for candidate communications.",
    category: "Communication",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "re_..." },
      { key: "fromAddress", label: "From Address", type: "text", required: true, placeholder: "hiring@yourcompany.com" },
    ],
    docsUrl: "https://resend.com/docs",
  },
  twilio: {
    id: "twilio",
    name: "Twilio",
    description: "SMS and WhatsApp notifications for interview reminders.",
    category: "Communication",
    credentialFields: [
      { key: "accountSid", label: "Account SID", type: "text", required: true, placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "authToken", label: "Auth Token", type: "password", required: true, placeholder: "Twilio auth token" },
      { key: "fromNumber", label: "From Number", type: "text", required: true, placeholder: "+1234567890" },
    ],
    docsUrl: "https://www.twilio.com/docs",
  },
  hackerrank: {
    id: "hackerrank",
    name: "HackerRank",
    description: "Automated coding assessments for engineering candidates.",
    category: "Assessment",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "HackerRank API key" },
    ],
    docsUrl: "https://www.hackerrank.com/work/support/api",
  },
  codility: {
    id: "codility",
    name: "Codility",
    description: "Technical screening and live coding interview platform.",
    category: "Assessment",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Codility API key" },
    ],
    docsUrl: "https://codility.com/api-docs/",
  },
};

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_REGISTRY[id];
}

export function getAllIntegrations(): IntegrationDefinition[] {
  return Object.values(INTEGRATION_REGISTRY);
}

import { ActionHandler } from "../workflowEngine";

export const sendEmailAction: ActionHandler = async (payload, config, tenantId) => {
  const to = (config.to as string) || (payload.candidateEmail as string);
  const subject = (config.subject as string) || "Notification";
  const body = (config.body as string) || "";

  if (!to) {
    console.warn("[sendEmailAction] No recipient — skipping");
    return;
  }

  // Import email service lazily to avoid circular deps
  const { EmailService } = await import("../../emailService").catch(() => ({ EmailService: null }));
  if (EmailService) {
    await EmailService.send({ to, subject, body, tenantId });
  } else {
    console.log(`[sendEmailAction] Would send email to ${to}: "${subject}"`);
  }
};

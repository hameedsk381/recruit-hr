import { ActionHandler } from "../workflowEngine";
import { getMongoDb } from "../../../utils/mongoClient";

export const triggerBgvAction: ActionHandler = async (payload, config, tenantId) => {
  const candidateId = (payload.candidateId || config.candidateId) as string;
  const provider = (config.provider as string) || "authbridge";

  if (!candidateId) {
    console.warn("[triggerBgvAction] Missing candidateId — skipping");
    return;
  }

  const db = getMongoDb();
  await db.collection("bgv_requests").insertOne({
    tenantId,
    candidateId,
    provider,
    status: "initiated",
    initiatedAt: new Date(),
    source: "workflow",
  });
  console.log(`[triggerBgvAction] BGV initiated for candidate ${candidateId} via ${provider}`);
};

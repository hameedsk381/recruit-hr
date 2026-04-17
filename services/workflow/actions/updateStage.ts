import { ActionHandler } from "../workflowEngine";
import { getMongoDb } from "../../../utils/mongoClient";
import { ObjectId } from "mongodb";

export const updateStageAction: ActionHandler = async (payload, config, tenantId) => {
  const candidateId = (payload.candidateId || config.candidateId) as string;
  const newStage = config.stage as string;

  if (!candidateId || !newStage) {
    console.warn("[updateStageAction] Missing candidateId or stage — skipping");
    return;
  }

  const db = getMongoDb();
  await db.collection("candidates").updateOne(
    { _id: new ObjectId(candidateId), tenantId },
    { $set: { stage: newStage, stageUpdatedAt: new Date() } }
  );
  console.log(`[updateStageAction] Candidate ${candidateId} moved to stage: ${newStage}`);
};

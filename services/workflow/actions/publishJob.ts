import { ActionHandler } from "../workflowEngine";
import { getMongoDb } from "../../../utils/mongoClient";
import { ObjectId } from "mongodb";

export const publishJobAction: ActionHandler = async (payload, config, tenantId) => {
  const requisitionId = (payload.requisitionId || config.requisitionId) as string;
  const boards = (config.boards as string[]) || ["linkedin"];

  if (!requisitionId) {
    console.warn("[publishJobAction] Missing requisitionId — skipping");
    return;
  }

  const db = getMongoDb();
  await db.collection("requisitions").updateOne(
    { _id: new ObjectId(requisitionId), tenantId },
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        publishedBoards: boards,
      },
    }
  );
  console.log(`[publishJobAction] Requisition ${requisitionId} published to: ${boards.join(", ")}`);
};

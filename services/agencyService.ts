
import { getMongoDb } from "../utils/mongoClient";

export interface Tenant {
    tenantId: string;
    name: string;
    parentId?: string; // If set, this tenant is managed by an agency
    isAgency: boolean; // If true, this tenant can manage other tenants
    createdAt: Date;
}

export class AgencyService {
    static async listClients(agencyTenantId: string) {
        const db = getMongoDb();
        return await db.collection('tenants').find({ parentId: agencyTenantId }).toArray();
    }

    static async addClient(agencyTenantId: string, clientTenantId: string) {
        const db = getMongoDb();
        // 1. Verify agencyTenantId is an agency
        const agency = await db.collection('tenants').findOne({ tenantId: agencyTenantId, isAgency: true });
        if (!agency) throw new Error("Invalid Agency Tenant");

        // 2. Associate client
        await db.collection('tenants').updateOne(
            { tenantId: clientTenantId },
            { $set: { parentId: agencyTenantId } },
            { upsert: true }
        );
    }

    static async isAgencyUserManagingClient(agencyTenantId: string, clientTenantId: string): Promise<boolean> {
        const db = getMongoDb();
        const client = await db.collection('tenants').findOne({ tenantId: clientTenantId, parentId: agencyTenantId });
        return !!client;
    }
}

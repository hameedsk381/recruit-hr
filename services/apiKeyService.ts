
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getCollection } from '../utils/mongoClient';

export interface APIKey {
    _id?: ObjectId;
    tenantId: string;
    name: string;
    keyHash: string;
    prefix: string;
    scopes: string[];
    rateLimit: number;
    lastUsedAt?: Date;
    expiresAt?: Date;
    createdBy: string;
    createdAt: Date;
}

export class APIKeyService {
    private static COLLECTION = 'api_keys';

    static async generateKey(tenantId: string, name: string, createdBy: string, scopes: string[] = ['all']): Promise<{ id: string; key: string }> {
        const key = `rk_live_${crypto.randomBytes(24).toString('hex')}`;
        const prefix = key.substring(0, 12); // rk_live_abcd
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');

        const apiKey: APIKey = {
            tenantId,
            name,
            keyHash,
            prefix,
            scopes,
            rateLimit: 100, // default rpm
            createdBy,
            createdAt: new Date()
        };

        const result = await getCollection(this.COLLECTION).insertOne(apiKey);
        return {
            id: result.insertedId.toString(),
            key
        };
    }

    static async listKeys(tenantId: string): Promise<Omit<APIKey, 'keyHash'>[]> {
        return await getCollection(this.COLLECTION)
            .find({ tenantId })
            .project({ keyHash: 0 })
            .toArray() as any;
    }

    static async revokeKey(tenantId: string, keyId: string): Promise<boolean> {
        const result = await getCollection(this.COLLECTION).deleteOne({
            _id: new ObjectId(keyId),
            tenantId
        });
        return result.deletedCount > 0;
    }

    static async validateKey(key: string): Promise<{ valid: boolean; tenantId?: string; scopes?: string[] }> {
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');
        const apiKey = await getCollection(this.COLLECTION).findOne({ keyHash });

        if (!apiKey) return { valid: false };

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { valid: false };
        }

        // Update last used
        await getCollection(this.COLLECTION).updateOne(
            { _id: apiKey._id },
            { $set: { lastUsedAt: new Date() } }
        );

        return {
            valid: true,
            tenantId: apiKey.tenantId,
            scopes: apiKey.scopes
        };
    }
}

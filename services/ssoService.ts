import { getMongoDb } from '../utils/mongoClient';

export interface SsoConfig {
  tenantId: string;
  provider: 'okta' | 'azure' | 'google' | 'custom';
  entryPoint: string;
  issuer: string;
  cert: string;
}

export class SsoService {
  
  static async getTenantConfig(tenantId: string): Promise<SsoConfig | null> {
    const db = getMongoDb();
    return db.collection('sso_configs').findOne({ tenantId }) as Promise<SsoConfig | null>;
  }

  static async verifyAssertion(tenantId: string, assertion: string) {
    // In a real implementation, we would use passport-saml or similar to verify the XML signature
    // using the certificate stored in SsoConfig.
    
    // Simulation:
    if (assertion.includes('MALICIOUS')) throw new Error('Invalid signature');
    
    // Extract base64 encoded user info (simulated)
    try {
        const decoded = JSON.parse(Buffer.from(assertion, 'base64').toString());
        return {
            email: decoded.email,
            name: decoded.displayName,
            externalId: decoded.sub
        };
    } catch {
        // Fallback for demo mock
        if (assertion === 'valid_enterprise_user') {
            return {
                email: 'enterprise-user@company.com',
                name: 'Enterprise User',
                externalId: 'ext_123'
            };
        }
        throw new Error('Malformed assertion');
    }
  }

  static async provisionUser(tenantId: string, userData: any) {
    const db = getMongoDb();
    const users = db.collection('users');
    
    let user = await users.findOne({ email: userData.email, tenantId });
    
    if (!user) {
        const newUser = {
            ...userData,
            tenantId,
            roles: ['recruiter'],
            ssoFederated: true,
            createdAt: new Date()
        };
        const res = await users.insertOne(newUser);
        user = { _id: res.insertedId, ...newUser };
    }
    
    return user;
  }
}

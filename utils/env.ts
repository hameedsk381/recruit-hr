const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function isProduction(): boolean {
  return IS_PRODUCTION;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateProductionEnv(): void {
  if (!IS_PRODUCTION) return;

  getRequiredEnv('JWT_SECRET');
  getRequiredEnv('MONGODB_URL');
  getRequiredEnv('MONGODB_DB_NAME');
  getRequiredEnv('REDIS_URL');
}

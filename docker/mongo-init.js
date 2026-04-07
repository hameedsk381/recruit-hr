// MongoDB initialization script
// Creates the skillmatrix database and user

db = db.getSiblingDB('skillmatrix');

// Create application user
db.createUser({
    user: 'skillmatrix_user',
    pwd: 'skillmatrix_pass',
    roles: [
        { role: 'readWrite', db: 'skillmatrix' }
    ]
});

// Create collections with indexes
db.createCollection('candidates');
db.createCollection('jobs');
db.createCollection('assessments');
db.createCollection('cache');

// Index for assessments
db.assessments.createIndex({ "candidate_id": 1 });
db.assessments.createIndex({ "job_id": 1 });
db.assessments.createIndex({ "created_at": -1 });

// Index for cache with TTL (auto-expire after 24 hours)
db.cache.createIndex({ "created_at": 1 }, { expireAfterSeconds: 86400 });
db.cache.createIndex({ "key": 1 }, { unique: true });

// Index for jobs
db.jobs.createIndex({ "title": "text", "company": "text" });
db.jobs.createIndex({ "created_at": -1 });

// Index for candidates
db.candidates.createIndex({ "name": "text", "email": 1 });
db.candidates.createIndex({ "created_at": -1 });

print('MongoDB initialization complete!');

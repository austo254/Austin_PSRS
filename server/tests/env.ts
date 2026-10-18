// Runs before each test file: point the app at the isolated test database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://psrs:psrs_dev_password@localhost:5433/psrs_test';
process.env.CLIENT_URL = 'http://localhost:5173';

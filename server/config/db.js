const { Sequelize } = require('sequelize');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URI;

if (!connectionString) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL is not defined in environment variables.');
  console.error('If you are deploying to Render/Supabase, please add DATABASE_URL or POSTGRES_URI to your environment.');
  process.exit(1);
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected via Sequelize');

    // In production, you might not want force: true or alter: true
    // But for development/migration:
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('PostgreSQL connection error details:');
    console.error(error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

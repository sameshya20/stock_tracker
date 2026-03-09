const { Sequelize } = require('sequelize');

const sequelize = (process.env.DATABASE_URL || process.env.POSTGRES_URI)
  ? new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URI, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.NODE_ENV === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  })
  : new Sequelize(
    process.env.PG_DATABASE || 'stock_tracker',
    process.env.PG_USER || 'postgres',
    process.env.PG_PASSWORD || 'password',
    {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      dialect: 'postgres',
      logging: false, // Set to true to see SQL queries
      dialectOptions: process.env.NODE_ENV === 'production' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false // Often needed for Supabase/Neon unless you bundle certificates
        }
      } : {},
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

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

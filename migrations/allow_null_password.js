const { dbQuery } = require('../config/db');
const logger = require('../config/logger');

const allowNullPassword = async () => {
    try {
        console.log('Starting migration: Allowing NULL password for passwordless users...');

        // Drop NOT NULL constraint
        await dbQuery(`
            ALTER TABLE users 
            ALTER COLUMN password DROP NOT NULL;
        `);
        console.log('✓ Removed NOT NULL constraint from password column');

        // Update existing passwordless users if any
        await dbQuery(`
            UPDATE users 
            SET has_password = false 
            WHERE password IS NULL;
        `);
        console.log('✓ Updated records');

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        logger.error('Migration error:', error);
        process.exit(1);
    }
};

// Run directly
if (require.main === module) {
    allowNullPassword()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { allowNullPassword };
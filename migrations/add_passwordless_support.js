const { dbQuery } = require('../config/db');
const logger = require('../config/logger');

const addPasswordlessSupport = async () => {
    try {
        console.log('Starting migration: Adding passwordless support...');

        // Add provider column
        await dbQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'password';
        `);
        console.log('✓ Added provider column');

        // Add has_password column
        await dbQuery(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;
        `);
        console.log('✓ Added has_password column');

        // Update existing users to have proper values
        await dbQuery(`
            UPDATE users 
            SET 
                provider = 'password',
                has_password = true
            WHERE provider IS NULL 
               OR has_password IS NULL;
        `);
        console.log('✓ Updated existing users');

        // Add index for better performance
        await dbQuery(`
            CREATE INDEX IF NOT EXISTS idx_users_provider 
            ON users(provider);
        `);
        console.log('✓ Added index on provider');

        console.log('\n✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        logger.error('Migration error:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    addPasswordlessSupport()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { addPasswordlessSupport };
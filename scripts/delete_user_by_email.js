
const { dbQuery } = require('../config/db');
const logger = require('../config/logger');

const emailsToDelete = [
    "adisaolawale10@gmail.com",
    // Add more emails here
];

const deleteUsersByEmail = async (emails) => {
    if (!emails || emails.length === 0) {
        console.log("❌ No emails provided");
        return;
    }

    try {
        console.log(`Starting deletion of ${emails.length} user(s)...\n`);

        for (const email of emails) {
            // First, find the user
            const findQuery = `SELECT id, username, email FROM users WHERE email = $1`;
            const findResult = await dbQuery(findQuery, [email]);

            if (findResult.rows.length === 0) {
                console.log(`⚠️  User not found: ${email}`);
                continue;
            }

            const user = findResult.rows[0];

            // Delete the user (cascading should handle related tables)
            const deleteQuery = `DELETE FROM users WHERE email = $1`;
            await dbQuery(deleteQuery, [email]);

            console.log(`✅ Deleted user: ${user.email} (ID: ${user.id}, Username: ${user.username})`);
        }

        console.log('\n🎉 Deletion process completed!');

    } catch (error) {
        console.error('❌ Error during deletion:', error.message);
        logger.error('Delete users script error:', error);
    }
};

// Run the script
if (require.main === module) {
    deleteUsersByEmail(emailsToDelete)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { deleteUsersByEmail };
const {pool, dbQuery} =  require("../config/db.js");
const { generateUniqueUsernamesFromName } =  require("./generateUniqueUsername.js");

function generateFallbackUsername() {
    const timestamp = Date.now().toString().slice(-6);
    return `user_${timestamp}`;
}

async function resolveUsername(fullName) {
    const usernames = await generateUniqueUsernamesFromName(fullName, 10);

    if (usernames && usernames.length > 0) {
        return usernames[0];
    }

    let username = generateFallbackUsername();

    let exists = await dbQuery(
        'SELECT 1 FROM "users" WHERE username = $1 LIMIT 1',
        [username]
    );

    while (exists.rowCount > 0) {
        username = generateFallbackUsername();
        exists = await dbQuery(
            'SELECT 1 FROM "users" WHERE username = $1 LIMIT 1',
            [username]
        );
    }

    return username;
}

module.exports = { resolveUsername };
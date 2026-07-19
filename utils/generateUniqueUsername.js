const {pool, dbQuery}  = require("../config/db.js");
const { randomBytes } = require("crypto");


const generateUniqueUsernamesFromName = async (name, limit = 10) => {
    const cleanedName = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
    
    if (!cleanedName) {
        return [Array.from(randomBytes(4)).map(b => "abcdefghijklmnopqrstuvwxyz"[b % 26]).join("")];
    }

    const parts = cleanedName.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

    const randomNumShort = Math.floor(10 + Math.random() * 90);
    const randomNumLong = Math.floor(100 + Math.random() * 900);
    const randomHex = Array.from(randomBytes(2)).map(b => "0123456789"[b % 10]).join("");

    const candidatesSet = new Set();

    if (lastName) {
        candidatesSet.add(`${firstName}${lastName}`);
        candidatesSet.add(`${firstName}_${lastName}`);
        candidatesSet.add(`${firstName}.${lastName}`);
        candidatesSet.add(`${lastName}${firstName}`);
        candidatesSet.add(`${lastName}_${firstName}`);
        candidatesSet.add(`${firstName.charAt(0)}${lastName}`);
        candidatesSet.add(`${firstName.charAt(0)}_${lastName}`);
        candidatesSet.add(`${firstName}${lastName.charAt(0)}`);
        candidatesSet.add(`${firstName}_${lastName.charAt(0)}`);
        candidatesSet.add(`${firstName}.${lastName}${randomNumShort}`);
        candidatesSet.add(`${firstName}_${lastName}_${randomHex}`);
        candidatesSet.add(`${firstName.charAt(0)}.${lastName}${randomNumLong}`);
    } else {
        candidatesSet.add(`${firstName}`);
        candidatesSet.add(`${firstName}_${randomNumShort}`);
        candidatesSet.add(`${firstName}.${randomNumLong}`);
        candidatesSet.add(`${firstName}${randomHex}`);
        candidatesSet.add(`iam_${firstName}`);
        candidatesSet.add(`${firstName}_the_great`);
        candidatesSet.add(`the_${firstName}`);
        candidatesSet.add(`${firstName}_official`);
        candidatesSet.add(`${firstName}.${randomHex}`);
    }

    const candidates = Array.from(candidatesSet);

    if (candidates.length === 0) return [];

    // Batch check with raw SQL
    const placeholders = candidates.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
        SELECT username 
        FROM "users" 
        WHERE username = ANY(ARRAY[${placeholders}]) 
        AND "is_active" = true;
    `;

    const result = await dbQuery(query, candidates);
    const takenUsernames = new Set(result.rows.map(row => row.username));

    let availableUsernames = candidates.filter(username => !takenUsernames.has(username));

    // Safety net
    let attempt = 0;
    while (availableUsernames.length < limit && attempt < 20) {
        const base = lastName ? `${firstName}_${lastName}` : firstName;
        const fallback = `${base}${Math.floor(1000 + Math.random() * 9000)}`;

        const checkResult = await dbQuery(
            'SELECT COUNT(*) as count FROM "users" WHERE username = $1 AND "is_active" = true',
            [fallback]
        );

        const isTaken = parseInt(checkResult.rows[0].count) > 0;

        if (!isTaken && !availableUsernames.includes(fallback)) {
            availableUsernames.push(fallback);
        }
        attempt++;
    }

    return availableUsernames.slice(0, limit);
};

module.exports = { generateUniqueUsernamesFromName };
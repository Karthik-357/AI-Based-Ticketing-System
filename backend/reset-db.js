/**
 * reset-db.js
 * One-time database reset script.
 * Preserves the admin account (admin@gmail.com) and wipes everything else.
 *
 * Run with:  node backend/reset-db.js
 * From the /Main directory.
 */

import mongoose from "mongoose";
import readline from "readline";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const ADMIN_EMAIL = "admin@gmail.com";

// ─── Inline schemas (avoids importing full models with side effects) ──────────

const User           = mongoose.model("User",           new mongoose.Schema({}, { strict: false }));
const Department     = mongoose.model("Department",     new mongoose.Schema({}, { strict: false }));
const Skill          = mongoose.model("Skill",          new mongoose.Schema({}, { strict: false }));
const Ticket         = mongoose.model("Ticket",         new mongoose.Schema({}, { strict: false }));
const Comment        = mongoose.model("Comment",        new mongoose.Schema({}, { strict: false }));
const TicketActivity = mongoose.model("TicketActivity", new mongoose.Schema({}, { strict: false }));
const Incident       = mongoose.model("Incident",       new mongoose.Schema({}, { strict: false }));
const Counter        = mongoose.model("Counter",        new mongoose.Schema({}, { strict: false }));

// ─── Confirmation prompt ──────────────────────────────────────────────────────

function confirm(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.MONGO_URI) {
        console.error("ERROR: MONGO_URI not found in backend/.env");
        process.exit(1);
    }

    console.log("\n========================================");
    console.log("        DATABASE RESET SCRIPT");
    console.log("========================================");
    console.log(`\nAdmin account to PRESERVE : ${ADMIN_EMAIL}`);
    console.log("\nCollections that will be WIPED:");
    console.log("  • users            (all except admin@gmail.com)");
    console.log("  • departments      (all)");
    console.log("  • skills           (all)");
    console.log("  • tickets          (all)");
    console.log("  • comments         (all)");
    console.log("  • ticketactivities (all)");
    console.log("  • incidents        (all)");
    console.log("  • counters         (reset to 0 — TKT/INC restart from 001)");
    console.log("\n========================================");

    const answer = await confirm("\nType  YES  to confirm and proceed: ");

    if (answer !== "yes") {
        console.log("\nAborted. No changes were made.");
        process.exit(0);
    }

    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.\n");

    // 1. Verify admin account exists before touching anything
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
        console.error(`ERROR: Admin account "${ADMIN_EMAIL}" was NOT found in the database.`);
        console.error("Aborting — nothing was deleted.");
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log(`✓ Admin account found (id: ${admin._id})`);

    // 2. Delete all users except admin
    const usersResult = await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
    console.log(`✓ Deleted ${usersResult.deletedCount} user(s)  (admin preserved)`);

    // 3. Delete all departments
    const deptsResult = await Department.deleteMany({});
    console.log(`✓ Deleted ${deptsResult.deletedCount} department(s)`);

    // 4. Delete all skills
    const skillsResult = await Skill.deleteMany({});
    console.log(`✓ Deleted ${skillsResult.deletedCount} skill(s)`);

    // 5. Delete all tickets
    const ticketsResult = await Ticket.deleteMany({});
    console.log(`✓ Deleted ${ticketsResult.deletedCount} ticket(s)`);

    // 6. Delete all comments
    const commentsResult = await Comment.deleteMany({});
    console.log(`✓ Deleted ${commentsResult.deletedCount} comment(s)`);

    // 7. Delete all ticket activities
    const activitiesResult = await TicketActivity.deleteMany({});
    console.log(`✓ Deleted ${activitiesResult.deletedCount} ticket activit(ies)`);

    // 8. Delete all incidents
    const incidentsResult = await Incident.deleteMany({});
    console.log(`✓ Deleted ${incidentsResult.deletedCount} incident(s)`);

    // 9. Reset counters so TKT and INC start from 001 again
    await Counter.updateMany({}, { $set: { seq: 0 } });
    console.log(`✓ Counters reset  (next ticket → TKT-001, next incident → INC-001)`);

    // 10. Clear admin's department and skills references (they were wiped above)
    await User.updateOne(
        { email: ADMIN_EMAIL },
        { $set: { department: null, skills: [] } }
    );
    console.log(`✓ Cleared admin's department and skills references`);

    console.log("\n========================================");
    console.log("  Reset complete. Database is clean.");
    console.log(`  Admin login: ${ADMIN_EMAIL} (password unchanged)`);
    console.log("========================================\n");

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("\nUnexpected error:", err.message);
    mongoose.disconnect();
    process.exit(1);
});

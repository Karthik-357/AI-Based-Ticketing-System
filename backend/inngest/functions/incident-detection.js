import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import Incident from "../../models/incident.js";
import User from "../../models/user.js";
import Department from "../../models/department.js";
import TicketActivity from "../../models/ticketActivity.js";
import { getNextSequence } from "../../models/counter.js";
import { clusterTickets } from "../../utils/ai.js";

export const incidentDetection = inngest.createFunction(
    {
        id: "incident-detection-cron",
        retries: 1,
        concurrency: {
            limit: 1,
            key: "incident-detection-singleton",
        },
    },
    { cron: "*/15 * * * *" },
    async ({ step }) => {
        try {
            // Fetch tickets from the last 30 minutes that aren't linked to an incident
            // and are still active (not DONE/CLOSED)
            const recentTickets = await step.run("fetch-recent-tickets", async () => {
                const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
                const tickets = await Ticket.find({
                    createdAt: { $gte: thirtyMinAgo },
                    $or: [{ incident: null }, { incident: { $exists: false } }],
                    status: { $in: ["TODO", "IN_PROGRESS"] },
                }).populate('department', 'name');
                return tickets;
            });

            // Skip if fewer than 3 unlinked tickets — no point calling AI
            if (!recentTickets || recentTickets.length < 3) {
                console.log(`[Incident Detection] Only ${recentTickets?.length || 0} unlinked tickets in last 30 min. Skipping.`);
                return { success: true, skipped: true, reason: "insufficient_tickets" };
            }

            console.log(`[Incident Detection] Found ${recentTickets.length} unlinked tickets. Running AI clustering...`);

            // Prepare tickets with department names for AI
            const ticketsForAI = recentTickets.map(t => ({
                _id: t._id.toString(),
                title: t.title,
                description: t.description,
                departmentName: t.department?.name || 'Unknown',
            }));

            // AI clustering call — NOT in step.run because @inngest/agent-kit
            // uses Inngest steps internally (wrapping would cause NESTING_STEPS error)
            const clusterResult = await clusterTickets(ticketsForAI);

            if (!clusterResult || !clusterResult.clusters || clusterResult.clusters.length === 0) {
                console.log("[Incident Detection] No clusters identified by AI.");
                return { success: true, clusters: 0 };
            }

            // Process each valid cluster as individual steps for retry safety
            const createdIncidents = [];

            for (let i = 0; i < clusterResult.clusters.length; i++) {
                const cluster = clusterResult.clusters[i];
                const stepKey = `create-incident-${i}-${cluster.title.substring(0, 20).replace(/\s+/g, '-')}`;

                const result = await step.run(stepKey, async () => {
                    // Validate cluster has at least 3 tickets
                    if (!cluster.ticketIds || cluster.ticketIds.length < 3) {
                        console.log(`[Incident Detection] Skipping cluster "${cluster.title}" — only ${cluster.ticketIds?.length || 0} tickets.`);
                        return null;
                    }

                    // Fetch the actual ticket documents for this cluster
                    const clusterTicketDocs = await Ticket.find({
                        _id: { $in: cluster.ticketIds },
                        $or: [{ incident: null }, { incident: { $exists: false } }],
                    }).populate('createdBy', 'email');

                    if (clusterTicketDocs.length < 3) {
                        console.log(`[Incident Detection] After validation, cluster "${cluster.title}" has fewer than 3 unlinked tickets. Skipping.`);
                        return null;
                    }

                    // Determine majority department
                    const deptCounts = {};
                    for (const t of clusterTicketDocs) {
                        const deptId = t.department?.toString();
                        if (deptId) {
                            deptCounts[deptId] = (deptCounts[deptId] || 0) + 1;
                        }
                    }

                    let majorityDeptId = null;
                    let maxCount = 0;
                    for (const [deptId, count] of Object.entries(deptCounts)) {
                        if (count > maxCount) {
                            maxCount = count;
                            majorityDeptId = deptId;
                        }
                    }

                    if (!majorityDeptId) {
                        console.log(`[Incident Detection] Could not determine majority department for cluster "${cluster.title}". Skipping.`);
                        return null;
                    }

                    // Find the department's manager (incident lead)
                    const department = await Department.findById(majorityDeptId);
                    if (!department || !department.managerId) {
                        console.log(`[Incident Detection] Department ${majorityDeptId} has no manager. Skipping cluster.`);
                        return null;
                    }

                    const incidentLead = await User.findById(department.managerId);
                    if (!incidentLead) {
                        console.log(`[Incident Detection] Manager not found for department. Skipping cluster.`);
                        return null;
                    }

                    // Create the incident with auto-incrementing number
                    const incidentNumber = await getNextSequence("incidentNumber");
                    const incident = await Incident.create({
                        incidentNumber,
                        title: cluster.title,
                        description: cluster.description,
                        status: "investigating",
                        department: majorityDeptId,
                        incidentLead: incidentLead._id,
                        tickets: clusterTicketDocs.map(t => t._id),
                    });

                    // Link all clustered tickets to the incident
                    const ticketIds = clusterTicketDocs.map(t => t._id);
                    await Ticket.updateMany(
                        { _id: { $in: ticketIds } },
                        { incident: incident._id }
                    );

                    // Create activity records for each linked ticket
                    const activityDocs = clusterTicketDocs.map(t => ({
                        ticketId: t._id,
                        performedBy: incidentLead._id,
                        action: 'INCIDENT_LINKED',
                        newValue: `INC-${String(incidentNumber).padStart(3, '0')}`,
                    }));
                    await TicketActivity.insertMany(activityDocs);

                    console.log(`[Incident Detection] Created INC-${String(incidentNumber).padStart(3, '0')}: "${cluster.title}" with ${clusterTicketDocs.length} tickets.`);

                    return {
                        incidentId: incident._id,
                        incidentNumber,
                        title: cluster.title,
                        ticketCount: clusterTicketDocs.length,
                    };
                });

                if (result) {
                    createdIncidents.push(result);
                }
            }

            return { success: true, incidents: createdIncidents };
        } catch (err) {
            console.error("[Incident Detection] Error:", err.message);
            return { success: false, error: err.message };
        }
    }
);

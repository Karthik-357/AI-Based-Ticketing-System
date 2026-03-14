import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import Skill from "../../models/skill.js";
import TicketActivity from "../../models/ticketActivity.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
    { id: "on-ticket-created", retries: 1 },
    { event: "ticket/created" },
    async ({ event, step }) => {
        try {
            const { ticketId } = event.data

            const ticket = await step.run("fetch-ticket", async () => {
                const ticketObject = await Ticket.findById(ticketId);
                if (!ticketObject) {
                    throw new NonRetriableError("Ticket not found");
                }
                return ticketObject
            })

            await step.run("update-ticket-status", async () => {
                await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" })
            })

            // Collect available skills from the ticket's department for constrained AI output.
            let departmentSkills = [];
            try {
                const deptEmployees = await User.find({
                    role: "employee",
                    department: ticket.department
                }).populate('skills', 'name');
                departmentSkills = [...new Set(
                    deptEmployees.flatMap(emp => (emp.skills || []).map(s => s.name))
                )];
                console.log(`[Assignment] Department available skills: ${JSON.stringify(departmentSkills)}`);
            } catch (error) {
                console.error("Failed to fetch department skills:", error.message);
            }

            // AI gives summary, notes, and suggested related skills.
            let aiResponse = null;
            try {
                const existingTicket = await Ticket.findById(ticket._id);
                if (!existingTicket.relatedSkills || existingTicket.relatedSkills.length === 0) {
                    aiResponse = await analyzeTicket(ticket, departmentSkills);
                }
            } catch (error) {
                console.error("AI analysis failed:", error.message);
            }

            const relatedSkillIds = await step.run("save-ai-results", async () => {
                let skillIds = []
                if (aiResponse) {
                    const skillDocs = await Skill.find({
                        name: { $in: aiResponse.relatedSkills || [] }
                    });
                    skillIds = skillDocs.map(s => s._id);

                    await Ticket.findByIdAndUpdate(ticket._id, {
                        helpfulNotes: aiResponse.helpfulNotes,
                        status: "IN_PROGRESS",
                        relatedSkills: skillIds
                    })
                } else {
                    // Fallback: keep workflow moving even if AI fails.
                    await Ticket.findByIdAndUpdate(ticket._id, {
                        status: "IN_PROGRESS"
                    })
                }
                return skillIds
            })

            const moderator = await step.run("assign-moderator", async () => {
                // Load-balancing: pick user with least active TODO/IN_PROGRESS tickets.
                const findBestCandidate = async (candidates) => {
                    let bestCandidates = [];
                    let minLoad = Infinity;

                    for (const candidate of candidates) {
                        const load = await Ticket.countDocuments({
                            assignedTo: candidate._id,
                            status: { $in: ["TODO", "IN_PROGRESS"] }
                        });
                        console.log(`[Assignment]   - ${candidate.email}: ${load} active tickets`);

                        if (load < minLoad) {
                            minLoad = load;
                            bestCandidates = [candidate];
                        } else if (load === minLoad) {
                            bestCandidates.push(candidate);
                        }
                    }
                    return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
                };

                let candidates = [];
                let selectedUser = null;

                // Tier 1: same department + matching skills.
                if (relatedSkillIds.length > 0) {
                    console.log(`[Assignment] Tier 1: Matching skills by ObjectId in department`);
                    candidates = await User.find({
                        role: "employee",
                        department: ticket.department,
                        skills: { $in: relatedSkillIds }
                    });
                    console.log(`[Assignment] Tier 1 candidates: ${candidates.map(c => c.email).join(", ") || "none"}`);

                    if (candidates.length > 0) {
                        selectedUser = await findBestCandidate(candidates);
                    }
                } else {
                    console.log(`[Assignment] No related skills returned. Skipping Tier 1.`);
                }

                // Tier 2 fallback: any employee from same department.
                if (!selectedUser) {
                    console.log(`[Assignment] Tier 2: Any employee in department`);
                    candidates = await User.find({
                        role: "employee",
                        department: ticket.department
                    });
                    console.log(`[Assignment] Tier 2 candidates: ${candidates.map(c => c.email).join(", ") || "none"}`);
                    if (candidates.length > 0) {
                        selectedUser = await findBestCandidate(candidates);
                    }
                }

                // Tier 3 fallback: assign to admin.
                if (!selectedUser) {
                    console.log(`No staff found in department. Escalating to Admin.`)
                    candidates = await User.find({ role: "admin" });
                    if (candidates.length > 0) {
                        selectedUser = await findBestCandidate(candidates);
                    }
                }

                // Final fallback: leave unassigned if nobody is available.
                if (!selectedUser) {
                    await Ticket.findByIdAndUpdate(ticket._id, { assignedTo: null });
                    return null;
                }

                console.log(`[Assignment] ✔ Assigned to: ${selectedUser.email}`);
                await Ticket.findByIdAndUpdate(ticket._id, {
                    assignedTo: selectedUser._id
                });

                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: selectedUser._id,
                    action: 'ASSIGNED',
                    newValue: selectedUser.email
                });

                return selectedUser;
            });
            await step.run("send-email-notification", async () => {
                if (moderator) {
                    const finalTicket = await Ticket.findById(ticket._id)
                    await sendMail(
                        moderator.email,
                        "Ticket Assigned",
                        `A new ticket is assigned to you ${finalTicket.title}`
                    )
                }
            })

            return { success: true }

        } catch (err) {
            console.error("Error running the step", err.message)
            return { success: false }
        }

    }
);
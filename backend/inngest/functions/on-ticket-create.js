import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import Skill from "../../models/skill.js";
import Incident from "../../models/incident.js";
import TicketActivity from "../../models/ticketActivity.js";
import { NonRetriableError } from "inngest";
import analyzeTicket, { analyzeTicketWithIncidentCheck } from "../../utils/ai.js";

// Calculate priority based on impact and urgency matrix
const calculatePriority = (impact, urgency) => {
    const matrix = {
        '1-1': 'low',    '1-2': 'low',    '1-3': 'medium',
        '2-1': 'low',    '2-2': 'medium', '2-3': 'high',
        '3-1': 'medium', '3-2': 'high',   '3-3': 'critical'
    }
    return matrix[`${impact}-${urgency}`] || 'medium'
}

export const onTicketCreated = inngest.createFunction(
    { id: "on-ticket-created", retries: 1 },
    { event: "ticket/created" },
    async ({ event, step }) => {
        try {
            const { ticketId, isManualAssignment } = event.data

            const ticket = await step.run("fetch-ticket", async () => {
                const ticketObject = await Ticket.findById(ticketId);
                if (!ticketObject) {
                    throw new NonRetriableError("Ticket not found");
                }
                return ticketObject
            })



            // AI analysis — NOT wrapped in step.run because @inngest/agent-kit
            // uses Inngest steps internally (wrapping would cause NESTING_STEPS error)
            let aiResponse = null;

            // Collect available skills from the ticket's department
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

            // Fetch active incidents for combined AI analysis
            let activeIncidents = [];
            try {
                activeIncidents = await Incident.find({
                    status: { $in: ["investigating", "identified", "monitoring"] }
                }).select('_id title description');
            } catch (error) {
                console.error("Failed to fetch active incidents:", error.message);
            }

            // Check if ticket already has AI results (e.g. from a previous partial run)
            const existingTicket = await Ticket.findById(ticket._id);
            if (!existingTicket.relatedSkills || existingTicket.relatedSkills.length === 0) {
                try {
                    if (activeIncidents.length > 0) {
                        aiResponse = await analyzeTicketWithIncidentCheck(ticket, departmentSkills, activeIncidents);
                    } else {
                        aiResponse = await analyzeTicket(ticket, departmentSkills);
                    }
                } catch (error) {
                    console.error("AI analysis failed:", error.message);
                }
            }

            // Check if AI matched this ticket to an active incident
            const matchedIncident = await step.run("check-incident-match", async () => {
                if (!aiResponse || !aiResponse.matchedIncidentId) return null;

                const incident = await Incident.findOne({
                    _id: aiResponse.matchedIncidentId,
                    status: { $in: ["investigating", "identified", "monitoring"] }
                });

                if (!incident) return null;

                // Save related skills if available
                let skillIds = [];
                if (aiResponse.relatedSkills && aiResponse.relatedSkills.length > 0) {
                    const skillDocs = await Skill.find({
                        name: { $in: aiResponse.relatedSkills }
                    });
                    if (skillDocs.length > 0) {
                        skillIds = skillDocs.map(s => s._id);
                    }
                }

                // Check if ticket needs priority from AI
                const currentTicket = await Ticket.findById(ticket._id);
                const updateData = {
                    incident: incident._id,
                    helpfulNotes: aiResponse.helpfulNotes,
                    status: "IN_PROGRESS",
                    ...(skillIds.length > 0 ? { relatedSkills: skillIds } : {}),
                };

                // Set AI-suggested ticketType if not already set
                if (!currentTicket.ticketType && aiResponse.suggestedTicketType) {
                    const validTypes = ["service_request", "problem", "change_request", "access_request", "query", "bug"];
                    if (validTypes.includes(aiResponse.suggestedTicketType)) {
                        updateData.ticketType = aiResponse.suggestedTicketType;
                    }
                }

                // Set AI-suggested impact if not already set
                if (!currentTicket.impact && aiResponse.suggestedImpact) {
                    const impactNum = Number(aiResponse.suggestedImpact);
                    if ([1, 2, 3].includes(impactNum)) {
                        updateData.impact = impactNum;
                    }
                }

                // Set AI-suggested urgency if not already set
                if (!currentTicket.urgency && aiResponse.suggestedUrgency) {
                    const urgencyNum = Number(aiResponse.suggestedUrgency);
                    if ([1, 2, 3].includes(urgencyNum)) {
                        updateData.urgency = urgencyNum;
                    }
                }

                // Calculate priority from impact/urgency if ticket doesn't have one
                if (!currentTicket.priority) {
                    const finalImpact = updateData.impact || currentTicket.impact;
                    const finalUrgency = updateData.urgency || currentTicket.urgency;
                    if (finalImpact && finalUrgency) {
                        updateData.priority = calculatePriority(finalImpact, finalUrgency);
                        console.log(`[AI] Calculated priority: ${updateData.priority} (impact: ${finalImpact}, urgency: ${finalUrgency})`);
                    }
                }

                // Link ticket to incident
                await Ticket.findByIdAndUpdate(ticket._id, updateData);

                // Add ticket to incident's tickets array
                await Incident.findByIdAndUpdate(incident._id, {
                    $addToSet: { tickets: ticket._id }
                });

                // Create activity record
                const incidentNumber = incident.incidentNumber;
                await TicketActivity.create({
                    ticketId: ticket._id,
                    performedBy: incident.incidentLead,
                    action: 'INCIDENT_LINKED',
                    newValue: `INC-${String(incidentNumber).padStart(3, '0')}`,
                });

                return incident;
            });

            // If ticket matched an incident, assign to an employee in that department and notify
            if (matchedIncident) {
                await step.run("assign-incident-ticket", async () => {
                    // Find the least-loaded employee in the incident's department
                    const candidates = await User.find({
                        role: "employee",
                        department: matchedIncident.department
                    });

                    let selectedUser = null;
                    if (candidates.length > 0) {
                        let minLoad = Infinity;
                        let bestCandidates = [];
                        for (const candidate of candidates) {
                            const load = await Ticket.countDocuments({
                                assignedTo: candidate._id,
                                status: { $in: ["TODO", "IN_PROGRESS"] }
                            });
                            if (load < minLoad) {
                                minLoad = load;
                                bestCandidates = [candidate];
                            } else if (load === minLoad) {
                                bestCandidates.push(candidate);
                            }
                        }
                        selectedUser = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
                    }

                    if (selectedUser) {
                        await Ticket.findByIdAndUpdate(ticket._id, {
                            assignedTo: selectedUser._id
                        });
                        await TicketActivity.create({
                            ticketId: ticket._id,
                            performedBy: selectedUser._id,
                            action: 'ASSIGNED',
                            newValue: selectedUser.email
                        });
                        console.log(`[Ticket Created] Incident-linked ticket assigned to: ${selectedUser.email}`);
                    }
                });

                console.log(`[Ticket Created] Ticket linked to incident INC-${String(matchedIncident.incidentNumber).padStart(3, '0')}.`);
                return { success: true, linkedToIncident: true };
            }

            // Handle manual assignment mode - skip auto-assignment but still save AI results
            if (isManualAssignment) {
                await step.run("save-ai-results-manual", async () => {
                    if (aiResponse) {
                        const skillNames = (aiResponse.relatedSkills || []).map(s => s.toLowerCase());
                        const skillDocs = await Skill.find({
                            $expr: {
                                $in: [{ $toLower: "$name" }, skillNames]
                            }
                        });
                        const skillIds = skillDocs.map(s => s._id);

                        const currentTicket = await Ticket.findById(ticket._id);
                        const updateData = {
                            helpfulNotes: aiResponse.helpfulNotes,
                            relatedSkills: skillIds
                        };

                        // Set AI-suggested ticketType if not already set
                        if (!currentTicket.ticketType && aiResponse.suggestedTicketType) {
                            const validTypes = ["service_request", "problem", "change_request", "access_request", "query", "bug"];
                            if (validTypes.includes(aiResponse.suggestedTicketType)) {
                                updateData.ticketType = aiResponse.suggestedTicketType;
                            }
                        }

                        // Set AI-suggested impact if not already set
                        if (!currentTicket.impact && aiResponse.suggestedImpact) {
                            const impactNum = Number(aiResponse.suggestedImpact);
                            if ([1, 2, 3].includes(impactNum)) {
                                updateData.impact = impactNum;
                            }
                        }

                        // Set AI-suggested urgency if not already set
                        if (!currentTicket.urgency && aiResponse.suggestedUrgency) {
                            const urgencyNum = Number(aiResponse.suggestedUrgency);
                            if ([1, 2, 3].includes(urgencyNum)) {
                                updateData.urgency = urgencyNum;
                            }
                        }

                        // Calculate priority from impact/urgency if ticket doesn't have one
                        if (!currentTicket.priority) {
                            const finalImpact = updateData.impact || currentTicket.impact;
                            const finalUrgency = updateData.urgency || currentTicket.urgency;
                            if (finalImpact && finalUrgency) {
                                updateData.priority = calculatePriority(finalImpact, finalUrgency);
                                console.log(`[AI] Calculated priority: ${updateData.priority} (impact: ${finalImpact}, urgency: ${finalUrgency})`);
                            }
                        }

                        await Ticket.findByIdAndUpdate(ticket._id, updateData);
                    }
                });

                console.log(`[Ticket Created] Manual assignment - skipped auto-assignment.`);
                return { success: true, manualAssignment: true };
            }

            // Normal flow — no incident match, no manual assignment. Save AI results and assign employee.
            const relatedSkillIds = await step.run("save-ai-results", async () => {
                let skillIds = []
                const currentTicket = await Ticket.findById(ticket._id)

                if (aiResponse) {
                    const skillNames = (aiResponse.relatedSkills || []).map(s => s.toLowerCase());
                    const skillDocs = await Skill.find({
                        $expr: {
                            $in: [{ $toLower: "$name" }, skillNames]
                        }
                    });
                    skillIds = skillDocs.map(s => s._id);

                    const updateData = {
                        helpfulNotes: aiResponse.helpfulNotes,
                        status: "IN_PROGRESS",
                        relatedSkills: skillIds
                    }

                    // Set AI-suggested ticketType if not already set
                    if (!currentTicket.ticketType && aiResponse.suggestedTicketType) {
                        const validTypes = ["service_request", "problem", "change_request", "access_request", "query", "bug"];
                        if (validTypes.includes(aiResponse.suggestedTicketType)) {
                            updateData.ticketType = aiResponse.suggestedTicketType;
                            console.log(`[AI] Setting ticketType to: ${aiResponse.suggestedTicketType}`);
                        }
                    }

                    // Set AI-suggested impact if not already set
                    if (!currentTicket.impact && aiResponse.suggestedImpact) {
                        const impactNum = Number(aiResponse.suggestedImpact);
                        if ([1, 2, 3].includes(impactNum)) {
                            updateData.impact = impactNum;
                            console.log(`[AI] Setting impact to: ${impactNum}`);
                        }
                    }

                    // Set AI-suggested urgency if not already set
                    if (!currentTicket.urgency && aiResponse.suggestedUrgency) {
                        const urgencyNum = Number(aiResponse.suggestedUrgency);
                        if ([1, 2, 3].includes(urgencyNum)) {
                            updateData.urgency = urgencyNum;
                            console.log(`[AI] Setting urgency to: ${urgencyNum}`);
                        }
                    }

                    // Calculate priority from impact/urgency if ticket doesn't have one
                    if (!currentTicket.priority) {
                        const finalImpact = updateData.impact || currentTicket.impact;
                        const finalUrgency = updateData.urgency || currentTicket.urgency;
                        if (finalImpact && finalUrgency) {
                            updateData.priority = calculatePriority(finalImpact, finalUrgency);
                            console.log(`[AI] Calculated priority: ${updateData.priority} (impact: ${finalImpact}, urgency: ${finalUrgency})`);
                        }
                    }

                    await Ticket.findByIdAndUpdate(ticket._id, updateData)
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
            return { success: true }

        } catch (err) {
            console.error("Error running the step", err.message)
            return { success: false }
        }

    }
);

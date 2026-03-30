import Ticket from "../models/ticket.js"
import Incident from "../models/incident.js"
import User from "../models/user.js"
import Department from "../models/department.js"

export const getDashboardStats = async (req, res) => {
    try {
        const user = req.user
        const role = user.role

        if (role !== "admin" && role !== "manager") {
            return res.status(403).json({ message: "Access denied" })
        }

        // Build the ticket filter based on role
        let ticketFilter = {}
        let incidentFilter = {}
        let departmentName = null

        if (role === "manager") {
            const userDeptId = user.department?._id?.toString() || user.department?.toString()
            if (!userDeptId) {
                return res.status(400).json({ message: "Manager has no department assigned" })
            }

            // Get all employees in this manager's department
            const deptEmployeeIds = await User.find({
                department: userDeptId,
                role: "employee"
            }).distinct('_id')

            ticketFilter = {
                $or: [
                    { department: userDeptId },
                    { assignedTo: { $in: deptEmployeeIds } },
                    { collaborators: { $in: deptEmployeeIds } }
                ]
            }
            incidentFilter = { department: userDeptId }

            const dept = await Department.findById(userDeptId)
            departmentName = dept?.name || "Your Department"
        }
        // Admin: no filter (all tickets/incidents)

        // 1. Ticket counts by status
        const statusAgg = await Ticket.aggregate([
            { $match: ticketFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])
        const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0, CLOSED: 0 }
        statusAgg.forEach(s => { statusCounts[s._id] = s.count })
        const totalTickets = Object.values(statusCounts).reduce((a, b) => a + b, 0)

        // 2. Ticket counts by priority
        const priorityAgg = await Ticket.aggregate([
            { $match: ticketFilter },
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ])
        const priorityCounts = { low: 0, medium: 0, high: 0, critical: 0 }
        priorityAgg.forEach(p => { if (p._id) priorityCounts[p._id] = p.count })

        // 3. Ticket counts by type
        const typeAgg = await Ticket.aggregate([
            { $match: ticketFilter },
            { $group: { _id: "$ticketType", count: { $sum: 1 } } }
        ])
        const typeCounts = {}
        typeAgg.forEach(t => { if (t._id) typeCounts[t._id] = t.count })

        // 4. Ticket creation trend (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const trendAgg = await Ticket.aggregate([
            {
                $match: {
                    ...ticketFilter,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        // Fill in missing days with 0
        const trend = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo)
            d.setDate(d.getDate() + i)
            const key = d.toISOString().split('T')[0]
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            const found = trendAgg.find(t => t._id === key)
            trend.push({
                date: key,
                day: dayNames[d.getDay()],
                count: found ? found.count : 0
            })
        }

        // 5. Incident stats
        const incidentStatusAgg = await Incident.aggregate([
            { $match: incidentFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ])
        const incidentCounts = { investigating: 0, identified: 0, monitoring: 0, resolved: 0 }
        incidentStatusAgg.forEach(s => { incidentCounts[s._id] = s.count })
        const totalIncidents = Object.values(incidentCounts).reduce((a, b) => a + b, 0)
        const activeIncidents = totalIncidents - (incidentCounts.resolved || 0)

        // 7. Role-specific: team workload (manager) or department breakdown (admin)
        let workloadData = []

        if (role === "manager") {
            const userDeptId = user.department?._id?.toString() || user.department?.toString()
            const employees = await User.find({
                department: userDeptId,
                role: "employee"
            }).select('email _id')

            const workloadAgg = await Ticket.aggregate([
                {
                    $match: {
                        assignedTo: { $in: employees.map(e => e._id) },
                        status: { $in: ["TODO", "IN_PROGRESS"] }
                    }
                },
                { $group: { _id: "$assignedTo", openCount: { $sum: 1 } } }
            ])

            const doneAgg = await Ticket.aggregate([
                {
                    $match: {
                        assignedTo: { $in: employees.map(e => e._id) },
                        status: { $in: ["DONE", "CLOSED"] }
                    }
                },
                { $group: { _id: "$assignedTo", doneCount: { $sum: 1 } } }
            ])

            workloadData = employees.map(emp => {
                const open = workloadAgg.find(w => w._id.toString() === emp._id.toString())
                const done = doneAgg.find(w => w._id.toString() === emp._id.toString())
                return {
                    id: emp._id,
                    name: emp.email.split('@')[0],
                    email: emp.email,
                    openTickets: open ? open.openCount : 0,
                    resolvedTickets: done ? done.doneCount : 0
                }
            }).sort((a, b) => b.openTickets - a.openTickets)
        }

        if (role === "admin") {
            const allDepartments = await Department.find({}).select('name _id')
            const deptBreakdownAgg = await Ticket.aggregate([
                { $group: { _id: { department: "$department", status: "$status" }, count: { $sum: 1 } } }
            ])

            workloadData = allDepartments.map(dept => {
                const deptId = dept._id.toString()
                const entries = deptBreakdownAgg.filter(e =>
                    e._id.department && e._id.department.toString() === deptId
                )
                const statusMap = { TODO: 0, IN_PROGRESS: 0, DONE: 0, CLOSED: 0 }
                entries.forEach(e => { statusMap[e._id.status] = e.count })
                const total = Object.values(statusMap).reduce((a, b) => a + b, 0)
                return {
                    id: dept._id,
                    name: dept.name,
                    total,
                    ...statusMap
                }
            }).sort((a, b) => b.total - a.total)
        }

        return res.status(200).json({
            role,
            departmentName,
            summary: {
                totalTickets,
                openTickets: statusCounts.TODO + statusCounts.IN_PROGRESS,
                resolvedTickets: statusCounts.DONE + statusCounts.CLOSED,
                activeIncidents
            },
            statusCounts,
            priorityCounts,
            typeCounts,
            trend,
            incidents: {
                total: totalIncidents,
                active: activeIncidents,
                statusCounts: incidentCounts
            },
            workload: workloadData
        })

    } catch (error) {
        console.error("Error fetching dashboard stats:", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

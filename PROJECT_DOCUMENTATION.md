# AI-Powered IT Ticketing System - Complete Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Core Features](#5-core-features)
6. [Database Models](#6-database-models)
7. [API Endpoints](#7-api-endpoints)
8. [AI Integration](#8-ai-integration)
9. [Background Jobs (Inngest)](#9-background-jobs-inngest)
10. [Frontend Pages](#10-frontend-pages)
11. [Workflow Diagrams](#11-workflow-diagrams)

---

## 1. Project Overview

This is an **AI-Powered IT Service Management (ITSM) Ticketing System** built for enterprise environments. The system follows **ITIL best practices** and provides intelligent ticket triage, automatic assignment, incident detection, and collaboration features.

### Key Highlights:
- **AI-Powered Ticket Triage**: Uses Google's Gemini AI to analyze tickets, suggest classifications, and identify required skills
- **Automatic Ticket Assignment**: Smart load-balanced assignment based on skills and department
- **Incident Management**: Automatic clustering of similar tickets into incidents
- **Collaboration System**: Cross-department collaboration with approval workflows
- **Role-Based Access Control**: Three-tier access system (Admin, Manager, Employee)
- **Real-Time Dashboard**: Analytics and workload visualization

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                        │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│   │Dashboard│  │ Tickets │  │Incidents│  │  Admin   │  │   Login     │ │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘  └──────┬──────┘ │
└────────┼────────────┼───────────┼─────────────┼────────────────┼────────┘
         │            │           │             │                │
         └────────────┴───────────┴─────────────┴────────────────┘
                                  │ REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express.js)                             │
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────┐ │
│  │   Controllers    │    │   Middlewares    │    │      Routes        │ │
│  │ - user.js        │    │ - auth.js        │    │ - /api/auth        │ │
│  │ - ticket.js      │    │ - authorize.js   │    │ - /api/tickets     │ │
│  │ - incident.js    │    └──────────────────┘    │ - /api/incidents   │ │
│  │ - dashboard.js   │                            │ - /api/departments │ │
│  │ - comment.js     │    ┌──────────────────┐    │ - /api/skills      │ │
│  │ - department.js  │    │     Utils        │    │ - /api/comments    │ │
│  │ - skill.js       │    │ - ai.js          │    │ - /api/dashboard   │ │
│  └──────────────────┘    │ - mailer.js      │    │ - /api/inngest     │ │
│                          │ - ticketHelpers  │    └────────────────────┘ │
│                          └──────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────────┐
│    MongoDB      │    │   Inngest        │    │    Gemini AI API       │
│  (Database)     │    │ (Job Queue)      │    │ (Ticket Analysis)      │
└─────────────────┘    └──────────────────┘    └────────────────────────┘
```

---

## 3. Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js v5** | Web framework |
| **MongoDB + Mongoose v9** | Database & ODM |
| **JWT** | Authentication tokens |
| **bcrypt** | Password hashing |
| **Inngest** | Background job processing |
| **@inngest/agent-kit** | AI agent framework |
| **Nodemailer** | Email notifications |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI library |
| **Vite 7** | Build tool |
| **React Router v7** | Client-side routing |
| **Tailwind CSS v4** | Styling |
| **DaisyUI** | UI components |
| **Framer Motion** | Animations |
| **Lucide React** | Icons |
| **React Hot Toast** | Notifications |

### AI & External Services
| Service | Purpose |
|---------|---------|
| **Google Gemini 2.5 Flash** | Ticket analysis & clustering |
| **SMTP (Gmail)** | Email notifications |

---

## 4. User Roles & Permissions

### Admin
- **Full system access**
- Can view ALL tickets across all departments
- Can manage users (create, update, delete)
- Can manage departments and skills
- Can review collaboration requests from any department
- Can view system-wide dashboard analytics
- Can reopen closed tickets

### Manager
- **Department-scoped access**
- Can view tickets in their department
- Can view tickets assigned to their team members
- Can assign/reassign tickets to department employees
- Can review collaboration requests for their department
- Can view department-specific dashboard analytics
- Can manage incident responses for their department
- Can reopen closed tickets

### Employee
- **Personal ticket access**
- Can view tickets assigned to them
- Can view tickets they created (raised)
- Can view tickets where they are approved collaborators
- Can update status of assigned tickets
- Can request collaborators for their tickets
- Can add comments to accessible tickets
- Cannot assign or reassign tickets

### Permission Matrix

| Action | Admin | Manager | Employee |
|--------|-------|---------|----------|
| View all tickets | ✅ | ❌ | ❌ |
| View department tickets | ✅ | ✅ | ❌ |
| View assigned tickets | ✅ | ✅ | ✅ |
| Create tickets | ✅ | ✅ | ✅ |
| Assign tickets | ✅ | ✅ | ❌ |
| Update ticket status | ✅ | ✅ | ✅ (if assigned) |
| Request collaboration | ✅ | ✅ | ✅ (if assignee) |
| Review collaboration | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Manage departments | ✅ | ❌ | ❌ |
| View dashboard | ✅ | ✅ | ❌ |
| Manage incidents | ✅ | ✅ (own dept) | ❌ |

---

## 5. Core Features

### 5.1 Ticket Management

#### Ticket Creation Flow
1. User fills in title, description, and selects department
2. **Advanced Mode** (optional): User can specify ticket type, impact, urgency, and manually assign
3. Ticket is created with auto-generated ticket number (TKT-001, TKT-002, etc.)
4. **Inngest event triggered**: `ticket/created`
5. AI analyzes ticket and provides:
   - Helpful notes for resolution
   - Related skills
   - Suggested ticket type
   - Impact & urgency assessment
   - Priority calculation
6. System auto-assigns to best-fit employee based on:
   - **Tier 1**: Same department + matching skills
   - **Tier 2**: Same department, any employee
   - **Tier 3**: Escalate to admin

#### Ticket Statuses
- **TODO**: New ticket, not started
- **IN_PROGRESS**: Work has begun
- **DONE**: Work completed
- **CLOSED**: Ticket archived (read-only)

#### Ticket Types (ITIL-based)
- `service_request`: Standard service requests (e.g., new equipment)
- `problem`: Root cause investigation for recurring issues
- `change_request`: Request to modify existing systems
- `access_request`: Permission/credential requests
- `query`: General inquiries
- `bug`: Software defects

#### Priority Calculation Matrix
Priority is calculated from Impact × Urgency:

| Impact ↓ / Urgency → | 1 (Low) | 2 (Moderate) | 3 (High) |
|---------------------|---------|--------------|----------|
| **1 (Individual)** | Low | Low | Medium |
| **2 (Team/Dept)** | Low | Medium | High |
| **3 (Organization)** | Medium | High | Critical |

### 5.2 Collaboration System

The collaboration system enables cross-department teamwork on tickets.

#### Workflow:
1. **Request Phase**:
   - Assignee identifies need for additional expertise
   - Selects one or more employees to collaborate
   - Provides reason for collaboration request
   
2. **Approval Phase**:
   - Request goes to the manager of the proposed collaborator's department
   - Manager reviews and approves/rejects with optional comment
   - For cross-department requests, the collaborator's department manager decides
   
3. **Collaboration Phase**:
   - Approved collaborators gain access to the ticket
   - Can view ticket details, add comments, and update status
   - Access revoked when ticket is closed

#### Collaboration Request States:
- `pending`: Awaiting manager review
- `approved`: Collaborator added to ticket
- `rejected`: Request denied with reason

### 5.3 Incident Management

Incidents represent major issues affecting multiple users. The system provides:

#### Automatic Incident Detection
- Runs every 15 minutes via Inngest cron job
- Analyzes tickets from the last 30 minutes
- Uses AI to cluster semantically similar tickets
- Creates incident if 3+ similar tickets detected
- Assigns department manager as Incident Lead

#### Incident Lifecycle
```
investigating → identified → monitoring → resolved
```

1. **Investigating**: Initial assessment phase
2. **Identified**: Root cause determined
3. **Monitoring**: Fix deployed, under observation
4. **Resolved**: Issue fully resolved

#### Incident Resolution
When an incident is resolved:
- All linked tickets automatically marked as DONE
- System comment added to each ticket
- Activity logs updated
- Resolution timestamp recorded

#### Incident Priorities
- **P1**: Critical - Organization-wide impact
- **P2**: High - Multiple departments affected
- **P3**: Medium - Single department affected
- **P4**: Low - Limited impact

### 5.4 Dashboard Analytics

Role-specific dashboard providing:

#### For Admins:
- Total ticket counts by status
- Ticket distribution by priority
- Ticket types breakdown
- 7-day ticket creation trend
- Department-wise workload distribution
- Active incident count

#### For Managers:
- Department ticket counts
- Team member workload (open vs resolved tickets per employee)
- Department-specific trends
- Priority distribution within department

### 5.5 User Management (Admin Only)

Admins can:
- Create new users with email, password, role, department, and skills
- Update user details (email, role, department, skills)
- Delete users (with automatic cleanup of references)
- View all users with filtering by role and search

#### Cleanup on User Deletion:
- Unassigns from tickets
- Removes from collaborator lists
- Removes pending collaboration requests
- Clears manager assignment from departments
- Clears incident lead assignment

### 5.6 Department Management

Departments organize users and tickets:
- Each department has a name, description, and optional manager
- Manager auto-synced: Assigning a manager updates their role and department
- Deleting a department nullifies references in users and tickets

### 5.7 Skill Management

Skills represent technical competencies:
- Skills can be department-specific or global
- Auto-created when mentioned in user profiles
- Used for smart ticket assignment matching
- AI suggests relevant skills for tickets

### 5.8 Comment System

Comments enable communication on tickets:
- Threaded comments on each ticket
- Access controlled by ticket visibility rules
- System comments auto-added for status changes and incident links
- Comments disabled on closed tickets

### 5.9 Password Reset

Secure OTP-based password reset:
1. User requests reset with email
2. 6-digit OTP sent via email
3. OTP valid for 10 minutes
4. User verifies OTP
5. Temporary token issued (15 min validity)
6. User sets new password

---

## 6. Database Models

### 6.1 User Model
```javascript
{
    email: String (required, unique),
    password: String (required, hashed),
    role: String (enum: ["admin", "manager", "employee"], default: "employee"),
    department: ObjectId (ref: Department),
    skills: [ObjectId] (ref: Skill),
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: Date
}
```

### 6.2 Ticket Model
```javascript
{
    ticketNumber: Number (unique, auto-increment),
    title: String (required),
    description: String (required),
    status: String (enum: ["TODO", "IN_PROGRESS", "DONE", "CLOSED"], default: "TODO"),
    createdBy: ObjectId (ref: User),
    assignedTo: ObjectId (ref: User),
    ticketType: String (enum: ["service_request", "problem", "change_request", 
                               "access_request", "query", "bug"]),
    impact: Number (enum: [1, 2, 3]),
    urgency: Number (enum: [1, 2, 3]),
    priority: String (enum: ["low", "medium", "high", "critical"]),
    department: ObjectId (ref: Department),
    helpfulNotes: String (AI-generated),
    relatedSkills: [ObjectId] (ref: Skill),
    incident: ObjectId (ref: Incident),
    collaborationRequests: [{
        user: ObjectId (ref: User),
        requestedBy: ObjectId (ref: User),
        requestedAt: Date,
        reason: String,
        status: String (enum: ["pending", "approved", "rejected"]),
        reviewedBy: ObjectId (ref: User),
        reviewedAt: Date,
        reviewComment: String
    }],
    collaborators: [ObjectId] (ref: User),
    timestamps: true
}
```

### 6.3 Incident Model
```javascript
{
    incidentNumber: Number (unique, auto-increment),
    title: String (required),
    description: String (required),
    priority: String (enum: ["P1", "P2", "P3", "P4"], default: "P3"),
    status: String (enum: ["investigating", "identified", "monitoring", "resolved"], 
                    default: "investigating"),
    department: ObjectId (ref: Department, required),
    incidentLead: ObjectId (ref: User, required),
    tickets: [ObjectId] (ref: Ticket),
    updates: [{
        userId: ObjectId (ref: User),
        content: String,
        createdAt: Date
    }],
    rootCause: String,
    resolutionSummary: String,
    resolvedAt: Date,
    timestamps: true
}
```

### 6.4 Department Model
```javascript
{
    name: String (required, unique),
    description: String,
    managerId: ObjectId (ref: User),
    createdAt: Date
}
```

### 6.5 Skill Model
```javascript
{
    name: String (required, unique),
    department: ObjectId (ref: Department),
    createdAt: Date
}
```

### 6.6 Comment Model
```javascript
{
    ticketId: ObjectId (ref: Ticket, required),
    userId: ObjectId (ref: User, required),
    content: String (required),
    createdAt: Date
}
```

### 6.7 Activity Models

#### TicketActivity
```javascript
{
    ticketId: ObjectId (ref: Ticket),
    performedBy: ObjectId (ref: User),
    action: String (enum: ['CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'REASSIGNED', 
                           'PRIORITY_CHANGED', 'COMMENT_ADDED', 'INCIDENT_LINKED', 
                           'INCIDENT_RESOLVED', 'COLLAB_REQUESTED', 'COLLAB_APPROVED', 
                           'COLLAB_REJECTED']),
    oldValue: String,
    newValue: String,
    createdAt: Date
}
```

#### IncidentActivity
```javascript
{
    incidentId: ObjectId (ref: Incident),
    performedBy: ObjectId (ref: User),
    action: String (enum: ['CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 
                           'UPDATE_ADDED', 'TICKET_ADDED', 'TICKET_REMOVED', 'RESOLVED']),
    oldValue: String,
    newValue: String,
    metadata: Mixed,
    createdAt: Date
}
```

### 6.8 Counter Model
Used for auto-incrementing ticket and incident numbers:
```javascript
{
    _id: String (e.g., "ticketNumber", "incidentNumber"),
    seq: Number (default: 0)
}
```

---

## 7. API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/login` | User login | Public |
| POST | `/logout` | User logout | Public |
| POST | `/forgot-password` | Request password reset OTP | Public |
| POST | `/verify-otp` | Verify OTP | Public |
| POST | `/reset-password` | Set new password | Public |
| POST | `/add-user` | Create new user | Admin |
| POST | `/update-user` | Update user details | Admin |
| DELETE | `/delete-user/:userId` | Delete user | Admin |
| GET | `/users` | Get all users | Admin |
| GET | `/department-employees` | Get department employees | Admin, Manager |
| GET | `/collaborator-candidates` | Get potential collaborators | Authenticated |
| GET | `/employees-by-department` | Get employees by department | Authenticated |

### Tickets (`/api/tickets`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get tickets (with view parameter) | Authenticated |
| GET | `/:id` | Get single ticket | Authenticated |
| POST | `/` | Create ticket | Authenticated |
| PATCH | `/:id` | Update ticket | Admin, Manager, Employee |
| GET | `/:id/activities` | Get ticket activity log | Authenticated |
| POST | `/:id/collaboration/request` | Request collaboration | Admin, Manager, Employee |
| POST | `/:id/collaboration/review` | Approve/reject collaboration | Admin, Manager |

#### Ticket View Parameters:
- `?view=raised` - Tickets created by current user
- `?view=assigned` - Tickets assigned to current user
- `?view=collaborating` - Tickets where user is collaborator
- `?view=all` - All tickets (admin only)
- `?view=department` - Department tickets (manager only)
- `?view=collab_pending` - Tickets with pending collaboration requests

### Incidents (`/api/incidents`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all incidents | Authenticated |
| GET | `/:id` | Get single incident | Authenticated |
| PATCH | `/:id/status` | Update incident status | Admin, Manager |
| PATCH | `/:id/priority` | Update incident priority | Admin, Manager |
| POST | `/:id/updates` | Add incident update | Admin, Manager, Assigned |
| POST | `/:id/tickets` | Add ticket to incident | Admin, Manager |
| DELETE | `/:id/tickets/:ticketId` | Remove ticket from incident | Admin, Manager |
| GET | `/:id/available-tickets` | Get linkable tickets | Admin, Manager |
| GET | `/:id/activity` | Get incident activity log | Authenticated |

### Departments (`/api/departments`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all departments | Authenticated |
| POST | `/` | Create department | Admin |
| PUT | `/:id` | Update department | Admin |
| DELETE | `/:id` | Delete department | Admin |

### Skills (`/api/skills`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all skills | Authenticated |
| POST | `/` | Create skill | Admin |
| DELETE | `/:id` | Delete skill | Admin |

### Comments (`/api/comments`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/:ticketId` | Get ticket comments | Authenticated |
| POST | `/:ticketId` | Add comment | Authenticated |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/stats` | Get dashboard statistics | Admin, Manager |

---

## 8. AI Integration

### AI Functions

#### 1. `analyzeTicket(ticket, availableSkills)`
Analyzes a ticket and returns:
```javascript
{
    summary: "Brief summary of the issue",
    helpfulNotes: "Detailed technical notes for resolution",
    relatedSkills: ["React", "MongoDB"],
    suggestedTicketType: "bug",
    suggestedImpact: 2,
    suggestedUrgency: 3
}
```

#### 2. `analyzeTicketWithIncidentCheck(ticket, availableSkills, activeIncidents)`
Same as above, plus:
```javascript
{
    // ... all above fields ...
    matchedIncidentId: "incident_id_if_matched" // or null
}
```

#### 3. `clusterTickets(tickets)`
Groups similar tickets into incident clusters:
```javascript
{
    clusters: [
        {
            title: "Email Server Outage",
            description: "Multiple users reporting inability to access email",
            ticketIds: ["id1", "id2", "id3"]
        }
    ]
}
```

### AI Model Configuration
- **Model**: Gemini 2.5 Flash
- **Provider**: Google AI (via @inngest/agent-kit)
- **Retry Logic**: Up to 3 retries with exponential backoff for rate limits
- **Response Format**: Raw JSON (no markdown)

---

## 9. Background Jobs (Inngest)

### 9.1 `on-ticket-created` Event

**Trigger**: `ticket/created` event

**Flow**:
1. Fetch ticket from database
2. Collect department skills for AI context
3. Fetch active incidents for matching
4. Run AI analysis (with incident check if active incidents exist)
5. If ticket matches existing incident:
   - Link ticket to incident
   - Auto-assign to department employee
   - Skip normal assignment
6. If manual assignment mode:
   - Save AI results only
   - Skip auto-assignment
7. Normal flow:
   - Save AI results (skills, notes, type, impact, urgency, priority)
   - Run tiered assignment logic:
     - Tier 1: Skills + Department match
     - Tier 2: Department match only
     - Tier 3: Escalate to Admin

### 9.2 `incident-detection-cron` Job

**Schedule**: Every 15 minutes (`*/15 * * * *`)

**Flow**:
1. Fetch tickets from last 30 minutes that:
   - Are not linked to any incident
   - Have status TODO or IN_PROGRESS
2. Skip if fewer than 3 tickets
3. Run AI clustering on tickets
4. For each valid cluster (3+ tickets):
   - Determine majority department
   - Find department manager as incident lead
   - Create incident with auto-generated number
   - Link all clustered tickets to incident
   - Create activity records

### Inngest Configuration
```javascript
// Client
const inngest = new Inngest({ id: "ticketing-system" })

// Function options
{
    id: "on-ticket-created",
    retries: 1  // Limited retries due to AI API quotas
}

{
    id: "incident-detection-cron",
    retries: 1,
    concurrency: {
        limit: 1,  // Only one instance at a time
        key: "incident-detection-singleton"
    }
}
```

---

## 10. Frontend Pages

### 10.1 Login Page (`/login`)
- Email/password authentication
- "Forgot Password" link
- Redirects to dashboard on success

### 10.2 Forgot Password Page (`/forgot-password`)
- Three-step wizard:
  1. Enter email
  2. Enter OTP (6 digits)
  3. Set new password

### 10.3 Dashboard Page (`/dashboard`)
- **Admin View**:
  - Summary cards (total, open, resolved tickets, active incidents)
  - Status distribution chart
  - Priority distribution chart
  - 7-day trend sparkline
  - Department workload breakdown
  
- **Manager View**:
  - Department-specific summary
  - Team workload (employee ticket distribution)
  - Status and priority charts for department

### 10.4 Tickets Page (`/tickets`)
- Tabbed view:
  - **Raised**: Tickets created by user
  - **Assigned**: Tickets assigned to user
  - **Collaborating**: Tickets where user is collaborator
  - **Department** (Manager): All department tickets
  - **All** (Admin): All system tickets
  - **Pending Approval** (Manager/Admin): Collaboration requests awaiting review

- **Create Ticket Form**:
  - Title, Description, Department (required)
  - Advanced Mode (toggle):
    - Ticket Type selector
    - Impact selector (1-3)
    - Urgency selector (1-3)
    - Priority display (calculated)
    - Manual assignment to department employee

### 10.5 Ticket Details Page (`/tickets/:id`)
- Full ticket information display
- Status/Priority badges
- AI-generated helpful notes
- Related skills tags
- Incident link (if applicable)

- **Edit Panel** (Manager/Admin):
  - Status dropdown
  - Priority dropdown
  - Assignee dropdown

- **Collaboration Section** (Assignee):
  - Request collaborator button
  - Multi-select collaborator modal
  - Reason input

- **Collaboration Requests** (Manager/Admin):
  - List of pending requests
  - Approve/Reject buttons with comment

- **Activity Timeline**:
  - Chronological list of all ticket actions

- **Comments Section**:
  - Comment input (if ticket not closed)
  - Threaded comment display

### 10.6 Incidents Page (`/incidents`)
- Tabbed view:
  - **Active**: Ongoing incidents
  - **Resolved**: Closed incidents
  
- Incident cards showing:
  - Incident number (INC-XXX)
  - Title and description
  - Priority badge (P1-P4)
  - Status badge
  - Department
  - Linked ticket count
  - Resolution duration (for resolved)

### 10.7 Incident Details Page (`/incidents/:id`)
- Full incident information
- Status progression controls (if authorized)
- Priority selector

- **Linked Tickets Section**:
  - Table of linked tickets
  - Add ticket button
  - Remove ticket button (if 2+ tickets)

- **Updates Section**:
  - Add update input
  - Timeline of incident updates

- **Activity Log**:
  - All incident actions

### 10.8 Admin Page (`/admin`)
- **Users Section**:
  - User table with search and role filter
  - Inline editing (email, role, department, skills)
  - Delete user with confirmation
  - Create user modal

- **Departments Section**:
  - Department cards
  - Create department modal
  - Edit department modal
  - Delete department with cascade warning

---

## 11. Workflow Diagrams

### 11.1 Ticket Creation & Assignment Flow
```
User Creates Ticket
        │
        ▼
    ┌───────────┐
    │ Validate  │
    │  Input    │
    └─────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ Create Ticket │
    │ (Auto-number) │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────┐
    │ Trigger Inngest   │
    │ ticket/created    │
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────┐
    │  AI Analyzes Ticket │
    │  - Skills           │
    │  - Type/Impact      │
    │  - Incident Match   │
    └──────────┬──────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│ Incident    │  │ No Incident  │
│ Match Found │  │ Match        │
└──────┬──────┘  └───────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────┐  ┌──────────────────┐
│ Link to     │  │ Tiered Assignment│
│ Incident    │  │                  │
└──────┬──────┘  └────────┬─────────┘
       │                  │
       ▼                  ▼
┌─────────────┐  ┌──────────────────┐
│ Assign to   │  │ T1: Skills+Dept  │
│ Dept Staff  │  │ T2: Dept Only    │
└──────┬──────┘  │ T3: Admin        │
       │         └────────┬─────────┘
       │                  │
       └──────────────────┘
                │
                ▼
        [Ticket Active]
```

### 11.2 Collaboration Request Flow
```
Assignee Requests Collaboration
            │
            ▼
    ┌───────────────┐
    │ Select Users  │
    │ & Reason      │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────┐
    │ Create Pending    │
    │ Requests          │
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────────┐
    │ Manager of Collaborator │
    │ Department Reviews      │
    └───────────┬─────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌─────────────┐  ┌─────────────┐
│  Approved   │  │  Rejected   │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Add to      │  │ Record      │
│ Collaborators│  │ Rejection   │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ User Gains  │  │ No Access   │
│ Access      │  │ Granted     │
└─────────────┘  └─────────────┘
```

### 11.3 Incident Detection Flow
```
    ┌─────────────────────────┐
    │ Every 15 Minutes (Cron) │
    └───────────┬─────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │ Fetch Unlinked Tickets    │
    │ (Last 30 mins, Active)    │
    └─────────────┬─────────────┘
                  │
          ┌───────┴───────┐
          │               │
          ▼               ▼
    ┌───────────┐   ┌───────────┐
    │ < 3       │   │ >= 3      │
    │ Tickets   │   │ Tickets   │
    └─────┬─────┘   └─────┬─────┘
          │               │
          ▼               ▼
    ┌───────────┐   ┌───────────────┐
    │  Skip     │   │ AI Clustering │
    └───────────┘   └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
            ┌───────────┐   ┌───────────────┐
            │ No Valid  │   │ Valid Clusters│
            │ Clusters  │   │ (3+ tickets)  │
            └─────┬─────┘   └───────┬───────┘
                  │                 │
                  ▼                 ▼
            ┌───────────┐   ┌───────────────────┐
            │  Skip     │   │ For Each Cluster: │
            └───────────┘   │ - Create Incident │
                            │ - Link Tickets    │
                            │ - Assign Lead     │
                            └───────────────────┘
```

### 11.4 Incident Resolution Flow
```
Incident Lead Resolves Incident
            │
            ▼
    ┌───────────────────┐
    │ Confirm Resolution│
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────────┐
    │ For Each Linked Ticket: │
    │ - Set Status = DONE     │
    │ - Clear Incident Ref    │
    │ - Add System Comment    │
    │ - Log Activity          │
    └───────────┬─────────────┘
                │
                ▼
    ┌─────────────────────┐
    │ Update Incident:    │
    │ - Status = resolved │
    │ - Set resolvedAt    │
    │ - Log Activity      │
    └─────────────────────┘
```

---

## Environment Variables

### Backend (`.env`)
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/ticketing
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Ticket System <your_email@gmail.com>"
```

### Frontend (`.env`)
```env
VITE_SERVER_URL=http://localhost:3000/api
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB v6+
- Google Gemini API Key
- Gmail account (for SMTP)

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd Main
```

2. **Setup Backend**
```bash
cd backend
npm install
# Configure .env file
npm run dev
```

3. **Setup Inngest Dev Server** (separate terminal)
```bash
cd backend
npm run inngest-dev
```

4. **Setup Frontend**
```bash
cd frontend
npm install
# Configure .env file
npm run dev
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Inngest Dashboard: http://localhost:8288

---

## Author

This AI-Powered IT Ticketing System was developed as a Final Year Project demonstrating the integration of modern web technologies with AI capabilities for enterprise ITSM solutions.

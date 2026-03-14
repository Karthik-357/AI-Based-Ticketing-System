import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import { serve } from "inngest/express"
import userRoutes from "./routes/user.js"
import ticketRoutes from "./routes/ticket.js"
import commentRoutes from "./routes/comment.js"
import departmentRoutes from "./routes/department.js"
import skillRoutes from "./routes/skill.js"
import { inngest } from "./inngest/client.js"
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/skills", skillRoutes);

app.use("/api/inngest", serve({
    client: inngest,
    functions: [onTicketCreated]
}));


mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
    })
    .catch((err) => console.error("MongoDB error: ", err))

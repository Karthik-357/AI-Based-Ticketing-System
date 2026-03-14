import express from "express"
import { authenticate } from "../middlewares/auth.js"
import { authorize } from "../middlewares/authorize.js"
import { getSkills, createSkill, deleteSkill } from "../controllers/skill.js"

const router = express.Router()

router.get("/", authenticate, getSkills)
router.post("/", authenticate, authorize(['admin']), createSkill)
router.delete("/:id", authenticate, authorize(['admin']), deleteSkill)

export default router

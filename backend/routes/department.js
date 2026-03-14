import express from "express"
import { authenticate } from "../middlewares/auth.js"
import { authorize } from "../middlewares/authorize.js"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../controllers/department.js"

const router = express.Router()

router.get("/", authenticate, getDepartments)
router.post("/", authenticate, authorize(['admin']), createDepartment)
router.patch("/:id", authenticate, authorize(['admin']), updateDepartment)
router.delete("/:id", authenticate, authorize(['admin']), deleteDepartment)

export default router

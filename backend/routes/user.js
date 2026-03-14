import express from "express"
import { getUser, login, addUser, logout, updateUser, deleteUser, getDepartmentEmployees } from "../controllers/user.js"


import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
const router = express.Router()

router.post("/update-user", authenticate, authorize(['admin']), updateUser)
router.delete("/delete-user/:userId", authenticate, authorize(['admin']), deleteUser)
router.get("/users", authenticate, authorize(['admin']), getUser)
router.post("/add-user", authenticate, authorize(['admin']), addUser)
router.get("/department-employees", authenticate, authorize(['admin', 'manager']), getDepartmentEmployees)


router.post("/login", login)
router.post("/logout", logout)


export default router
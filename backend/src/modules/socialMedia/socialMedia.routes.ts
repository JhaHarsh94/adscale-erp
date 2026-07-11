import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  createAccount,
  createCalendar,
  createPost,
  deleteAccount,
  deleteCalendar,
  deletePost,
  getAccount,
  getCalendar,
  getProjectsWithoutSocial,
  getSocialDashboard,
  listAccounts,
  listCalendars,
  listPosts,
  updateAccount,
  updateCalendar,
  updatePost,
} from "./socialMedia.controller";

const router = Router();

const socialMediaRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"];

router.use(protect);
router.use(allowRoles(...socialMediaRoles));

router.get("/dashboard", getSocialDashboard);

router.get("/accounts", listAccounts);
router.get("/accounts/without-social", getProjectsWithoutSocial);
router.get("/accounts/:id", getAccount);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

router.get("/posts", listPosts);
router.post("/posts", createPost);
router.put("/posts/:id", updatePost);
router.delete("/posts/:id", deletePost);

router.get("/calendars", listCalendars);
router.get("/calendars/:id", getCalendar);
router.post("/calendars", createCalendar);
router.put("/calendars/:id", updateCalendar);
router.delete("/calendars/:id", deleteCalendar);

export default router;

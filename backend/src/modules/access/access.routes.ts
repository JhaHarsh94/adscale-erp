import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getPermissions,
  getRoles,
  setRolePermissions,
  updatePermission,
  updateRole,
} from "./access.controller";

export const roleRoutes = Router();
export const permissionRoutes = Router();

roleRoutes.use(protect, allowRoles("SUPER_ADMIN", "DIRECTOR"));
roleRoutes.get("/", getRoles);
roleRoutes.post("/", allowRoles("SUPER_ADMIN"), createRole);
roleRoutes.put("/:id", allowRoles("SUPER_ADMIN"), updateRole);
roleRoutes.delete("/:id", allowRoles("SUPER_ADMIN"), deleteRole);
roleRoutes.put(
  "/:id/permissions",
  allowRoles("SUPER_ADMIN"),
  setRolePermissions
);

permissionRoutes.use(protect, allowRoles("SUPER_ADMIN", "DIRECTOR"));
permissionRoutes.get("/", getPermissions);
permissionRoutes.post("/", allowRoles("SUPER_ADMIN"), createPermission);
permissionRoutes.put("/:id", allowRoles("SUPER_ADMIN"), updatePermission);
permissionRoutes.delete("/:id", allowRoles("SUPER_ADMIN"), deletePermission);

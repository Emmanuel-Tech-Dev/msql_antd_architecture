const Model = require("../core/model/model");

class AccessRoute {
  constructor(app) {
    this.app = app;
    this.getUsersByRole(app);
    this.getPermissions(app);

    return this;
  }

  getUsersByRole(app) {
    app.get("/access/users/:role_name", async (req, res) => {
      const { role_name } = req.params;
      const data = await new Model()
        .multiSelect([
          { table: "admin", columns: ["email", "name", "phone_no"] },
          { table: "admin_user_roles", columns: [] }, // No room columns, just for joining
        ])
        //  .addAggregate("SUM", "rooms.room_capacity", "total_capacity") // Won't work - need custom approach
        .join(
          "INNER",
          "admin_user_roles",
          "admin.custom_id",
          "admin_user_roles.user_id",
        )
        .where("admin_user_roles.role_id", "=", role_name)
        .execute();

      res.json({ success: true, data });
    });
  }

  getPermissions(app) {
    app.get("/access/permissions/:role_name", async (req, res) => {
      const { role_name } = req.params;

      //First step is to fetch all permissions in the system

      const allPermissions = await new Model()
        .select(["*"], "admin_permissions")
        .execute();

      const assigned = await new Model()
        .select(["permission"], "admin_role_permissions")
        .where("role_id", "=", role_name)
        .execute();
      //Second is to fetch all this permissions assigned to a role

      res.json({ success: true, data: { allPermissions, assigned } });
    });
  }
}

module.exports = AccessRoute;

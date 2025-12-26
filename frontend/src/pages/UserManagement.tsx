import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { User } from "../types";
import { apiService } from "../services/api";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Key,
  Shield,
  Mail,
  User as UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import SafeDeleteConfirmation from "../components/SafeDeleteConfirmation";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Waiter" as User["role"],
  });
  const [processing, setProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await apiService.getAllUsers();
      setUsers(usersData as User[]);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Error loading users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setProcessing(true);
      await apiService.createUser(formData);
      toast.success("User created successfully!");
      setShowCreateDialog(false);
      setFormData({ name: "", email: "", password: "", role: "Waiter" });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Error creating user: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.name || !formData.email) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setProcessing(true);
      await apiService.updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });
      toast.success("User updated successfully!");
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({ name: "", email: "", password: "", role: "Waiter" });
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Error updating user: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser || !formData.password) {
      toast.error("Please enter a new password");
      return;
    }

    try {
      setProcessing(true);
      await apiService.updateUserPassword(selectedUser.id, formData.password);
      toast.success("Password updated successfully!");
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setFormData({ name: "", email: "", password: "", role: "Waiter" });
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error("Error updating password: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.role === "Admin") {
      toast.error("Cannot delete admin user");
      return;
    }
    
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setProcessing(true);
      await apiService.deleteUser(userToDelete.id);
      toast.success("User deleted successfully!");
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: "", email: "", password: "", role: "Waiter" });
    setShowCreateDialog(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({ name: "", email: "", password: "", role: "Waiter" });
    setShowPasswordDialog(true);
  };

  const getRoleBadgeColor = (role: User["role"]) => {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Cashier":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Kitchen":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Waiter":
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center space-x-2">
            <Users className="h-8 w-8" />
            <span>User Management</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage system users and their roles
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </Button>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{user.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(user)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPasswordDialog(user)}
                    className="flex-1"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Password
                  </Button>
                  {user.role !== "Admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      disabled={processing}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Create New User</span>
            </DialogTitle>
            <DialogDescription>
              Add a new user to the system by providing their name, email, password, and role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter user name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as User["role"],
                  })
                }
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-border"
              >
                <option value="Waiter">Waiter</option>
                <option value="Cashier">Cashier</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleCreateUser}
                loading={processing}
                loadingText="Creating..."
                className="flex-1"
              >
                Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit User</span>
            </DialogTitle>
            <DialogDescription>
              Update the user's information including name, email, and role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter user name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as User["role"],
                  })
                }
                className="w-full border rounded px-3 py-2 bg-background text-foreground border-border"
              >
                <option value="Waiter">Waiter</option>
                <option value="Cashier">Cashier</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleUpdateUser}
                loading={processing}
                loadingText="Updating..."
                className="flex-1"
              >
                Update User
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Update Password</span>
            </DialogTitle>
            <DialogDescription>
              Set a new password for this user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                New Password for {selectedUser?.name}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter new password"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleUpdatePassword}
                loading={processing}
                loadingText="Updating..."
                className="flex-1"
              >
                Update Password
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Safe Delete Confirmation Dialog */}
      <SafeDeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        itemName={userToDelete?.name || ""}
        itemType="User"
        loading={processing}
      />
    </div>
  );
};

export default UserManagement;
import { Response } from 'express';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { IRequestWithUser } from '../middleware/auth';

export class UserController {
  // Create User (Admin Only)
  public static async createUser(req: IRequestWithUser, res: Response) {
    try {
      const { employeeId, username, password, role, department, permissions } = req.body;

      if (!employeeId || !username || !password || !role || !department) {
        return res.status(400).json({ message: 'All fields are required.' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ employeeId }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this ID or Username already exists.' });
      }

      const user = new User({
        employeeId,
        username,
        passwordHash: password, // Pre-save hook hashes this
        role,
        department,
        permissions: permissions || [],
      });

      await user.save();

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'USER_CREATE',
        details: `Created user ${username} (${employeeId}) with role ${role}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(201).json({
        message: 'User created successfully.',
        user: {
          id: user._id,
          employeeId: user.employeeId,
          username: user.username,
          role: user.role,
          department: user.department,
        },
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Fetch All Users with search and filtering
  public static async getUsers(req: IRequestWithUser, res: Response) {
    try {
      const { search, role, department, status } = req.query;
      const filter: any = {};

      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
        ];
      }

      if (role) filter.role = role;
      if (department) filter.department = department;
      if (status) filter.status = status;

      const users = await User.find(filter).select('-passwordHash').populate('manager', 'username employeeId');
      return res.status(200).json(users);
    } catch (error: any) {
      console.error('Get users error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Update User Status
  public static async updateStatus(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'active' | 'suspended'

      if (!status || !['active', 'suspended'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      user.status = status;
      await user.save();

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: `USER_${status.toUpperCase()}`,
        details: `${status.charAt(0).toUpperCase() + status.slice(1)} user ${user.username}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: `User ${status} successfully.`, user });
    } catch (error: any) {
      console.error('Update user status error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Reset password (Admin Only)
  public static async resetPassword(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters.' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      user.passwordHash = newPassword; // Hashed by hook
      await user.save();

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'USER_PASSWORD_RESET',
        details: `Reset password for user ${user.username}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Delete User
  public static async deleteUser(req: IRequestWithUser, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      await User.findByIdAndDelete(id);

      // Audit Log
      await AuditLog.create({
        actorId: req.user?._id,
        action: 'USER_DELETE',
        details: `Deleted user ${user.username}.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error: any) {
      console.error('Delete user error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Bulk Import Users (CSV parsing)
  public static async bulkImport(req: IRequestWithUser, res: Response) {
    try {
      const { csvData } = req.body; // Expecting raw CSV string in body
      if (!csvData) {
        return res.status(400).json({ message: 'No CSV data provided.' });
      }

      const lines = csvData.split('\n');
      const usersToInsert: any[] = [];
      const errors = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 5) {
          errors.push(`Line ${i + 1}: Insufficient fields.`);
          continue;
        }

        const [employeeId, username, password, role, department, permissionsStr] = parts.map((p: string) => p.trim());
        
        // Simple validation
        if (!employeeId || !username || !password || !role || !department) {
          errors.push(`Line ${i + 1}: Missing required fields.`);
          continue;
        }

        // Verify duplicates in this batch
        const isDuplicate = usersToInsert.some((u) => u.employeeId === employeeId || u.username === username);
        if (isDuplicate) {
          errors.push(`Line ${i + 1}: Duplicate user entry in import file.`);
          continue;
        }

        const permissions = permissionsStr ? permissionsStr.split(';') : [];

        usersToInsert.push({
          employeeId,
          username,
          passwordHash: password, // Hashed in pre-save loop
          role: role as any,
          department,
          permissions,
        });
      }

      // Check existing in DB
      let createdCount = 0;
      for (const userData of usersToInsert) {
        const existing = await User.findOne({
          $or: [{ employeeId: userData.employeeId }, { username: userData.username }],
        });

        if (existing) {
          errors.push(`User ${userData.username} (${userData.employeeId}) already exists in DB.`);
          continue;
        }

        const u = new User(userData);
        await u.save();
        createdCount++;
      }

      // Audit Log
      if (createdCount > 0) {
        await AuditLog.create({
          actorId: req.user?._id,
          action: 'USER_BULK_IMPORT',
          details: `Imported ${createdCount} users successfully.`,
          ipAddress: req.ip || '127.0.0.1',
        });
      }

      return res.status(200).json({
        message: `Import processed. Created ${createdCount} users.`,
        errors,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Export Users CSV
  public static async exportUsers(req: IRequestWithUser, res: Response) {
    try {
      const users = await User.find({});
      let csv = 'Employee ID,Username,Role,Department,Permissions,Status,Created At\n';

      users.forEach((user) => {
        const perms = user.permissions.join(';');
        csv += `${user.employeeId},${user.username},${user.role},${user.department},"${perms}",${user.status},${(user as any).createdAt?.toISOString() || ''}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
      return res.status(200).send(csv);
    } catch (error: any) {
      console.error('Export users error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }
}
export default UserController;

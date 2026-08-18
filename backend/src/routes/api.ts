import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthController } from '../controllers/authController';
import { UserController } from '../controllers/userController';
import { TaskController } from '../controllers/taskController';
import { AttendanceController } from '../controllers/attendanceController';
import { ChatController } from '../controllers/chatController';
import { ReportController } from '../controllers/reportController';
import { LogController } from '../controllers/logController';
import { AnnouncementController } from '../controllers/announcementController';
import { LocationController } from '../controllers/locationController';
import { HabitController } from '../controllers/habitController';
import { GoalController } from '../controllers/goalController';
import { protect, restrictTo } from '../middleware/auth';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Configure Multer storage for uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// --- AUTHENTICATION ---
router.post('/auth/login', authLimiter, AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/biometric-register', protect, AuthController.registerBiometric);
router.post('/auth/biometric-login', authLimiter, AuthController.loginBiometric);

// --- USER MANAGEMENT (Admin Gated) ---
router.post('/users', protect, restrictTo('super_admin', 'principal'), UserController.createUser);
router.get('/users', protect, UserController.getUsers);
router.patch('/users/:id/status', protect, restrictTo('super_admin', 'principal'), UserController.updateStatus);
router.patch('/users/:id/reset-password', protect, restrictTo('super_admin', 'principal'), UserController.resetPassword);
router.delete('/users/:id', protect, restrictTo('super_admin', 'principal'), UserController.deleteUser);
router.post('/users/bulk-import', protect, restrictTo('super_admin', 'principal'), UserController.bulkImport);
router.get('/users/export', protect, restrictTo('super_admin', 'principal'), UserController.exportUsers);

// --- TASK MANAGEMENT ---
router.post('/tasks', protect, restrictTo('super_admin', 'principal', 'teacher', 'coordinator'), TaskController.createTask);
router.get('/tasks', protect, TaskController.getTasks);
router.get('/tasks/:id', protect, TaskController.getTaskById);
router.put('/tasks/:id', protect, restrictTo('super_admin', 'principal', 'teacher', 'coordinator'), TaskController.updateTask);
router.delete('/tasks/:id', protect, restrictTo('super_admin', 'principal'), TaskController.deleteTask);
router.post('/tasks/:id/comments', protect, TaskController.addComment);
router.patch('/tasks/:taskId/subtasks/:subtaskId', protect, TaskController.toggleSubtask);
router.patch('/tasks/:id/status', protect, upload.array('attachments'), TaskController.updateStatus);
router.patch('/tasks/:id/approve', protect, TaskController.approveTask);

// --- ATTENDANCE ---
router.post('/attendance/clock-in', protect, AttendanceController.clockIn);
router.post('/attendance/clock-out', protect, AttendanceController.clockOut);
router.get('/attendance', protect, AttendanceController.getAttendance);
router.post('/attendance/track', protect, AttendanceController.trackLocation);

// --- CHAT SYSTEM ---
router.get('/chat/groups', protect, ChatController.getGroups);
router.get('/chat/groups/:groupId/messages', protect, ChatController.getMessages);
router.post('/chat/groups', protect, ChatController.createGroup);
router.post('/chat/groups/:groupId/messages', protect, upload.array('attachments'), ChatController.sendMessage);
router.get('/chat/groups/:groupId/search', protect, ChatController.searchMessages);
router.post('/chat/groups/:groupId/pin/:messageId', protect, ChatController.pinMessage);
router.post('/chat/groups/:groupId/unpin/:messageId', protect, ChatController.unpinMessage);
router.get('/chat/groups/:groupId/pins', protect, ChatController.getPinnedMessages);
router.post('/chat/groups/:groupId/read', protect, ChatController.markRead);

// --- REPORTS (Admin Gated) ---
router.get('/reports/tasks', protect, restrictTo('super_admin', 'principal'), ReportController.exportTasks);
router.get('/reports/attendance', protect, restrictTo('super_admin', 'principal'), ReportController.exportAttendance);

// --- AUDIT LOGS (Admin Gated) ---
router.get('/logs', protect, restrictTo('super_admin', 'principal'), LogController.getLogs);

// --- ANNOUNCEMENTS ---
router.post('/announcements', protect, restrictTo('super_admin', 'principal'), AnnouncementController.create);
router.get('/announcements', protect, AnnouncementController.getAll);
router.delete('/announcements/:id', protect, restrictTo('super_admin', 'principal'), AnnouncementController.delete);

// --- LOCATION SHARING ---
router.post('/location/share', protect, LocationController.startOrUpdateSharing);
router.post('/location/stop', protect, LocationController.stopSharing);
router.get('/location/live', protect, restrictTo('super_admin', 'principal'), LocationController.getLiveLocations);
router.get('/location/history/:taskId', protect, restrictTo('super_admin', 'principal'), LocationController.getTaskHistory);

// --- HABITS ---
router.post('/habits', protect, HabitController.createHabit);
router.get('/habits', protect, HabitController.getHabits);
router.put('/habits/:id', protect, HabitController.updateHabit);
router.delete('/habits/:id', protect, HabitController.deleteHabit);
router.post('/habits/:id/log', protect, HabitController.logHabit);
router.get('/habit-logs', protect, HabitController.getHabitLogs);

// --- GOALS ---
router.post('/goals', protect, GoalController.createGoal);
router.get('/goals', protect, GoalController.getGoals);
router.put('/goals/:id', protect, GoalController.updateGoal);
router.delete('/goals/:id', protect, GoalController.deleteGoal);

export default router;

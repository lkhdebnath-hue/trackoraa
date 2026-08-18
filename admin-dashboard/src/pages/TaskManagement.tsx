import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, Chip, Avatar, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, List, ListItem,
  ListItemText, OutlinedInput, Alert, CircularProgress, Divider, IconButton, InputAdornment, ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as RejectIcon,
  AssignmentTurnedIn as ApproveIcon,
  ListAlt as ChecklistIcon,
  PriorityHigh as PriorityIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  AccessTime as ClockIcon
} from '@mui/icons-material';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = ['Homework', 'Exam Setup', 'Grades Sync', 'Facility Fix', 'Meeting Request', 'General Admin'];

export const TaskManagement: React.FC = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Collaboration Workspace Dialog State
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabMessages, setCollabMessages] = useState<any[]>([]);
  const [collabChatGroupId, setCollabChatGroupId] = useState<string | null>(null);
  const [collabText, setCollabText] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);

  // Dialog States
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Comment State
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Form States: Create/Edit Task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Homework');
  const [dueDate, setDueDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(60); // minutes
  const [assignees, setAssignees] = useState<string[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [subtasksList, setSubtasksList] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  // Custom Assignment Toast Notification State
  const [assignmentToast, setAssignmentToast] = useState<{ title: string; names: string[] } | null>(null);
  const [saving, setSaving] = useState(false);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t._id === draggedTaskId ? { ...t, status } : t));
    
    try {
      await api.patch(`/tasks/${draggedTaskId}/status`, { status });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to move task.');
      fetchData();
    }
    setDraggedTaskId(null);
  };

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (assignmentToast) {
      const timer = setTimeout(() => {
        setAssignmentToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [assignmentToast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const isAdmin = ['super_admin', 'principal'].includes(user?.role || '');
      const taskEndpoint = isAdmin ? '/tasks' : `/tasks?assignee=${(user as any)?._id || user?.id}`;
      const [tasksRes, usersRes] = await Promise.all([
        api.get(taskEndpoint),
        api.get('/users'),
      ]);
      setTasks(tasksRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch task resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim() || !description.trim() || !category || !dueDate) {
      alert('Please fill out all required fields: Title, Description, Category, and Due Date.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const subtasks = subtasksList.map((s) => ({ title: s, isCompleted: false }));

      await api.post('/tasks', {
        title,
        description,
        priority,
        category,
        dueDate,
        estimatedTime,
        assignees,
        approvalRequired,
        subtasks,
      });

      // Find usernames of assignees for the cool toast message
      const assigneeNames = assignees
        .map((id) => users.find((u) => u._id === id)?.username)
        .filter((name): name is string => !!name);

      setAssignmentToast({
        title,
        names: assigneeNames,
      });

      const message = `Task created successfully and assigned to: ${assigneeNames.length > 0 ? assigneeNames.join(', ') : 'no one'}`;
      setSuccess(message);
      alert(message);
      
      setCreateOpen(false);
      
      // Reset Form fields
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('Homework');
      setDueDate('');
      setEstimatedTime(60);
      setAssignees([]);
      setApprovalRequired(false);
      setSubtasksList([]);
      setNewSubtask('');
      
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to schedule task.';
      setError(errMsg);
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      setError('');
      setSuccess('');
      await api.delete(`/tasks/${id}`);
      setSuccess('Task deleted successfully.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const handleApproveStatus = async (task: any, approve: boolean) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const notes = approve ? 'Approved' : 'Rejected';
      await api.patch(`/tasks/${task._id}/approve`, { approve, notes });
      setSuccess(`Task completion ${approve ? 'approved' : 'revision requested'}.`);
      setDetailOpen(false);
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update task status.');
    } finally {
      setSaving(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    try {
      setPostingComment(true);
      setError('');
      const res = await api.post(`/tasks/${selectedTask._id}/comments`, { text: newComment });
      setSelectedTask({ ...selectedTask, comments: res.data });
      setNewComment('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleUpdateStatus = async (task: any, status: string) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.patch(`/tasks/${task._id}/status`, { status });
      setSuccess(`Task marked as ${status.replace('_', ' ')}.`);
      setDetailOpen(false);
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task status.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, { isCompleted: !currentStatus });
      setSelectedTask(res.data);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subtask.');
    }
  };

  const handleOpenCollab = async (task: any) => {
    try {
      setCollabLoading(true);
      setCollabOpen(true);
      setSelectedTask(task);
      setCollabText('');
      setCollabMessages([]);

      // Fetch task details which returns linked chatGroupId
      const res = await api.get(`/tasks/${task._id}`);
      const chatGroupId = res.data.chatGroupId;
      setCollabChatGroupId(chatGroupId);

      if (chatGroupId) {
        const msgRes = await api.get(`/chat/groups/${chatGroupId}/messages`);
        setCollabMessages(msgRes.data);
      }
    } catch (err) {
      console.error('Failed to load collaboration details:', err);
    } finally {
      setCollabLoading(false);
    }
  };

  const handleSendCollabMessage = async () => {
    if (!collabText.trim() || !collabChatGroupId) return;
    try {
      const res = await api.post(`/chat/groups/${collabChatGroupId}/messages`, {
        content: collabText,
      });
      setCollabMessages((prev) => [...prev, res.data]);
      setCollabText('');
    } catch (err) {
      console.error('Failed to post admin comment:', err);
    }
  };

  // Group tasks by column status
  const getTasksByStatus = (status: string) => {
    return tasks.filter((t) => t.status === status);
  };

  const columns = [
    { title: 'Pending', status: 'pending', color: '#64748b' },
    { title: 'In Progress', status: 'in_progress', color: '#6366f1' },
    { title: 'Needs Review', status: 'needs_review', color: '#f59e0b' },
    { title: 'Completed', status: 'completed', color: '#10b981' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            Task Board
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {['super_admin', 'principal'].includes(user?.role || '') 
              ? 'Schedule tasks, assign coordinates, check progress, and approve completions'
              : 'View your assigned tasks and update your work progress'}
          </Typography>
        </Box>
        {['super_admin', 'principal'].includes(user?.role || '') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Task
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', py: 5, justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {columns.map((col) => {
            const columnTasks = getTasksByStatus(col.status);
            return (
              <Grid item xs={12} md={6} lg={3} key={col.status}>
                <Box
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.status)}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.02)',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    minHeight: '65vh',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {col.title}
                      </Typography>
                    </Box>
                    <Chip label={columnTasks.length} size="small" sx={{ fontWeight: 700, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', color: 'text.secondary' }} />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {columnTasks.map((task, idx) => {
                      const completedSubtasks = task.subtasks?.filter((st: any) => st.isCompleted).length || 0;
                      const totalSubtasks = task.subtasks?.length || 0;
                      const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                      
                      return (
                        <Card
                          draggable
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          key={task._id}
                          onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                          sx={{
                            cursor: 'pointer',
                            animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s forwards`,
                            opacity: 0,
                            transform: 'translateY(10px)',
                            '@keyframes fadeInUp': {
                              to: { opacity: 1, transform: 'translateY(0)' }
                            },
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 16px rgba(0,0,0,0.6)' : '0 8px 16px rgba(0,0,0,0.08)',
                              borderColor: col.color,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                              <Chip
                                label={task.category}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  bgcolor: 'rgba(99, 102, 241, 0.1)',
                                  color: 'primary.main',
                                  border: 'none',
                                }}
                              />
                              {task.priority === 'critical' && (
                                <Chip
                                  label="CRITICAL"
                                  size="small"
                                  color="error"
                                  icon={<PriorityIcon sx={{ fontSize: '12px !important' }} />}
                                  sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.05em' }}
                                />
                              )}
                            </Box>

                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                              {task.title}
                            </Typography>

                            {totalSubtasks > 0 && (
                              <Box sx={{ mt: 2, mb: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Progress</Typography>
                                  <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>{completedSubtasks}/{totalSubtasks}</Typography>
                                </Box>
                                <Box sx={{ width: '100%', height: 4, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                  <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: progress === 100 ? 'secondary.main' : 'primary.main', transition: 'width 0.3s ease-in-out' }} />
                                </Box>
                              </Box>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: totalSubtasks > 0 ? 0 : 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ClockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', flexDirection: 'row-reverse' }}>
                                {task.assignees?.slice(0, 3).map((a: any, i: number) => (
                                  <Tooltip title={a.username} key={a._id}>
                                    <Avatar sx={{ 
                                      width: 24, height: 24, fontSize: '0.7rem', 
                                      border: (theme) => `2px solid ${theme.palette.background.paper}`, 
                                      bgcolor: 'primary.main', color: '#ffffff',
                                      ml: -1,
                                      zIndex: 3 - i
                                    }}>
                                      {a.username.charAt(0).toUpperCase()}
                                    </Avatar>
                                  </Tooltip>
                                ))}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* DIALOG: CREATE TASK */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Schedule and Assign New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField label="Task Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Description" multiline rows={3} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => (
                    <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Due Date & Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Est Time"
                type="number"
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">Minutes</InputAdornment>,
                }}
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(Number(e.target.value))}
              />
            </Grid>
          </Grid>

          <FormControl fullWidth>
            <InputLabel>Assignees</InputLabel>
            <Select
              multiple
              value={assignees}
              onChange={(e) => setAssignees(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Assignees" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const u = users.find((x) => x._id === val);
                    return <Chip key={val} label={u?.username || val} size="small" />;
                  })}
                </Box>
              )}
            >
              {users.map((u) => (
                <MenuItem key={u._id} value={u._id}>{u.username} ({u.role})</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dynamic Subtask Checklist */}
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Subtask Checklist</Typography>
            <List dense sx={{ mb: 1, p: 0 }}>
              {subtasksList.map((st, idx) => (
                <ListItem key={idx} sx={{ bgcolor: 'action.hover', mb: 0.5, borderRadius: 1 }}>
                  <ListItemText primary={st} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small" color="error" onClick={() => setSubtasksList(prev => prev.filter((_, i) => i !== idx))}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {subtasksList.length === 0 && (
                <Typography variant="caption" color="text.secondary">No subtasks added yet.</Typography>
              )}
            </List>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Add a subtask..."
                variant="outlined"
                size="small"
                fullWidth
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtask.trim()) {
                      setSubtasksList(prev => [...prev, newSubtask.trim()]);
                      setNewSubtask('');
                    }
                  }
                }}
              />
              <Button 
                variant="outlined" 
                onClick={() => {
                  if (newSubtask.trim()) {
                    setSubtasksList(prev => [...prev, newSubtask.trim()]);
                    setNewSubtask('');
                  }
                }}
              >
                Add
              </Button>
            </Box>
          </Box>

          <FormControlLabel
            control={<Checkbox checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} />}
            label="Require Manager/Creator Approval upon Completion"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit" disabled={saving}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained" disabled={saving}>
            {saving ? 'Scheduling...' : 'Schedule Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: TASK DETAILS / APPROVALS */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedTask(null); }} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Task Detail</span>
          <Chip label={selectedTask?.status?.toUpperCase()} color="primary" size="small" sx={{ fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedTask && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {selectedTask.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {selectedTask.description}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Creator</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTask.creator?.username}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Est Completion Time</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedTask.estimatedTime} Min</Typography>
                </Grid>
              </Grid>

              {/* Subtask checklist */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChecklistIcon fontSize="small" /> Subtasks Checklist
                  </Typography>
                  <List dense>
                    {selectedTask.subtasks.map((sub: any, idx: number) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <Checkbox 
                          checked={sub.isCompleted} 
                          disabled={!selectedTask.assignees?.some((a: any) => a._id === user?.id || a._id === (user as any)?._id) && !['super_admin', 'principal'].includes(user?.role || '')} 
                          onChange={() => handleToggleSubtask(selectedTask._id, sub._id, sub.isCompleted)}
                        />
                        <ListItemText
                          primary={sub.title}
                          primaryTypographyProps={{
                            style: { textDecoration: sub.isCompleted ? 'line-through' : 'none', color: sub.isCompleted ? 'text.disabled' : 'text.primary' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Attachments */}
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Submitted Attachments
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedTask.attachments.map((file: any, idx: number) => (
                      <Box key={idx} sx={{ p: 1, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2, display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {file.filename}
                        </Typography>
                        <Button size="small" component="a" href={file.url} target="_blank">
                          View File
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Approvals Action Block */}
              {selectedTask.status === 'needs_review' && (['super_admin', 'principal'].includes(user?.role || '') || selectedTask.creator?._id === user?.id || selectedTask.creator?._id === (user as any)?._id) && (
                <Box sx={{ mt: 3, p: 2, border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 3, backgroundColor: 'rgba(245, 158, 11, 0.03)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ApproveIcon /> Completion Review Awaiting
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Assignee has submitted this task for review. Choose to approve completion or request revisions.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleApproveStatus(selectedTask, true)}
                      disabled={saving}
                    >
                      Approve & Complete
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleApproveStatus(selectedTask, false)}
                      disabled={saving}
                    >
                      Request Revisions
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Status Update Block for Assignees */}
              {selectedTask.assignees?.some((a: any) => a._id === user?.id || a._id === (user as any)?._id) && selectedTask.status !== 'completed' && selectedTask.status !== 'needs_review' && (
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  {selectedTask.status === 'pending' && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleUpdateStatus(selectedTask, 'in_progress')}
                      disabled={saving}
                      fullWidth
                    >
                      Start Task
                    </Button>
                  )}
                  {selectedTask.status === 'in_progress' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleUpdateStatus(selectedTask, selectedTask.approvalRequired ? 'needs_review' : 'completed')}
                      disabled={saving}
                      fullWidth
                    >
                      {selectedTask.approvalRequired ? 'Submit for Review' : 'Mark as Completed'}
                    </Button>
                  )}
                </Box>
              )}

              {/* Remarks and Comments Block */}
              <Divider sx={{ my: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Task Remarks & Updates</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                {selectedTask.comments?.map((c: any, idx: number) => (
                  <Box key={idx} sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {c.user?.username || 'Unknown User'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                      {c.text}
                    </Typography>
                  </Box>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No remarks or updates posted yet.
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Post an update to admin or assignees (e.g., 'Will be done in 2 hours')"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={postingComment}
                />
                <Button variant="contained" color="primary" onClick={handlePostComment} disabled={!newComment.trim() || postingComment}>
                  Post
                </Button>
              </Box>

            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {selectedTask && selectedTask.assignees?.length > 1 && (
            <Button
              onClick={() => {
                handleOpenCollab(selectedTask);
                setDetailOpen(false);
              }}
              color="primary"
              variant="contained"
              startIcon={<ChatIcon />}
            >
              Collaboration Workspace
            </Button>
          )}
          <Button onClick={() => { setDetailOpen(false); setSelectedTask(null); }} color="inherit">Close</Button>
          {selectedTask && ['super_admin', 'principal'].includes(user?.role || '') && (
            <Button
              onClick={() => { handleDeleteTask(selectedTask._id); setDetailOpen(false); }}
              color="error"
              startIcon={<DeleteIcon />}
            >
              Delete Task
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DIALOG: COLLABORATION WORKSPACE */}
      <Dialog open={collabOpen} onClose={() => { setCollabOpen(false); }} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>👥 Task Collaboration Workspace: {selectedTask?.title}</span>
          <Chip label={`${selectedTask?.assignees?.length || 0} Collaborators`} color="info" size="small" sx={{ fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {collabLoading ? (
            <Box sx={{ display: 'flex', py: 4, justifyContent: 'center' }}>
              <CircularProgress size={30} />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left Column: Stats & Collaborators */}
              <Grid item xs={12} md={4}>
                <Card sx={{ p: 2, height: '100%', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', border: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                    Collaborators List
                  </Typography>
                  <List dense>
                    {selectedTask?.assignees?.map((u: any) => (
                      <ListItem key={u._id} sx={{ px: 0 }}>
                        <Avatar sx={{ width: 28, height: 28, mr: 1.5, fontSize: 12, bgcolor: '#6366f1' }}>
                          {u.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText
                          primary={u.username}
                          secondary={`${u.role?.toUpperCase()} • ${u.department}`}
                          primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                          secondaryTypographyProps={{ fontSize: '0.725rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ borderColor: 'divider', my: 2 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                    Task Progress Statistics
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      Current Status: <strong>{selectedTask?.status?.toUpperCase()}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Estimated Time: <strong>{selectedTask?.estimatedTime} Minutes</strong>
                    </Typography>
                    <Typography variant="body2">
                      Subtasks checklist: <strong>{selectedTask?.subtasks?.filter((s: any) => s.isCompleted).length} / {selectedTask?.subtasks?.length} Completed</strong>
                    </Typography>
                    <Typography variant="body2">
                      Last Updated: <strong>{new Date(selectedTask?.updatedAt || Date.now()).toLocaleDateString()}</strong>
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Right Column: Chat discussion & files */}
              <Grid item xs={12} md={8}>
                <Card sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column', border: (theme) => `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                    Workspace Chat & Exchanged Files
                  </Typography>
                  <Divider sx={{ borderColor: 'divider', mb: 2 }} />

                  {/* Chat logs list */}
                  <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, pr: 1 }}>
                    {collabMessages.length === 0 ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                        No messages or files shared yet in this workspace.
                      </Typography>
                    ) : (
                      collabMessages.map((msg) => (
                        <Box key={msg._id} sx={{ alignSelf: msg.senderId?._id === user?.id || msg.senderId === user?.id ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: msg.senderId?._id === user?.id || msg.senderId === user?.id ? '#6366f1' : (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: (theme) => msg.senderId?._id === user?.id || msg.senderId === user?.id ? 'none' : `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: msg.senderId?._id === user?.id || msg.senderId === user?.id ? '#a5b4fc' : '#6366f1', display: 'block', mb: 0.5 }}>
                              {msg.senderId?.username || 'User'}
                            </Typography>
                            
                            <Typography variant="body2" sx={{ color: msg.senderId?._id === user?.id || msg.senderId === user?.id ? '#ffffff' : 'text.primary', whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </Typography>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {msg.attachments.map((att: any, idx: number) => (
                                  <Button key={idx} variant="text" size="small" component="a" href={`${api.defaults.baseURL?.replace('/api', '')}${att.url}`} target="_blank" sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0, color: '#38bdf8' }}>
                                    📁 {att.filename}
                                  </Button>
                                ))}
                              </Box>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', display: 'block', textAlign: 'right', mt: 0.25 }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>

                  {/* Comment Composer */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      placeholder="Comment as Administrator..."
                      variant="outlined"
                      size="small"
                      fullWidth
                      value={collabText}
                      onChange={(e) => setCollabText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendCollabMessage(); }}
                    />
                    <Button variant="contained" onClick={handleSendCollabMessage} sx={{ fontWeight: 700 }}>
                      Send
                    </Button>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCollabOpen(false)}>Close Workspace</Button>
        </DialogActions>
      </Dialog>

      {/* Animated Task Assignment Pop Notification */}
      {assignmentToast && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            minWidth: 320,
            maxWidth: 400,
            p: 2.5,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: '2px solid #10b981',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2), 0 0 15px rgba(16, 185, 129, 0.4)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            animation: 'slideInToast 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            '@keyframes slideInToast': {
              '0%': {
                transform: 'translateX(120%) translateY(0) scale(0.9)',
                opacity: 0,
              },
              '70%': {
                transform: 'translateX(-10%) translateY(0) scale(1.02)',
                opacity: 1,
              },
              '100%': {
                transform: 'translateX(0) translateY(0) scale(1)',
                opacity: 1,
              }
            }
          }}
        >
          {/* Animated Success Checkmark Ring */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
              flexShrink: 0,
              animation: 'popSuccessScale 0.6s ease-in-out',
              '@keyframes popSuccessScale': {
                '0%': { transform: 'scale(0)' },
                '50%': { transform: 'scale(1.2)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            <CheckIcon sx={{ fontSize: 24 }} />
          </Box>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', letterSpacing: 1.5, textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              ✨ Task Assigned
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, lineHeight: 1.2 }}>
              {assignmentToast.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
              Assigned to{' '}
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                {assignmentToast.names.length > 0
                  ? assignmentToast.names.join(', ')
                  : 'unassigned'}
              </span>
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setAssignmentToast(null)}
            sx={{
              color: 'text.secondary',
              alignSelf: 'flex-start',
              mt: -0.5,
              mr: -0.5,
              '&:hover': { color: 'error.main' }
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};
export default TaskManagement;

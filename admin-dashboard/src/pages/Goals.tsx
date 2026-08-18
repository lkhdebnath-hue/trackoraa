import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, Button, TextField, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, IconButton, LinearProgress, List, ListItem,
  ListItemText, Checkbox, Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Flag as FlagIcon } from '@mui/icons-material';
import { api } from '../services/api';

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog State
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Career');
  const [targetDate, setTargetDate] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [milestones, setMilestones] = useState<{title: string, isCompleted: boolean}[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (err: any) {
      setError('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/goals', { title, description, category, targetDate, milestones });
      setSuccess('Goal created successfully');
      setOpenCreate(false);
      setTitle('');
      setMilestones([]);
      fetchGoals();
    } catch (err) {
      setError('Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMilestone = async (goal: any, mIdx: number) => {
    try {
      const updatedMilestones = [...goal.milestones];
      updatedMilestones[mIdx].isCompleted = !updatedMilestones[mIdx].isCompleted;
      await api.put(`/goals/${goal._id}`, { milestones: updatedMilestones });
      fetchGoals();
    } catch (err) {
      setError('Failed to update milestone');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/goals/${id}`);
      fetchGoals();
    } catch (err) {
      setError('Failed to delete goal');
    }
    setDeleteId(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Goals
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Set long-term objectives and track your milestones.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          New Goal
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', py: 5, justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {goals.map((goal) => (
            <Grid item xs={12} md={6} key={goal._id}>
              <Card sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FlagIcon sx={{ color: goal.color || '#3b82f6' }} />
                      {goal.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {goal.description || 'No description.'}
                    </Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => setDeleteId(goal._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Progress</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{goal.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={goal.progress} sx={{ height: 8, borderRadius: 4 }} />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Milestones</Typography>
                <List dense disablePadding>
                  {goal.milestones?.map((m: any, idx: number) => (
                    <ListItem key={idx} disablePadding sx={{ mb: 0.5 }}>
                      <Checkbox checked={m.isCompleted} onChange={() => handleToggleMilestone(goal, idx)} size="small" />
                      <ListItemText 
                        primary={m.title} 
                        primaryTypographyProps={{ sx: { textDecoration: m.isCompleted ? 'line-through' : 'none', color: m.isCompleted ? 'text.secondary' : 'text.primary' } }}
                      />
                    </ListItem>
                  ))}
                  {(!goal.milestones || goal.milestones.length === 0) && (
                    <Typography variant="caption" color="text.secondary">No milestones defined.</Typography>
                  )}
                </List>
              </Card>
            </Grid>
          ))}
          {goals.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3 }}>
                <Typography variant="h6" color="text.secondary">No goals created yet. Dream big!</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Goal</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField label="Goal Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Description" multiline rows={2} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                  <MenuItem value="Career">Career</MenuItem>
                  <MenuItem value="Health">Health</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Personal">Personal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Target Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Milestones</Typography>
            <List dense disablePadding>
              {milestones.map((m, idx) => (
                <ListItem key={idx} sx={{ bgcolor: 'action.hover', mb: 0.5, borderRadius: 1 }}>
                  <ListItemText primary={m.title} />
                  <IconButton edge="end" size="small" color="error" onClick={() => setMilestones(prev => prev.filter((_, i) => i !== idx))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              ))}
            </List>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <TextField
                label="Add milestone..."
                size="small"
                fullWidth
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
              />
              <Button variant="outlined" onClick={() => {
                if (newMilestone.trim()) {
                  setMilestones(prev => [...prev, { title: newMilestone.trim(), isCompleted: false }]);
                  setNewMilestone('');
                }
              }}>Add</Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreate(false)} color="inherit" disabled={saving}>Cancel</Button>
          <Button onClick={handleCreateGoal} variant="contained" disabled={saving}>
            {saving ? 'Creating...' : 'Create Goal'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to permanently delete this goal?</DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit">Cancel</Button>
          <Button onClick={() => deleteId && handleDelete(deleteId)} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Goals;

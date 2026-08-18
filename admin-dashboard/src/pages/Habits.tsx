import React, { useEffect, useState } from 'react';
import {
  Box, Card, Typography, Button, TextField, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Timeline as TimelineIcon,
  LocalFireDepartment as FireIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { api } from '../services/api';

export const Habits: React.FC = () => {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog State
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [category, setCategory] = useState('Health');
  const color = '#3b82f6';
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/habits');
      setHabits(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError('Failed to load habits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreateHabit = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    try {
      setSaving(true);
      await api.post('/habits', { title, description, frequency, category, color });
      setSuccess('Habit created successfully');
      setOpenCreate(false);
      setTitle('');
      fetchHabits();
    } catch (err) {
      setError('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  const handleLogHabit = async (id: string, date: string, status: string) => {
    try {
      await api.post(`/habits/${id}/log`, { date, status });
      fetchHabits();
    } catch (err) {
      setError('Failed to log habit');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/habits/${id}`);
      fetchHabits();
    } catch (err) {
      setError('Failed to delete habit');
    }
    setDeleteId(null);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Habits Tracker
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Build good habits, track your streaks, and improve every day.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          New Habit
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', py: 5, justifyContent: 'center' }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {habits.map((habit) => (
            <Grid item xs={12} md={6} lg={4} key={habit._id}>
              <Card sx={{ p: 2, borderRadius: 3, borderTop: `4px solid ${habit.color}`, position: 'relative' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{habit.title}</Typography>
                  <IconButton size="small" color="error" onClick={() => setDeleteId(habit._id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {habit.description || 'No description provided.'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FireIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{habit.currentStreak} Streak</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimelineIcon sx={{ color: '#10b981', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{habit.totalCompletions} Total</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    sx={{ bgcolor: habit.color, '&:hover': { opacity: 0.9, bgcolor: habit.color } }}
                    onClick={() => handleLogHabit(habit._id, today, 'completed')}
                  >
                    Complete Today
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
          {habits.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3 }}>
                <Typography variant="h6" color="text.secondary">No habits created yet. Start building one today!</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Habit</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField label="Habit Name" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Description" multiline rows={2} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select value={frequency} label="Frequency" onChange={(e) => setFrequency(e.target.value)}>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                  <MenuItem value="Health">Health</MenuItem>
                  <MenuItem value="Productivity">Productivity</MenuItem>
                  <MenuItem value="Mindfulness">Mindfulness</MenuItem>
                  <MenuItem value="Learning">Learning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreate(false)} color="inherit" disabled={saving}>Cancel</Button>
          <Button onClick={handleCreateHabit} variant="contained" disabled={saving}>
            {saving ? 'Creating...' : 'Create Habit'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to permanently delete this habit?</DialogContent>
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
export default Habits;

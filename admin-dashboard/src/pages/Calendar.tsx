import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CircularProgress, Alert, Grid, Chip } from '@mui/material';
import { api } from '../services/api';

export const CalendarView: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        // Using existing task endpoint. In a real scenario, this would aggregate tasks, habits, and goals.
        const res = await api.get('/tasks');
        setTasks(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        setError('Failed to load calendar data.');
      } finally {
        setLoading(false);
      }
    };
    fetchCalendarData();
  }, []);

  if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Simple list view grouped by date for MVP Calendar
  const groupedTasks = tasks.reduce((acc: any, task: any) => {
    if (!task.dueDate) return acc;
    const date = new Date(task.dueDate).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Calendar & Agenda</Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>Upcoming tasks and deadlines.</Typography>
      
      <Grid container spacing={3}>
        {Object.keys(groupedTasks).map((date) => (
          <Grid item xs={12} md={6} key={date}>
            <Card sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                {date}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {groupedTasks[date].map((task: any) => (
                  <Box key={task._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{task.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                    <Chip size="small" label={task.status.replace('_', ' ')} color={task.status === 'completed' ? 'success' : 'primary'} />
                  </Box>
                ))}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
export default CalendarView;

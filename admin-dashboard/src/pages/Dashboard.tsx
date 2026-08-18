import React, { useEffect, useState } from 'react';
import { Grid, Card, Typography, Box, CircularProgress, Divider, List, ListItem, ListItemText, LinearProgress, Chip } from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircleOutline as CheckIcon,
  Flag as GoalIcon,
  LocalFireDepartment as FireIcon,
  Timeline as ChartIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    pendingTasks: 0,
    completedTasks: 0,
    habitStreaks: 0,
    activeGoals: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const isAdmin = ['super_admin', 'principal'].includes(user?.role || '');
        const taskEndpoint = isAdmin ? '/tasks' : `/tasks?assignee=${(user as any)?._id || user?.id}`;
        
        const [tasksRes, habitsRes, goalsRes, announcementsRes] = await Promise.all([
          api.get(taskEndpoint),
          api.get('/habits'),
          api.get('/goals'),
          api.get('/announcements')
        ]);

        const tasksData = tasksRes.data;
        const habitsData = habitsRes.data;
        const goalsData = goalsRes.data;

        setTasks(tasksData);
        setHabits(habitsData);
        setGoals(goalsData);
        setAnnouncements(announcementsRes.data);

        const pending = tasksData.filter((t: any) => t.status !== 'completed').length;
        const completed = tasksData.filter((t: any) => t.status === 'completed').length;
        const streaks = habitsData.reduce((acc: number, h: any) => acc + (h.currentStreak || 0), 0);
        const activeG = goalsData.filter((g: any) => g.status !== 'completed').length;

        let adminStats = {};
        if (isAdmin) {
          const usersRes = await api.get('/users');
          const users = usersRes.data;
          adminStats = {
            totalUsers: users.length,
            activeUsers: users.filter((u: any) => u.status === 'active').length,
          };
        }

        setMetrics({
          pendingTasks: pending,
          completedTasks: completed,
          habitStreaks: streaks,
          activeGoals: activeG,
          ...adminStats,
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const lineChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Productivity Score',
        data: [40, 65, 50, 80, 90, 45, 60],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.dueDate && t.dueDate.startsWith(today) && t.status !== 'completed');

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', letterSpacing: '-0.02em' }}>
          Welcome back, {user?.username}!
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Here is your daily productivity overview.
        </Typography>
      </Box>

      {/* METRICS ROW */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', mr: 2 }}>
              <TaskIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{metrics.pendingTasks}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Pending Tasks</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', mr: 2 }}>
              <CheckIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{metrics.completedTasks}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Completed Tasks</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', mr: 2 }}>
              <FireIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{metrics.habitStreaks}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Total Habit Streaks</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', mr: 2 }}>
              <GoalIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{metrics.activeGoals}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Active Goals</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ADMIN OVERVIEW */}
      {['super_admin', 'principal'].includes(user?.role || '') && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Admin System Overview</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(99, 102, 241, 0.03)', boxShadow: 'none' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{(metrics as any).totalUsers || 0}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Total Registered Users</Typography>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(16, 185, 129, 0.03)', boxShadow: 'none' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>{(metrics as any).activeUsers || 0}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Active Users</Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      <Grid container spacing={4}>
        {/* LEFT COLUMN */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <ChartIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Productivity Trend</Typography>
            </Box>
            <Box sx={{ height: 300 }}>
              <Line data={lineChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </Box>
          </Card>

          <Card sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Goals Progress</Typography>
            {goals.slice(0, 3).map((goal) => (
              <Box key={goal._id} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{goal.title}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: goal.color }}>{goal.progress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={goal.progress} sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: goal.color || 'primary.main' } }} />
              </Box>
            ))}
            {goals.length === 0 && (
              <Typography variant="body2" color="text.secondary">No active goals. Set some goals to track progress!</Typography>
            )}
          </Card>
        </Grid>

        {/* RIGHT COLUMN */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, borderRadius: 4, mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            
            {/* ANNOUNCEMENTS SECTION */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CampaignIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Recent Announcements</Typography>
            </Box>
            <List disablePadding>
              {announcements.slice(0, 3).map((ann, i) => (
                <React.Fragment key={ann._id}>
                  <ListItem disablePadding sx={{ py: 1.5, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{ann.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ann.content}
                    </Typography>
                  </ListItem>
                  {i < Math.min(announcements.length, 3) - 1 && <Divider />}
                </React.Fragment>
              ))}
              {announcements.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No active announcements.
                </Typography>
              )}
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Today's Tasks</Typography>
            <List disablePadding>
              {todaysTasks.map((task, i) => (
                <React.Fragment key={task._id}>
                  <ListItem disablePadding sx={{ py: 1.5 }}>
                    <ListItemText
                      primary={task.title}
                      secondary={`Due: ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    <Chip size="small" label={task.priority} color={task.priority === 'critical' ? 'error' : 'primary'} sx={{ height: 20, fontSize: '0.65rem' }} />
                  </ListItem>
                  {i < todaysTasks.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {todaysTasks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No tasks due today. Enjoy your day!
                </Typography>
              )}
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Daily Habits</Typography>
            <List disablePadding>
              {habits.slice(0, 5).map((habit, i) => (
                <React.Fragment key={habit._id}>
                  <ListItem disablePadding sx={{ py: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: habit.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{habit.title}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FireIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{habit.currentStreak}</Typography>
                    </Box>
                  </ListItem>
                  {i < habits.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {habits.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No habits set up. Start building one!
                </Typography>
              )}
            </List>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default Dashboard;

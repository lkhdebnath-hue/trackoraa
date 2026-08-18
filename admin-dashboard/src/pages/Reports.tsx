import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Button, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Assessment as ReportsIcon
} from '@mui/icons-material';
import { api } from '../services/api';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['pending', 'accepted', 'in_progress', 'paused', 'completed', 'rejected', 'needs_review'];

export const Reports: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  // Task Reports Form States
  const [taskPriority, setTaskPriority] = useState('');
  const [taskStatus, setTaskStatus] = useState('');

  // Attendance Reports Form States
  const [attendUser, setAttendUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchUsersList = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to load users for report selection:', err);
      }
    };
    fetchUsersList();
  }, []);

  const handleExportTasks = (format: 'pdf' | 'excel') => {
    let query = `format=${format}`;
    if (taskPriority) query += `&priority=${taskPriority}`;
    if (taskStatus) query += `&status=${taskStatus}`;

    // Trigger direct browser stream download
    window.open(`/api/reports/tasks?${query}`, '_blank');
  };

  const handleExportAttendance = (format: 'pdf' | 'excel') => {
    let query = `format=${format}`;
    if (attendUser) query += `&userId=${attendUser}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;

    window.open(`/api/reports/attendance?${query}`, '_blank');
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReportsIcon fontSize="large" color="primary" /> Report Center
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Generate, filter, and export performance reports or clock-in records as PDF and Excel spreadsheets
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Task Board Reports Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            animation: 'fadeInUp 0.4s ease-out forwards',
            opacity: 0,
            transform: 'translateY(10px)',
            '@keyframes fadeInUp': {
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                Task Performance Logs
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                Filter tasks based on active properties and download structural reports.
              </Typography>
 
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, mb: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority Filter</InputLabel>
                  <Select value={taskPriority} label="Priority Filter" onChange={(e) => setTaskPriority(e.target.value)}>
                    <MenuItem value=""><em>All Priorities</em></MenuItem>
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>{p.toUpperCase()}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
 
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select value={taskStatus} label="Status Filter" onChange={(e) => setTaskStatus(e.target.value)}>
                    <MenuItem value=""><em>All Statuses</em></MenuItem>
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
 
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  color="primary"
                  startIcon={<PdfIcon />}
                  onClick={() => handleExportTasks('pdf')}
                  sx={{ py: 1.5, fontWeight: 700 }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  color="secondary"
                  startIcon={<ExcelIcon />}
                  onClick={() => handleExportTasks('excel')}
                  sx={{ py: 1.5, fontWeight: 700 }}
                >
                  Export Excel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
 
        {/* Attendance Reports Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            animation: 'fadeInUp 0.4s ease-out 0.1s forwards',
            opacity: 0,
            transform: 'translateY(10px)',
          }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                Attendance & GPS Records
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                Generate geofenced logs and clock-in history files for audit reviews.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, mb: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Select Individual User</InputLabel>
                  <Select value={attendUser} label="Select Individual User" onChange={(e) => setAttendUser(e.target.value)}>
                    <MenuItem value=""><em>All Roster</em></MenuItem>
                    {users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>{u.username} ({u.employeeId})</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Start Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="End Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  fullWidth
                  color="primary"
                  startIcon={<PdfIcon />}
                  onClick={() => handleExportAttendance('pdf')}
                >
                  Export PDF
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  color="secondary"
                  startIcon={<ExcelIcon />}
                  onClick={() => handleExportAttendance('excel')}
                >
                  Export Excel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
export default Reports;

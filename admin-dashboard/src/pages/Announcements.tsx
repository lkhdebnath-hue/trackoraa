import React, { useEffect, useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Chip,
  Alert, CircularProgress, Tooltip, Avatar
} from '@mui/material';
import { Delete as DeleteIcon, Campaign as CampaignIcon } from '@mui/icons-material';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const Announcements: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'principal'].includes(user?.role || '');

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog State
  const [openCreate, setOpenCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete State
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setTitle('');
    setContent('');
    setTargetRole('all');
    setError('');
    setSuccess('');
    setOpenCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    try {
      setSubmitLoading(true);
      setError('');
      setSuccess('');
      const res = await api.post('/announcements', {
        title,
        content,
        targetRoles: [targetRole],
      });
      setSuccess('Announcement created and broadcasted successfully!');
      setOpenCreate(false);
      // Prepend to list
      setAnnouncements((prev) => [res.data, ...prev]);
    } catch (err: any) {
      console.error('Failed to create announcement:', err);
      setError(err.response?.data?.message || 'Failed to create announcement.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setSelectedId(id);
    setOpenDelete(true);
  };

  const handleDelete = async () => {
    try {
      setError('');
      setSuccess('');
      await api.delete(`/announcements/${selectedId}`);
      setSuccess('Announcement deleted successfully.');
      setAnnouncements((prev) => prev.filter((ann) => ann._id !== selectedId));
      setOpenDelete(false);
    } catch (err: any) {
      console.error('Failed to delete announcement:', err);
      setError(err.response?.data?.message || 'Failed to delete announcement.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            Announcements & Broadcasts
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Publish alerts, notices, and communications instantly to the mobile app
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" color="primary" onClick={handleOpenCreate} startIcon={<CampaignIcon />} sx={{ fontWeight: 700 }}>
            Create Announcement
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Content</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Target Audience</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Publish Date</TableCell>
                {isAdmin && <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
                {announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>No announcements published yet.</Typography>
                        <Typography variant="body2">Click Create Announcement to broadcast a notice.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((ann, idx) => (
                    <TableRow 
                      key={ann._id}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        animation: `fadeInUp 0.3s ease-out ${idx * 0.05}s forwards`,
                        opacity: 0,
                        transform: 'translateY(10px)',
                        '@keyframes fadeInUp': {
                          to: { opacity: 1, transform: 'translateY(0)' }
                        },
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                        }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.9rem' }}>{ann.title}</TableCell>
                      <TableCell sx={{ maxWidth: 300, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        <Tooltip title={ann.content} placement="top">
                          <span>{ann.content}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {(ann.targetRoles || []).map((role: string) => (
                          <Chip
                            key={role}
                            label={role.toUpperCase()}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              letterSpacing: '0.05em',
                              border: 'none',
                              bgcolor: role === 'all' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: role === 'all' ? '#38bdf8' : '#10b981',
                              mr: 0.5 
                            }}
                          />
                        ))}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}>
                            {ann.author?.username?.charAt(0).toUpperCase() || 'A'}
                          </Avatar>
                          {ann.author?.username || 'Admin'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.85rem' }}>
                        {new Date(ann.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          <Tooltip title="Delete Announcement">
                            <IconButton onClick={() => handleOpenDelete(ann._id)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Modal Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>📢 Create New Announcement</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
          <TextField
            label="Announcement Title"
            variant="outlined"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Compose Notice Message"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel id="role-select-label">Target Audience Role</InputLabel>
            <Select
              labelId="role-select-label"
              value={targetRole}
              label="Target Audience Role"
              onChange={(e) => setTargetRole(e.target.value)}
            >
              <MenuItem value="all">All Audiences (Public Broadcast)</MenuItem>
              <MenuItem value="teacher">Teachers Only</MenuItem>
              <MenuItem value="student">Students Only</MenuItem>
              <MenuItem value="coordinator">Coordinators Only</MenuItem>
              <MenuItem value="staff">Staff Only</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" color="primary" disabled={submitLoading}>
            {submitLoading ? 'Broadcasting...' : 'Publish Announcement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to permanently delete this announcement? This will remove it from the mobile app feeds.
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Announcements;

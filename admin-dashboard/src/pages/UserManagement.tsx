import React, { useEffect, useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Chip, Alert, CircularProgress, Tooltip, OutlinedInput, Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Block as SuspendIcon,
  CheckCircleOutline as ActivateIcon,
  Delete as DeleteIcon,
  VpnKey as ResetIcon,
  CloudUpload as ImportIcon,
  CloudDownload as ExportIcon
} from '@mui/icons-material';
import { api } from '../services/api';

const ROLES = ['super_admin', 'principal', 'teacher', 'coordinator', 'staff', 'student'];
const DEPARTMENTS = ['Administration', 'Science', 'Mathematics', 'Humanities', 'Sports', 'IT Support'];
const AVAILABLE_PERMISSIONS = ['all', 'create_tasks', 'edit_tasks', 'delete_tasks', 'view_reports', 'clock_in_out'];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering / Search States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal Dialog States
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Form States: Create User
  const [employeeId, setEmployeeId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('Science');
  const [userPermissions, setUserPermissions] = useState<string[]>(['clock_in_out']);

  // Form States: Reset Password
  const [newPassword, setNewPassword] = useState('');

  // Form States: Bulk Import
  const [csvText, setCsvText] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/users?search=${search}&role=${roleFilter}`);
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleCreateUser = async () => {
    try {
      setError('');
      setSuccess('');
      await api.post('/users', {
        employeeId,
        username,
        password,
        role,
        department,
        permissions: userPermissions,
      });

      setSuccess('User account registered successfully.');
      setCreateOpen(false);
      // Reset Fields
      setEmployeeId('');
      setUsername('');
      setPassword('');
      setRole('student');
      setDepartment('Science');
      setUserPermissions(['clock_in_out']);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register user.');
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      setError('');
      setSuccess('');
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      await api.patch(`/users/${user._id}/status`, { status: nextStatus });
      setSuccess(`User has been ${nextStatus === 'active' ? 'activated' : 'suspended'} successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      await api.delete(`/users/${id}`);
      setSuccess('User record deleted successfully.');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
    setDeleteUserId(null);
  };

  const handleResetPassword = async () => {
    try {
      setError('');
      setSuccess('');
      if (!selectedUser) return;
      await api.patch(`/users/${selectedUser._id}/reset-password`, { newPassword });
      setSuccess(`Password for ${selectedUser.username} has been updated.`);
      setResetOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset user password.');
    }
  };

  const handleBulkImport = async () => {
    try {
      setError('');
      setSuccess('');
      const response = await api.post('/users/bulk-import', { csvData: csvText });
      setSuccess(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        setError(`Import warnings: ${response.data.errors.join('; ')}`);
      }
      setImportOpen(false);
      setCsvText('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import users.');
    }
  };

  const handleExportUsers = () => {
    // Navigate browser to download CSV file directly
    window.open('/api/users/export', '_blank');
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            User Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Provision credentials, manage authorization access, and review statuses
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExportUsers}>
            Export
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Create User
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{success}</Alert>}

      {/* Filter and Search Bar */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search ID or Username"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 240 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Role Filter</InputLabel>
            <Select value={roleFilter} label="Role Filter" onChange={(e) => setRoleFilter(e.target.value)}>
              <MenuItem value=""><em>All Roles</em></MenuItem>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Users Table */}
      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', p: 5, justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ borderBottom: (theme) => `2px solid ${theme.palette.divider}` }}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>ID / Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>No user accounts found matching parameters.</Typography>
                        <Typography variant="body2">Try adjusting your filters or search query.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow 
                      key={user._id} 
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
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{user.employeeId}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}>
                            {user.username.charAt(0).toUpperCase()}
                          </Avatar>
                          {user.username}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                            bgcolor: (theme) => user.role === 'super_admin' ? 'rgba(99, 102, 241, 0.1)' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'),
                            color: (theme) => user.role === 'super_admin' ? 'primary.main' : theme.palette.text.secondary,
                            border: 'none',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{user.department}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status.toUpperCase()}
                          size="small"
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                            bgcolor: user.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: user.status === 'active' ? '#10b981' : '#ef4444',
                            border: 'none',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title={user.status === 'active' ? 'Suspend User' : 'Activate User'}>
                            <IconButton onClick={() => handleToggleStatus(user)} sx={{ color: user.status === 'active' ? 'warning.main' : 'success.main', '&:hover': { bgcolor: user.status === 'active' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' } }}>
                              {user.status === 'active' ? <SuspendIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Reset Password">
                            <IconButton onClick={() => { setSelectedUser(user); setResetOpen(true); }} sx={{ color: 'info.main', '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)' } }}>
                              <ResetIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Account">
                            <IconButton onClick={() => setDeleteUserId(user._id)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* DIALOG: CREATE USER */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Register New User Account</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField
            label="Employee or Student ID"
            fullWidth
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
          <TextField
            label="Username"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Department</InputLabel>
            <Select value={department} label="Department" onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Permissions</InputLabel>
            <Select
              multiple
              value={userPermissions}
              onChange={(e) => setUserPermissions(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Permissions" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <MenuItem key={perm} value={perm}>{perm}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">Register Account</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: PASSWORD RESET */}
      <Dialog open={resetOpen} onClose={() => { setResetOpen(false); setSelectedUser(null); }} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Password: {selectedUser?.username}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="New Passcode"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setResetOpen(false); setSelectedUser(null); }} color="inherit">Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained" color="info">Update Password</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: BULK CSV IMPORT */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 700 }}>Bulk Import Roster via CSV</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Paste comma-separated user records. Required format (skip header or keep exactly this header):
            <br />
            <code>EmployeeID,Username,Password,Role,Department,Permissions(separated by ;)</code>
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder={`EmployeeID,Username,Password,Role,Department,Permissions
STD101,john_doe,john123,student,Science,clock_in_out
TCH202,sarah_key,sarah456,teacher,Mathematics,create_tasks;edit_tasks;clock_in_out`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setImportOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleBulkImport} variant="contained" startIcon={<ImportIcon />}>Import Records</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: CONFIRM DELETE */}
      <Dialog open={!!deleteUserId} onClose={() => setDeleteUserId(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>Are you sure you want to permanently delete this user account?</DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteUserId(null)} color="inherit">Cancel</Button>
          <Button onClick={() => deleteUserId && handleDeleteUser(deleteUserId)} variant="contained" color="error">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default UserManagement;

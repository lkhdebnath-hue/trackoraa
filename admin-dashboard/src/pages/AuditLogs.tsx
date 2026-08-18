import React, { useEffect, useState } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, FormControl,
  InputLabel, Select, MenuItem, CircularProgress, Alert, Chip
} from '@mui/material';
import { Shield as SecurityIcon } from '@mui/icons-material';
import { api } from '../services/api';

const ACTIONS = [
  'USER_LOGIN', 'USER_LOGIN_BIOMETRIC', 'BIOMETRIC_REGISTER', 'USER_CREATE', 'USER_SUSPEND', 'USER_ACTIVE',
  'USER_PASSWORD_RESET', 'USER_DELETE', 'USER_BULK_IMPORT', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE'
];

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/logs?search=${search}&action=${actionFilter}`);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SecurityIcon fontSize="large" color="primary" /> Security Audit Logs
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Immutable logs tracking administrator operations, credentials provisioning, and database edits
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Filter and Search */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search details or IP Address"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 240 }}
          />

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Action Filter</InputLabel>
            <Select value={actionFilter} label="Action Filter" onChange={(e) => setActionFilter(e.target.value)}>
              <MenuItem value=""><em>All Actions</em></MenuItem>
              {ACTIONS.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <TableContainer>
          {loading ? (
            <Box sx={{ display: 'flex', p: 5, justifyContent: 'center' }}><CircularProgress /></Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ borderBottom: (theme) => `2px solid ${theme.palette.divider}` }}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Operator</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Action ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>No action trails recorded.</Typography>
                        <Typography variant="body2">Try adjusting your filters.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, idx) => (
                    <TableRow 
                      key={log._id} 
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
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.85rem' }}>
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {log.actorId?.username || 'System'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, bgcolor: 'rgba(0,0,0,0.05)', px: 0.8, py: 0.2, borderRadius: 1 }}>
                            ID: {log.actorId?.employeeId || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            border: 'none',
                            bgcolor: (theme) => log.action.includes('DELETE') ? 'rgba(239, 68, 68, 0.1)' : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'),
                            color: (theme) => log.action.includes('DELETE') ? '#ef4444' : theme.palette.text.secondary,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>{log.details}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{log.ipAddress}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Card>
    </Box>
  );
};
export default AuditLogs;

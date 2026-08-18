import { createTheme, ThemeOptions } from '@mui/material/styles';

export const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          primary: {
            main: '#5e6ad2', // Linear-like indigo
            light: '#7c86e0',
            dark: '#4753b8',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#22c55e', // Notion-style green
            light: '#4ade80',
            dark: '#16a34a',
            contrastText: '#ffffff',
          },
          error: {
            main: '#f87171',
            light: '#fca5a5',
            dark: '#dc2626',
          },
          warning: {
            main: '#fbbf24',
            light: '#fcd34d',
            dark: '#d97706',
          },
          success: {
            main: '#34d399',
            light: '#6ee7b7',
            dark: '#059669',
          },
          info: {
            main: '#38bdf8',
            light: '#7dd3fc',
            dark: '#0284c7',
          },
          background: {
            default: '#131418', // Deep rich obsidian (Notion/Linear dark)
            paper: '#1a1b20',   // Premium dark slate
          },
          text: {
            primary: '#f4f4f5',
            secondary: '#a1a1aa',
            disabled: '#71717a',
          },
          divider: 'rgba(255, 255, 255, 0.08)',
        }
      : {
          primary: {
            main: '#4338ca', // Premium Indigo
            light: '#6366f1',
            dark: '#312e81',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#059669', // Emerald
            light: '#10b981',
            dark: '#065f46',
            contrastText: '#ffffff',
          },
          error: {
            main: '#ef4444',
            light: '#f87171',
            dark: '#b91c1c',
          },
          warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#b45309',
          },
          success: {
            main: '#10b981',
            light: '#34d399',
            dark: '#059669',
          },
          info: {
            main: '#0ea5e9',
            light: '#38bdf8',
            dark: '#0369a1',
          },
          background: {
            default: '#fcfcfc', // Clean off-white
            paper: '#ffffff',   // White card
          },
          text: {
            primary: '#18181b', // Charcoal
            secondary: '#52525b',
            disabled: '#a1a1aa',
          },
          divider: 'rgba(0, 0, 0, 0.08)',
        }),
  },
  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", "Roboto", sans-serif',
    h1: { fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.03em', lineHeight: 1.2 },
    h2: { fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.02em', lineHeight: 1.3 },
    h3: { fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em', lineHeight: 1.3 },
    h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.01em', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1.25rem', letterSpacing: '-0.01em', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '1.125rem', letterSpacing: '0em', lineHeight: 1.4 },
    subtitle1: { fontWeight: 600, fontSize: '1rem', letterSpacing: '0.01em', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', letterSpacing: '0.01em', lineHeight: 1.5 },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.6, letterSpacing: '0em' },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5, letterSpacing: '0em' },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.01em' },
    caption: { fontWeight: 500, fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.02em' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)',
            },
          },
          transition: 'background-color 0.3s ease, color 0.3s ease',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '#root': {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          animation: 'fadeIn 0.5s ease-out forwards',
          '@keyframes fadeIn': {
            '0%': { opacity: 0, transform: 'translateY(10px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' }
          }
        }
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        contained: {
          boxShadow: mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 1px 2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)',
          '&:hover': {
            boxShadow: mode === 'dark' ? '0 4px 12px rgba(94,106,210,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 4px 12px rgba(67,56,202,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
            transform: 'translateY(-1px)',
          }
        },
        outlined: {
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          background: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
          '&:hover': {
            background: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 16,
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          background: mode === 'dark' ? 'rgba(26, 27, 32, 0.6)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: mode === 'dark'
            ? '0 4px 20px -10px rgba(0, 0, 0, 0.5)'
            : '0 4px 20px -10px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: mode === 'dark'
              ? '0 8px 30px -10px rgba(0, 0, 0, 0.6)'
              : '0 8px 30px -10px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)' },
        elevation2: { boxShadow: mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.06)' },
        elevation3: { boxShadow: mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.08)' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
          transition: 'all 0.2s ease-in-out',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: '1px',
            borderColor: mode === 'dark' ? '#5e6ad2' : '#4338ca',
          },
          '&.Mui-focused': {
            boxShadow: mode === 'dark' ? '0 0 0 3px rgba(94, 106, 210, 0.15)' : '0 0 0 3px rgba(67, 56, 202, 0.15)',
          }
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: mode === 'dark' ? '#a1a1aa' : '#71717a',
          backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(244, 244, 245, 0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          background: mode === 'dark' ? '#1a1b20' : '#ffffff',
          boxShadow: mode === 'dark' ? '0 32px 64px -16px rgba(0, 0, 0, 0.7)' : '0 32px 64px -16px rgba(0, 0, 0, 0.1)',
          backgroundImage: mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0))' : 'none',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 500,
        },
        standardSuccess: {
          backgroundColor: mode === 'dark' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: mode === 'dark' ? '#6ee7b7' : '#059669',
          border: mode === 'dark' ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
        },
        standardError: {
          backgroundColor: mode === 'dark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: mode === 'dark' ? '#fca5a5' : '#dc2626',
          border: mode === 'dark' ? '1px solid rgba(248, 113, 113, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
        },
      }
    }
  },
});

export const lightTheme = createTheme(getThemeOptions('light'));
export const darkTheme = createTheme(getThemeOptions('dark'));
export default darkTheme;

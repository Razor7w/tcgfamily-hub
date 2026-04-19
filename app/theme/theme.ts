import { createTheme, ThemeOptions } from '@mui/material/styles'

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily:
      'var(--font-outfit), ui-sans-serif, system-ui, -apple-system, sans-serif',
    h4: { letterSpacing: '-0.03em', fontWeight: 700 },
    h5: { letterSpacing: '-0.025em', fontWeight: 700 },
    h6: { letterSpacing: '-0.02em', fontWeight: 700 },
    subtitle1: { letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
    overline: { letterSpacing: '0.08em', fontWeight: 600 }
  },
  shape: {
    borderRadius: 14
  }
}

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#0f766e',
      light: '#14b8a6',
      dark: '#115e59',
      contrastText: '#fafafa'
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#fafafa'
    },
    success: {
      main: '#15803d',
      light: '#22c55e',
      dark: '#14532d'
    },
    info: {
      main: '#0369a1',
      light: '#0ea5e9',
      dark: '#0c4a6e'
    },
    warning: {
      main: '#c2410c',
      light: '#ea580c',
      dark: '#9a3412'
    },
    error: {
      main: '#b91c1c',
      light: '#ef4444',
      dark: '#991b1b'
    },
    background: {
      default: '#f4f4f5',
      paper: '#ffffff'
    },
    text: {
      primary: '#18181b',
      secondary: '#52525b'
    },
    divider: 'rgba(24, 24, 27, 0.1)',
    action: {
      hover: 'rgba(24, 24, 27, 0.06)',
      selected: 'rgba(15, 118, 110, 0.08)'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 11,
          transition:
            'background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        contained: {
          boxShadow: '0 1px 2px rgba(24, 24, 27, 0.06)',
          '&:active': {
            transform: 'translateY(1px) scale(0.99)'
          }
        },
        outlined: {
          '&:active': {
            transform: 'translateY(1px) scale(0.99)'
          }
        }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: '1px solid rgba(24, 24, 27, 0.08)',
          boxShadow: '0 24px 48px -12px rgba(24, 24, 27, 0.18)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600
        }
      }
    }
  }
})

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#2dd4bf',
      light: '#5eead4',
      dark: '#14b8a6',
      contrastText: '#042f2e'
    },
    secondary: {
      main: '#94a3b8',
      light: '#cbd5e1',
      dark: '#64748b',
      contrastText: '#0f172a'
    },
    success: {
      main: '#4ade80',
      light: '#86efac',
      dark: '#22c55e'
    },
    info: {
      main: '#38bdf8',
      light: '#7dd3fc',
      dark: '#0ea5e9'
    },
    warning: {
      main: '#fb923c',
      light: '#fdba74',
      dark: '#ea580c'
    },
    error: {
      main: '#f87171',
      light: '#fca5a5',
      dark: '#ef4444'
    },
    background: {
      default: '#0c0e12',
      paper: '#14171f'
    },
    text: {
      primary: '#f4f4f5',
      secondary: '#a1a1aa'
    },
    divider: 'rgba(244, 244, 245, 0.12)',
    action: {
      hover: 'rgba(244, 244, 245, 0.06)',
      selected: 'rgba(45, 212, 191, 0.12)'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 11,
          transition:
            'background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
          '&:active': {
            transform: 'translateY(1px) scale(0.99)'
          }
        },
        outlined: {
          '&:active': {
            transform: 'translateY(1px) scale(0.99)'
          }
        }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: '1px solid rgba(244, 244, 245, 0.1)',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.55)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600
        }
      }
    }
  }
})

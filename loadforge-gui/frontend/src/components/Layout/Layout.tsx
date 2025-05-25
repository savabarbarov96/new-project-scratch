import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Container,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useAppStore from '@stores/appStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { theme: appTheme, setThemeMode } = useAppStore();

  const handleThemeToggle = () => {
    setThemeMode(appTheme.mode === 'light' ? 'dark' : 'light');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LoadForge
          </Typography>
          
          <IconButton color="inherit" onClick={handleThemeToggle}>
            {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Container
        component="main"
        maxWidth="xl"
        sx={{
          flexGrow: 1,
          py: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default Layout; 
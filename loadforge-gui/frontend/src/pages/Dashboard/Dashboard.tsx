import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import {
  PlayArrow,
  Assessment,
  Schedule,
  CloudUpload,
} from '@mui/icons-material';
import SystemStatus from '@/components/SystemStatus';

const Dashboard: React.FC = () => {
  const quickActions = [
    {
      title: 'Create Test',
      description: 'Create a new load test specification',
      icon: <PlayArrow color="primary" sx={{ fontSize: 40 }} />,
      path: '/tests/create',
    },
    {
      title: 'View Results',
      description: 'Analyze test results and metrics',
      icon: <Assessment color="primary" sx={{ fontSize: 40 }} />,
      path: '/results',
    },
    {
      title: 'Scheduled Tests',
      description: 'Manage scheduled test runs',
      icon: <Schedule color="primary" sx={{ fontSize: 40 }} />,
      path: '/scheduled',
    },
    {
      title: 'File Manager',
      description: 'Upload and manage test files',
      icon: <CloudUpload color="primary" sx={{ fontSize: 40 }} />,
      path: '/files',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to LoadForge
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Your comprehensive load testing management platform. Create, execute, and analyze load tests with ease.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {quickActions.map((action, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" component="h2" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No recent test runs. Create your first test to get started!
            </Typography>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <SystemStatus />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 
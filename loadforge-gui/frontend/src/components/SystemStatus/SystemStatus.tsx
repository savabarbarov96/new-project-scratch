import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Warning,
  Storage,
  Cable,
  CloudUpload,
} from '@mui/icons-material';
import { useSystemStatus } from '@/hooks/useSystemStatus';

const StatusIndicator = ({ 
  status, 
  label, 
  icon 
}: { 
  status: 'connected' | 'disconnected' | 'available' | 'unavailable';
  label: string;
  icon: React.ReactNode;
}) => {
  const isConnected = status === 'connected' || status === 'available';
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ mr: 1 }}>
        {label}:
      </Typography>
      <Chip
        size="small"
        icon={isConnected ? <CheckCircle /> : <Error />}
        label={isConnected ? 'Connected' : 'Disconnected'}
        color={isConnected ? 'success' : 'error'}
        variant="outlined"
      />
    </Box>
  );
};

const SystemStatus = () => {
  const { data: systemStatus, isLoading, error } = useSystemStatus();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Checking system status...
        </Typography>
      </Box>
    );
  }

  if (error || !systemStatus) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          <Typography variant="body2" color="warning.main">
            Unable to fetch system status
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Status
      </Typography>
      
      <StatusIndicator
        status={systemStatus.backend}
        label="Backend API"
        icon={<Cable fontSize="small" />}
      />
      
      <StatusIndicator
        status={systemStatus.database}
        label="Database"
        icon={<Storage fontSize="small" />}
      />
      
      <StatusIndicator
        status={systemStatus.websocket}
        label="WebSocket"
        icon={<Cable fontSize="small" />}
      />
      
      <StatusIndicator
        status={systemStatus.fileStorage}
        label="File Storage"
        icon={<CloudUpload fontSize="small" />}
      />
    </Box>
  );
};

export default SystemStatus; 
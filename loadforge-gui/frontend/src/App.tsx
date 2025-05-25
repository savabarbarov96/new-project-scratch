import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { getTheme } from '@/theme';
import useAppStore from '@stores/appStore';
import Layout from '@components/Layout';
import Dashboard from '@pages/Dashboard';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const theme = useAppStore((state) => state.theme);
  const muiTheme = getTheme(theme.mode);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Layout>
          <Dashboard />
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: muiTheme.palette.background.paper,
              color: muiTheme.palette.text.primary,
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

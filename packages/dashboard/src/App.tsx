import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import WorkflowList from './components/WorkflowList';
import WorkflowDetails from './components/WorkflowDetails';
import SubmitWorkflow from './components/SubmitWorkflow';
import HealthStatus from './components/HealthStatus';
import GlobalNetwork from './components/GlobalNetwork';

import Login from './components/Login';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<WorkflowList />} />
                  <Route path="/execution/:id" element={<WorkflowDetails />} />
                  <Route path="/submit" element={<SubmitWorkflow />} />
                  <Route path="/health" element={<HealthStatus />} />
                  <Route path="/network" element={<GlobalNetwork />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

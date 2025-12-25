import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import WorkflowList from './components/WorkflowList';
import WorkflowDetails from './components/WorkflowDetails';
import SubmitWorkflow from './components/SubmitWorkflow';
import HealthStatus from './components/HealthStatus';

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
                  <Route path="/health" element={<div className="p-8 max-w-2xl"><h1 className="text-3xl font-bold mb-8 text-[var(--text-main)]">System Health</h1><HealthStatus /></div>} />
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

import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { AppShell } from "../components/layout/AppShell";
import LoginPage from "../pages/Login";
import SignupPage from "../pages/Signup";
import DashboardPage from "../pages/Dashboard";
import ClientsPage from "../pages/Clients";
import WorkOrdersPage from "../pages/WorkOrders";
import VesselsPage from "../pages/Vessels";
import EquipmentPage from "../pages/Equipment";
import WorkOrderDetailsPage from "../pages/WorkOrderDetails";
import DashboardOps from "../pages/DashboardOps";
import WorkOrdersKanbanPage from "../pages/WorkOrdersKanban";
import BudgetsPage from "../pages/Budgets";
import BudgetDetailsPage from "../pages/BudgetDetails";
//import ReportsPage from "../pages/Reports";
//import ReportEditorPage from "../pages/ReportEditor";
import ReportDetailsPage from "../pages/ReportDetailsPage";
import ReportsListPage from "../pages/ReportsListPage";
import FinancePage from "../pages/FinancePage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <DashboardOps/> },
      { path: "work-orders", element: <WorkOrdersPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "vessels", element: <VesselsPage /> },
      { path: "equipment", element: <EquipmentPage /> },
      { path: "work-orders/:id", element: <WorkOrderDetailsPage /> },
      { path: "dashboard-admin", element: <DashboardPage /> },
      { path: "work-orders-kanban", element: <WorkOrdersKanbanPage /> },
      { path: "budgets", element: <BudgetsPage /> },
      { path: "budgets/:id", element: <BudgetDetailsPage /> },
      { path: "reports", element: <ReportsListPage /> },      
      { path: "reports/new", element: <ReportDetailsPage /> },
      { path: "reports/:workOrderId", element: <ReportDetailsPage /> },     
      { path: "finance" , element: <FinancePage />}   
      //<Route path="/app/reports/:workOrderId" element={<ReportDetailsPage />} />          
    ],
  },
]);

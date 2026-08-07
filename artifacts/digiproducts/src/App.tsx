import { AppLayout } from "@/components/layout/AppLayout";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import Learn from "@/pages/Learn";
import LearnPlayer from "@/pages/LearnPlayer";
import LearnComplete from "@/pages/LearnComplete";
import Products from "@/pages/Products";
// Placeholders for others
import CreateEbook from "@/pages/CreateEbook"; 
import AdminUsers from "@/pages/AdminUsers"; 
import ProductDetail from "@/pages/ProductDetail";
import Account from "@/pages/Account";
import AcceptInvite from "@/pages/AcceptInvite";
import NotFound from "@/pages/not-found";

import CreateLeadMagnet from "@/pages/CreateLeadMagnet";

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        {/* Public Marketing Routes */}
        <Route path="/">
          <LandingPage />
        </Route>

        {/* Auth Routes */}
        <Route path="/login">
          <ProtectedRoute requireAuth={false}>
            <Login />
          </ProtectedRoute>
        </Route>
        <Route path="/forgot-password">
          <ProtectedRoute requireAuth={false}>
            <ForgotPassword />
          </ProtectedRoute>
        </Route>
        <Route path="/invite/:token">
          <ProtectedRoute requireAuth={false}>
            <AcceptInvite />
          </ProtectedRoute>
        </Route>

        {/* Protected App Routes - Onboarding Gate checked internally */}
        <Route path="/learn">
          <ProtectedRoute>
            <Learn />
          </ProtectedRoute>
        </Route>
        <Route path="/learn/complete">
          <ProtectedRoute>
            <LearnComplete />
          </ProtectedRoute>
        </Route>
        <Route path="/learn/:lessonId">
          <ProtectedRoute>
            <LearnPlayer />
          </ProtectedRoute>
        </Route>
        <Route path="/account">
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        </Route>

        {/* Main App */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/products">
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        </Route>
        <Route path="/products/:productId">
          <ProtectedRoute>
            <ProductDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/create/ebook">
          <ProtectedRoute>
            <CreateEbook />
          </ProtectedRoute>
        </Route>
        <Route path="/create/lead-magnet">
          <ProtectedRoute>
            <CreateLeadMagnet />
          </ProtectedRoute>
        </Route>
        
        {/* Admin */}
        <Route path="/admin/users">
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

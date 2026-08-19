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
import AdminCurriculum from "@/pages/AdminCurriculum";
import AdminCredits from "@/pages/AdminCredits";
import AdminBrandKit from "@/pages/AdminBrandKit";
import AdminSettings from "@/pages/AdminSettings";
import AdminAudit from "@/pages/AdminAudit";
import ProductDetail from "@/pages/ProductDetail";
import Account from "@/pages/Account";
import AcceptInvite from "@/pages/AcceptInvite";
import NotFound from "@/pages/not-found";
import SalesPage from "@/pages/SalesPage";

import CreateLeadMagnet from "@/pages/CreateLeadMagnet";
import LeadMagnets from "@/pages/LeadMagnets";
import PromoteEbook from "@/pages/PromoteEbook";
import ReviewQueue from "@/pages/ReviewQueue";
import SellProducts from "@/pages/SellProducts";
import SellProductSetup from "@/pages/SellProductSetup";
import SellDiscounts from "@/pages/SellDiscounts";
import LinkInBio from "@/pages/LinkInBio";
import PublicBio from "@/pages/PublicBio";

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        {/* Public Marketing Routes */}
        <Route path="/">
          <LandingPage />
        </Route>
        <Route path="/p/:slug">
          <SalesPage />
        </Route>
        <Route path="/b/:slug">
          <PublicBio />
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
        <Route path="/lead-magnets">
          <ProtectedRoute>
            <LeadMagnets />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/lead-magnets">
          <ProtectedRoute>
            <LeadMagnets />
          </ProtectedRoute>
        </Route>
        <Route path="/create/promote-ebook">
          <ProtectedRoute>
            <PromoteEbook />
          </ProtectedRoute>
        </Route>
        
        {/* Sell */}
        <Route path="/sell/products">
          <ProtectedRoute>
            <SellProducts />
          </ProtectedRoute>
        </Route>
        <Route path="/sell/products/:productId/setup">
          <ProtectedRoute>
            <SellProductSetup />
          </ProtectedRoute>
        </Route>
        <Route path="/sell/discounts">
          <ProtectedRoute>
            <SellDiscounts />
          </ProtectedRoute>
        </Route>
        <Route path="/sell/bio">
          <ProtectedRoute>
            <LinkInBio />
          </ProtectedRoute>
        </Route>

        {/* Team */}
        <Route path="/review">
          <ProtectedRoute>
            <ReviewQueue />
          </ProtectedRoute>
        </Route>

        {/* Admin */}
        <Route path="/admin/users">
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/curriculum">
          <ProtectedRoute adminOnly>
            <AdminCurriculum />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/credits">
          <ProtectedRoute>
            <AdminCredits />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/brand">
          <ProtectedRoute>
            <AdminBrandKit />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings">
          <ProtectedRoute>
            <AdminSettings />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/audit">
          <ProtectedRoute>
            <AdminAudit />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

import { AppLayout } from "@/components/layout/AppLayout";

export default function AdminUsers() {
  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-display font-bold text-ink-900 mb-4">Team Management</h1>
        <p className="text-ink-500 mb-8">Invite team members and manage roles.</p>
        <div className="bg-white border border-ink-200 rounded-2xl p-8 text-center text-ink-500">
          Admin functionality will be implemented in the next phase.
        </div>
      </div>
    </AppLayout>
  );
}

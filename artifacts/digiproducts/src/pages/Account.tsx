import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetMe, useUpdateAccount } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, Shield, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Account() {
  const { data: user } = useGetMe();
  const updateAccount = useUpdateAccount();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleUpdateProfile = () => {
    if (fullName === user?.fullName) return;
    updateAccount.mutate({ data: { fullName } }, {
      onSuccess: () => {
        toast({ title: "Profile updated" });
      }
    });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) return;
    updateAccount.mutate({ data: { currentPassword, newPassword } }, {
      onSuccess: () => {
        toast({ title: "Password updated successfully" });
        setCurrentPassword("");
        setNewPassword("");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto w-full p-8">
        <h1 className="text-3xl font-display font-bold text-ink-900 mb-8">Account Settings</h1>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-soft bg-gradient-to-b from-brand-900 to-brand-800 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-bold mb-4 border border-white/20 backdrop-blur">
                  {user?.fullName.charAt(0)}
                </div>
                <h2 className="font-display font-bold text-xl mb-1 text-background">{user?.fullName}</h2>
                <p className="text-brand-200 text-sm mb-4">{user?.email}</p>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-lime-400">
                  <Shield className="w-4 h-4" /> {user?.role}
                </div>
              </CardContent>
            </Card>

            <Card className="border-ink-100 shadow-sm">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-500 mb-1">Available Credits</p>
                  <p className="text-2xl font-bold text-gold-500">{user?.creditsBalance}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gold-50 flex items-center justify-center">
                  <span className="text-gold-500 text-lg">✨</span>
                </div>
              </CardContent>
            </Card>
            
            {user?.onboardingComplete && (
              <Card className="border-lime-200 bg-lime-50 shadow-sm">
                <CardContent className="p-5 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-lime-600 shrink-0" />
                  <p className="text-sm font-medium text-lime-800">Onboarding completed</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border-ink-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-ink-400" /> Profile Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={user?.email} disabled className="bg-ink-50 text-ink-500 h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      className="h-11 rounded-xl" 
                    />
                  </div>
                  <div className="pt-2">
                    <Button 
                      onClick={handleUpdateProfile} 
                      disabled={fullName === user?.fullName || updateAccount.isPending}
                      className="bg-brand-500 hover:bg-brand-600 rounded-xl"
                    >
                      Save Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-ink-100 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-ink-400" /> Change Password
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="h-11 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="h-11 rounded-xl" 
                    />
                  </div>
                  <div className="pt-2">
                    <Button 
                      onClick={handleUpdatePassword}
                      disabled={!currentPassword || !newPassword || updateAccount.isPending}
                      className="bg-ink-900 hover:bg-ink-800 rounded-xl"
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetInvite, useAcceptInvite, getGetInviteQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function AcceptInvite() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: invite, isLoading, isError } = useGetInvite(token || '', {
    query: { enabled: !!token, retry: false, queryKey: getGetInviteQueryKey(token || '') }
  });
  
  const acceptInvite = useAcceptInvite();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      password: "",
    },
  });

  if (isLoading) {
    return (
      <AuthLayout title="Verifying invitation...">
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </AuthLayout>
    );
  }

  if (isError || !invite || !invite.valid) {
    return (
      <AuthLayout title="Invalid Invitation" subtitle="This invitation link is invalid or has expired.">
        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertTitle>Cannot accept invite</AlertTitle>
          <AlertDescription>
            {invite?.invalidReason || "Please ask your administrator to send a new invitation."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/login")} className="w-full mt-6 bg-white text-ink-900 border border-ink-200 hover:bg-ink-50 rounded-xl">
          Return to login
        </Button>
      </AuthLayout>
    );
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) return;
    acceptInvite.mutate({ token, data: values }, {
      onSuccess: async () => {
        toast({ title: "Account created", description: "Welcome to PokiPoki!" });
        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation("/learn");
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message || "Please try again.",
        });
      }
    });
  }

  return (
    <AuthLayout 
      title="Join your team" 
      subtitle="Complete your profile to access the production studio."
    >
      <div className="mb-6 p-4 rounded-xl bg-brand-50 border border-brand-100 flex flex-col gap-1">
        <p className="text-sm font-medium text-brand-900">Invited as <span className="capitalize">{invite.role}</span></p>
        <p className="text-xs text-brand-600">{invite.email}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="h-11 rounded-xl bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Create Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="h-11 rounded-xl bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base shadow-soft transition-all"
            disabled={acceptInvite.isPending}
          >
            {acceptInvite.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create account"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}

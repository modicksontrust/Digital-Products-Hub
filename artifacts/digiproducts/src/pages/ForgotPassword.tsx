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
import { useForgotPassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPassword() {
  const { toast } = useToast();
  const forgotPassword = useForgotPassword();
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    forgotPassword.mutate({ data: values }, {
      onSuccess: (data) => {
        setSuccess(true);
        if (data.resetUrl) {
          setDevResetUrl(data.resetUrl);
        }
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Request failed",
          description: error.message || "Failed to send reset email.",
        });
      }
    });
  }

  if (success) {
    return (
      <AuthLayout 
        title="Check your email" 
        subtitle="We've sent password reset instructions to your inbox."
      >
        <div className="space-y-6">
          <div className="p-6 bg-brand-50 border border-brand-100 rounded-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-ink-700 font-medium mb-1">Link sent to</p>
            <p className="text-ink-900 font-semibold">{form.getValues("email")}</p>
          </div>
          
          {devResetUrl && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                <span className="font-semibold block mb-1">Development Mode:</span>
                Since email isn't configured, use this link to reset your password: <br/>
                <a href={devResetUrl} className="text-brand-600 underline break-all">{devResetUrl}</a>
              </AlertDescription>
            </Alert>
          )}

          <Link href="/login" className="flex items-center justify-center w-full gap-2 h-11 rounded-xl border border-ink-200 hover:bg-ink-50 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset password" 
      subtitle="Enter your email and we'll send you instructions to reset your password."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@company.com" {...field} className="h-11 rounded-xl bg-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base shadow-soft transition-all"
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
            </Button>
            <Link href="/login" className="flex items-center justify-center w-full gap-2 h-11 rounded-xl border border-ink-200 hover:bg-ink-50 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </form>
      </Form>
    </AuthLayout>
  );
}

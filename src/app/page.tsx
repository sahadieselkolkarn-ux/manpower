"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword, AuthError } from "firebase/auth";
import { useAuth as useFirebaseAuth } from "@/firebase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Icons } from "@/components/icons";
import FullPageLoader from "@/components/full-page-loader";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const auth = useFirebaseAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Firebase auth is not initialized.",
        });
        setLoading(false);
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "Success",
        description: "Logged in successfully. Redirecting...",
      });
      // The useEffect will handle the redirection.
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }
  
  if (authLoading || user) {
    return <FullPageLoader />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Icons.logo className="h-12 w-auto" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome Back</CardTitle>
          <CardDescription>Sign in to your ManpowerFlow account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm">
          <p>
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

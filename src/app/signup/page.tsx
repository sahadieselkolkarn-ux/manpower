"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword, AuthError } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth as useFirebaseAuth, useFirestore } from "@/firebase";

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
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
});

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
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

    if (!auth || !db) {
        toast({
            variant: "destructive",
            title: "Signup Failed",
            description: "Firebase is not initialized.",
        });
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      // Create user profile in Firestore with new structure
      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: values.email,
        displayName: values.displayName,
        isAdmin: false, // Default to not admin
        roleIds: [], // Start with no roles
        status: "ACTIVE",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Account Created",
        description: "Your account has been created. Please contact an admin to assign your roles.",
      });
      // The useEffect will handle redirection.

    } catch (error) {
      const authError = error as AuthError;
      console.error("Signup failed:", authError);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
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
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join ManpowerFlow today</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm">
          <p>
            Already have an account?{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


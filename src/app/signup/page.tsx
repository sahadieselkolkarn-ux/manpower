'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  firstName: z.string().min(1, 'กรุณากรอกชื่อจริง'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().optional(),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
  confirmPassword: z.string(),
  acceptSms: z.boolean().optional(),
  acceptAnalytics: z.boolean().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
});

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptSms: false,
      acceptAnalytics: false,
    },
  });

  const handleSignUp = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Update Auth profile
      const displayName = `${values.firstName} ${values.lastName}`;
      await updateProfile(user, { displayName });

      // 3. Create user document in Firestore with bootstrap admin check
      const securityRef = doc(db, 'settings', 'security');
      const securitySnap = await getDoc(securityRef);
      let isBootstrapAdmin = false;
      if (securitySnap.exists()) {
        const securityData = securitySnap.data();
        const allowlist = securityData?.bootstrap?.adminEmailsAllowlist || [];
        if (securityData?.bootstrap?.isOpen === true && values.email && allowlist.includes(values.email)) {
          isBootstrapAdmin = true;
        }
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: values.email,
        displayName: displayName,
        phone: values.phone,
        isAdmin: isBootstrapAdmin,
        roleIds: [],
        roleCodes: isBootstrapAdmin ? ['ADMIN'] : [],
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'สมัครสมาชิกสำเร็จ!',
        description: 'กำลังนำคุณไปยังหน้า Dashboard',
      });
      
      router.push('/dashboard');

    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: err.message || 'ไม่สามารถสมัครสมาชิกได้',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>สร้างบัญชีใหม่</CardTitle>
          <CardDescription>กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งานระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-6">
              
              <section>
                <h3 className="text-lg font-medium mb-2">ข้อมูลส่วนบุคคล</h3>
                <Separator className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>ชื่อจริง*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>นามสกุล*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>อีเมล*</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>เบอร์โทรศัพท์</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </section>

               <section>
                <h3 className="text-lg font-medium mb-2">Account Security</h3>
                <Separator className="mb-4" />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสผ่าน*</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormDescription>ต้องมีอย่างน้อย 8 ตัวอักษร</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                   <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ยืนยันรหัสผ่าน*</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

               <section>
                <h3 className="text-lg font-medium mb-2">ข้อมูลเพิ่มเติมที่จำเป็น</h3>
                <Separator className="mb-4" />
                <div className="space-y-4">
                    <FormField control={form.control} name="acceptSms" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>รับการแจ้งเตือนผ่าน SMS</FormLabel></FormItem>
                    )} />
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <Checkbox checked disabled /><FormLabel>อนุญาตให้ใช้ Cookies ที่จำเป็น</FormLabel>
                    </FormItem>
                    <FormField control={form.control} name="acceptAnalytics" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>อนุญาตให้ใช้ Cookies วิเคราะห์ข้อมูลและโฆษณา</FormLabel></FormItem>
                    )} />
                </div>
              </section>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

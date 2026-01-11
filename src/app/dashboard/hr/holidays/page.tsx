
'use client';

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { canManageHrSettings } from '@/lib/authz';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, PlusCircle, Trash2 } from 'lucide-react';
import FullPageLoader from '@/components/full-page-loader';
import { DATE_FORMAT } from '@/lib/utils';


export default function HolidayListPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [dates, setDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateInput, setDateInput] = useState<string>('');

  const canManage = canManageHrSettings(userProfile);

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const docRef = doc(db, 'hrSettings', 'publicHolidayCalendar');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const dateStrings: string[] = data.dates || [];
        const dateObjects = dateStrings.map(d => new Date(d)).filter(isValid);
        setDates(dateObjects);
      } else {
        setDates([]);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching holiday calendar:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db]);
  
  const handleDateSelect = (date: Date | undefined) => {
      if (!date) return;
      setSelectedDate(date);
      setDateInput(format(date, DATE_FORMAT));
  }

  const handleAddDate = async () => {
    if (!db || !dateInput || !canManage) return;

    const newDate = parse(dateInput, DATE_FORMAT, new Date());
    if (!isValid(newDate)) {
      toast({ variant: 'destructive', title: 'Invalid Date', description: `Please use the format ${DATE_FORMAT}.` });
      return;
    }

    const newDateISO = format(newDate, 'yyyy-MM-dd');
    const currentDatesISO = dates.map(d => format(d, 'yyyy-MM-dd'));

    if (currentDatesISO.includes(newDateISO)) {
      toast({ variant: 'default', title: 'Date Exists', description: 'This date is already in the calendar.' });
      return;
    }

    const updatedDates = [...currentDatesISO, newDateISO].sort();

    try {
      await updateDoc(doc(db, 'hrSettings', 'publicHolidayCalendar'), {
        dates: updatedDates,
        updatedAt: new Date(),
        updatedBy: userProfile?.uid
      }, { merge: true });
      toast({ title: 'Success', description: 'Holiday added.' });
      setDateInput('');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add holiday.' });
    }
  };
  
   const handleRemoveDate = async (dateToRemove: Date) => {
    if (!db || !canManage) return;
    
    const dateToRemoveISO = format(dateToRemove, 'yyyy-MM-dd');
    const updatedDates = dates
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(d => d !== dateToRemoveISO)
      .sort();
      
     try {
      await updateDoc(doc(db, 'hrSettings', 'publicHolidayCalendar'), {
        dates: updatedDates,
        updatedAt: new Date(),
        updatedBy: userProfile?.uid
      });
      toast({ title: 'Success', description: 'Holiday removed.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove holiday.' });
    }
  };


  if (authLoading) return <FullPageLoader />;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Public Holiday Calendar</h1>
          <p className="text-muted-foreground">Manage the company-wide public holiday calendar for payroll calculation.</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Holiday List</CardTitle>
                <CardDescription>All official company and public holidays for the current scope.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                ) : dates.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {dates.map((date, index) => (
                             <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                <span>{format(date, 'dd MMM yyyy')}</span>
                                {canManage && (
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveDate(date)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-10">No holidays have been added yet.</p>
                )}
            </CardContent>
        </Card>
        
        {canManage && (
            <Card>
                <CardHeader>
                    <CardTitle>Add Holiday</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        className="rounded-md border"
                        disabled={!canManage}
                    />
                     <div className="flex items-center gap-2">
                        <Input 
                            value={dateInput}
                            onChange={(e) => setDateInput(e.target.value)}
                            placeholder={DATE_FORMAT}
                        />
                        <Button onClick={handleAddDate}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

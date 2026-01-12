'use client';

import React, { useState } from 'react';
import {
  collection,
  getDocs,
  query,
  runTransaction,
  doc,
  writeBatch,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert, Search, Play, FileWarning, CheckCircle } from 'lucide-react';
import { allocateCode } from '@/lib/master-data/code-allocator';

type EntityType = 'certificateTypes' | 'officePositions' | 'manpowerPositions';
type Prefix = 'CT' | 'OP' | 'MP';

interface ScanResult {
  totalDocs: number;
  missingCodeCount: number;
  invalidFormatCount: number;
  missingUniqueIndexCount: number;
  maxSeqFound: number;
  samples: { id: string; name: string; code?: string; issue: string }[];
}

const initialScanResult: ScanResult = {
  totalDocs: 0,
  missingCodeCount: 0,
  invalidFormatCount: 0,
  missingUniqueIndexCount: 0,
  maxSeqFound: 0,
  samples: [],
};

export default function MasterCodesCleanupPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const [certResults, setCertResults] = useState<ScanResult>(initialScanResult);
  const [officePosResults, setOfficePosResults] = useState<ScanResult>(initialScanResult);
  const [manpowerPosResults, setManpowerPosResults] = useState<ScanResult>(initialScanResult);
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const handleScan = async () => {
    if (!db) return;
    setIsScanning(true);
    setExecutionLog(['Starting scan...']);

    const scanEntity = async (entity: EntityType, prefix: Prefix): Promise<ScanResult> => {
      const results: ScanResult = { ...initialScanResult, samples: [] };
      const regex = new RegExp(`^${prefix}-\\d{4}$`);
      const docsSnap = await getDocs(collection(db, entity));
      results.totalDocs = docsSnap.size;

      const uniqueDocsSnap = await getDocs(query(collection(db, 'unique'), where('type', '==', `${entity}Code`)));
      const existingUniqueCodes = new Set(uniqueDocsSnap.docs.map(d => d.data().value));
      
      let maxSeq = 0;

      for (const doc of docsSnap.docs) {
        const data = doc.data();
        const code = data.code as string | undefined;

        if (!code) {
          results.missingCodeCount++;
          if (results.samples.length < 10) results.samples.push({ id: doc.id, name: data.name, code, issue: 'Missing Code' });
        } else {
          if (regex.test(code)) {
            const seq = parseInt(code.split('-')[1], 10);
            if (seq > maxSeq) maxSeq = seq;
            if (!existingUniqueCodes.has(code)) {
              results.missingUniqueIndexCount++;
              if (results.samples.length < 10) results.samples.push({ id: doc.id, name: data.name, code, issue: 'Missing Unique Index' });
            }
          } else {
            results.invalidFormatCount++;
            if (results.samples.length < 10) results.samples.push({ id: doc.id, name: data.name, code, issue: 'Invalid Format' });
          }
        }
      }
      results.maxSeqFound = maxSeq;
      return results;
    };

    setCertResults(await scanEntity('certificateTypes', 'CT'));
    setOfficePosResults(await scanEntity('officePositions', 'OP'));
    setManpowerPosResults(await scanEntity('manpowerPositions', 'MP'));

    setIsScanning(false);
    setExecutionLog(prev => [...prev, 'Scan complete.']);
  };

  const handleExecute = async () => {
     if (!db || !userProfile || confirmText !== 'MIGRATE_MASTER_CODES') return;
     setIsExecuting(true);
     setExecutionLog(['Execution started. This may take a moment...']);

     const migrateEntity = async (entity: EntityType, prefix: Prefix) => {
        const log = (msg: string) => setExecutionLog(prev => [...prev, `[${prefix}] ${msg}`]);
        
        log('Fetching all documents...');
        const docsSnap = await getDocs(collection(db, entity));
        const uniqueDocsSnap = await getDocs(query(collection(db, 'unique'), where('type', '==', `${entity}Code`)));
        const existingUniqueCodes = new Set(uniqueDocsSnap.docs.map(d => d.data().value));
        const regex = new RegExp(`^${prefix}-\\d{4}$`);
        
        let maxSeq = 0;
        docsSnap.docs.forEach(doc => {
          const code = doc.data().code as string | undefined;
          if (code && regex.test(code)) {
              const seq = parseInt(code.split('-')[1], 10);
              if (seq > maxSeq) maxSeq = seq;
          }
        });
        log(`Found max sequence: ${maxSeq}`);

        // Step 1 & 2: Fix missing codes and indexes
        const docsWithoutCode = docsSnap.docs.filter(d => !d.data().code);
        if (docsWithoutCode.length > 0) {
          log(`Found ${docsWithoutCode.length} documents missing codes. Allocating new codes...`);
          for (const docToFix of docsWithoutCode) {
            try {
              await runTransaction(db, async (transaction) => {
                const { code: newCode } = await allocateCode(transaction, db, entity, prefix);
                transaction.update(docToFix.ref, { code: newCode });
              });
              log(` -> Assigned ${newCode} to ${docToFix.id}`);
            } catch (e: any) {
              log(` !! ERROR assigning code to ${docToFix.id}: ${e.message}`);
            }
          }
        } else {
            log('No documents missing codes.');
        }

        const docsWithCode = docsSnap.docs.filter(d => d.data().code && regex.test(d.data().code));
        const missingIndexBatch = writeBatch(db);
        let missingIndexCount = 0;
        for (const docWithCode of docsWithCode) {
            const code = docWithCode.data().code;
            if (!existingUniqueCodes.has(code)) {
                missingIndexCount++;
                const uniqueRef = doc(db, 'unique', `${entity}Code__${code}`);
                missingIndexBatch.set(uniqueRef, { type: `${entity}Code`, value: code, entityId: docWithCode.id });
            }
        }
        if (missingIndexCount > 0) {
            log(`Found ${missingIndexCount} missing unique indexes. Committing batch...`);
            await missingIndexBatch.commit();
        } else {
            log('No missing unique indexes.');
        }
        
        // Step 3: Update counter
        log('Verifying counter...');
        const finalMaxSeq = Math.max(...docsSnap.docs.map(d => parseInt(d.data().code?.split('-')[1] || '0', 10)).filter(n => !isNaN(n)));
        const counterRef = doc(db, 'counters', `${entity}Codes`);
        await setDoc(counterRef, { next: finalMaxSeq + 1 }, { merge: true });
        log(`Counter updated to ${finalMaxSeq + 1}.`);

        log('Migration for this entity complete.');
     };
     
     await migrateEntity('certificateTypes', 'CT');
     await migrateEntity('officePositions', 'OP');
     await migrateEntity('manpowerPositions', 'MP');

     setIsExecuting(false);
     setExecutionLog(prev => [...prev, 'All tasks finished. Please run Scan again to verify.']);
  };


  if (authLoading) return <FullPageLoader />;
  if (!userProfile?.isAdmin) {
    return (
      <div className="flex-1 p-8">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this tool.</p></CardContent>
        </Card>
      </div>
    );
  }

  const renderResultsCard = (title: string, result: ScanResult) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Total Docs: {result.totalDocs}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2"><FileWarning className={result.missingCodeCount > 0 ? "text-destructive": "text-muted-foreground"}/> Missing Code: <span className="font-bold">{result.missingCodeCount}</span></div>
            <div className="flex items-center gap-2"><FileWarning className={result.invalidFormatCount > 0 ? "text-destructive": "text-muted-foreground"}/> Invalid Format: <span className="font-bold">{result.invalidFormatCount}</span></div>
            <div className="flex items-center gap-2"><FileWarning className={result.missingUniqueIndexCount > 0 ? "text-destructive": "text-muted-foreground"}/> Missing Index: <span className="font-bold">{result.missingUniqueIndexCount}</span></div>
            <div className="flex items-center gap-2"><CheckCircle className="text-green-600"/> Max Sequence: <span className="font-bold">{result.maxSeqFound}</span></div>
        </div>
        {result.samples.length > 0 && (
            <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Issue</TableHead></TableRow></TableHeader>
                <TableBody>
                    {result.samples.map(s => (
                        <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">{s.id}</TableCell>
                            <TableCell>{s.name}</TableCell>
                            <TableCell>{s.code || 'N/A'}</TableCell>
                            <TableCell><Badge variant="destructive">{s.issue}</Badge></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Master Data Code Migration Tool</h1>
          <p className="text-muted-foreground">One-time tool to backfill codes for master data.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>1. Scan (Dry-Run)</CardTitle>
          <CardDescription>Analyze the current state of master data without making any changes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleScan} disabled={isScanning || isExecuting}>
            <Search className="mr-2" />
            {isScanning ? 'Scanning...' : 'Scan Data'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {renderResultsCard('Certificate Types', certResults)}
        {renderResultsCard('Office Positions', officePosResults)}
        {renderResultsCard('Manpower Positions', manpowerPosResults)}
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>2. Execute Migration</CardTitle>
          <CardDescription>This will modify data in Firestore. Type <code className="font-mono bg-muted p-1 rounded">MIGRATE_MASTER_CODES</code> to confirm.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
            <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type here to confirm..."
                disabled={isExecuting}
            />
            <Button 
                onClick={handleExecute} 
                disabled={isExecuting || isScanning || confirmText !== 'MIGRATE_MASTER_CODES'}
                variant="destructive"
            >
                <Play className="mr-2" />
                {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Execution Log</CardTitle></CardHeader>
        <CardContent>
            <pre className="bg-muted text-xs p-4 rounded-md h-48 overflow-y-auto">
                {executionLog.join('\n')}
            </pre>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Client } from '@/types/client';
import { type ContractWithClient } from '@/types/contract';
import { type ProjectWithContract } from '@/types/project';
import { type Wave, type WaveWithProject } from '@/types/wave';
import { Skeleton } from '../ui/skeleton';
import { useEffectOnce } from 'react-use';

export interface WaveSelectorData {
    client: Client;
    contract: ContractWithClient;
    project: ProjectWithContract;
    wave: Wave & { id: string };
    routeParams: {
        clientId: string;
        contractId: string;
        projectId: string;
        waveId: string;
    }
}

interface WaveSelectorProps {
    onWaveSelected: (wave: Wave & { id: string }, data: WaveSelectorData) => void;
}

export default function WaveSelector({ onWaveSelected }: WaveSelectorProps) {
    const db = useFirestore();

    const [selectedWaveId, setSelectedWaveId] = useState<string>('');
    const [allWaves, setAllWaves] = useState<(WaveWithProject & {path: string})[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffectOnce(() => {
        const fetchAllWaves = async () => {
            if (!db) return;
            setIsLoading(true);
            try {
                const waveSnapshot = await getDocs(collectionGroup(db, 'waves'));
                const wavesList = waveSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const path = doc.ref.path;
                    const segments = path.split('/');
                    const clientId = segments[1];
                    const contractId = segments[3];
                    const projectId = segments[5];
                    
                    return {
                        id: doc.id,
                        path: doc.ref.path,
                        clientId,
                        contractId,
                        projectId,
                        ...data
                    } as WaveWithProject & {path: string};
                });
                setAllWaves(wavesList);
            } catch (error) {
                console.error("Error fetching all waves: ", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllWaves();
    });

    useEffect(() => {
        const fetchDetailsAndCallback = async () => {
            if (!db || !selectedWaveId) return;

            const selectedWave = allWaves.find(w => w.id === selectedWaveId);
            if (!selectedWave) return;

            try {
                 // Fetch all parent data based on the path
                const clientRef = doc(db, 'clients', selectedWave.clientId);
                const contractRef = doc(db, 'clients', selectedWave.clientId, 'contracts', selectedWave.contractId);
                const projectRef = doc(db, 'clients', selectedWave.clientId, 'contracts', selectedWave.contractId, 'projects', selectedWave.projectId);

                const [clientSnap, contractSnap, projectSnap] = await Promise.all([
                    getDoc(clientRef),
                    getDoc(contractRef),
                    getDoc(projectRef)
                ]);

                if (clientSnap.exists() && contractSnap.exists() && projectSnap.exists()) {
                    const clientData = { id: clientSnap.id, ...clientSnap.data() } as Client;
                    const contractData = { id: contractSnap.id, ...contractSnap.data(), clientId: clientData.id, clientName: clientData.name } as ContractWithClient;
                    const projectData = { id: projectSnap.id, ...projectSnap.data(), contractId: contractData.id, contractName: contractData.name, clientId: clientData.id, clientName: clientData.name } as ProjectWithContract;

                    const selectorData: WaveSelectorData = {
                        client: clientData,
                        contract: contractData,
                        project: projectData,
                        wave: selectedWave,
                        routeParams: {
                            clientId: selectedWave.clientId,
                            contractId: selectedWave.contractId,
                            projectId: selectedWave.projectId,
                            waveId: selectedWave.id
                        }
                    };
                    onWaveSelected(selectedWave, selectorData);
                } else {
                     console.error("Could not find all parent documents for the selected wave.");
                }
            } catch (error) {
                console.error("Error fetching parent details for wave:", error);
            }
        };

        fetchDetailsAndCallback();
    }, [selectedWaveId, allWaves, db, onWaveSelected]);

    if (isLoading) {
        return <Skeleton className="h-10 w-full" />;
    }

    return (
        <div className="max-w-sm">
             <Select value={selectedWaveId} onValueChange={setSelectedWaveId}>
                <SelectTrigger><SelectValue placeholder="Select a Wave by Code..." /></SelectTrigger>
                <SelectContent>
                    {allWaves.length > 0 ? allWaves.map(wave => (
                        <SelectItem key={wave.id} value={wave.id}>{wave.waveCode}</SelectItem>
                    )) : (
                        <SelectItem value="none" disabled>No waves found.</SelectItem>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

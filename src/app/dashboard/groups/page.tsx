
'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import { Group } from "@/lib/types";
import { ref } from "firebase/database";
import { Plus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { CreateGroupDialog } from "@/components/groups/create-group-dialog";

export default function GroupsPage() {
    const { user: authUser } = useUser();
    const db = useDatabase();

    const groupsQuery = useMemo(() => {
        if (!db) return null;
        return ref(db, 'groups');
    }, [db]);

    const { data: groups, loading } = useList<Group>(groupsQuery);


    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-xl font-bold">Groups</h1>
                <CreateGroupDialog>
                    <Button>
                        <Plus className="mr-2"/>
                        Create Group
                    </Button>
                </CreateGroupDialog>
            </div>
            
            <div className="p-4 space-y-4">
                {loading ? <p>Loading groups...</p> : groups.length > 0 ? (
                    groups.map(group => (
                        <Link href={`/dashboard/groups/${group.id}`} key={group.id}>
                            <Card className="hover:bg-secondary transition-colors">
                                <div className="relative h-32 w-full">
                                    <Image src={group.bannerUrl || 'https://picsum.photos/seed/group-default/800/200'} alt={group.name} fill className="object-cover rounded-t-lg" />
                                </div>
                                <div className="p-4">
                                    <h2 className="font-bold text-lg">{group.name}</h2>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                                        <Users className="size-4 mr-2" />
                                        <span>{group.memberCount || 0} members</span>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))
                ): (
                    <div className="text-center py-16">
                        <h2 className="text-xl font-bold">No groups found</h2>
                        <p className="text-muted-foreground">Be the first to create one!</p>
                        <CreateGroupDialog>
                            <Button className="mt-4">
                                <Plus className="mr-2"/>
                                Create Group
                            </Button>
                        </CreateGroupDialog>
                    </div>
                )}
            </div>
        </div>
    )
}

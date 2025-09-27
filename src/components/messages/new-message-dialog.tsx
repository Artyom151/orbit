
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDatabase, useUser } from '@/firebase';
import React, { useState, useMemo } from 'react';
import { useList } from '@/firebase/rtdb/use-list';
import type { User } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ref } from 'firebase/database';

type NewMessageDialogProps = {
  children?: React.ReactNode;
  onSelectUser: (user: User) => void;
};

export function NewMessageDialog({ children, onSelectUser }: NewMessageDialogProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const [isOpen, setIsOpen] = useState(false);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return ref(db, 'users');
  }, [db]);

  const { data: users, loading } = useList<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users || !authUser) return [];
    return users.filter(u => u.id !== authUser.uid);
  }, [users, authUser]);

  const handleSelect = (user: User) => {
    onSelectUser(user);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || <Button>New Message</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search for people..." />
          <CommandList>
            {loading && <CommandEmpty>Loading users...</CommandEmpty>}
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {filteredUsers.map(user => (
                <CommandItem key={user.id} onSelect={() => handleSelect(user)} value={user.name}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border-none">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

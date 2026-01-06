'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationList } from './notification-list';
import { getNotifications } from '@/server/actions/notification';

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    // Poll for unread count every 30 seconds
    useEffect(() => {
        const fetchCount = async () => {
            const result = await getNotifications();
            if (result.success && typeof result.unreadCount === 'number') {
                setUnreadCount(result.unreadCount);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [open]); // Also refetch when closed/opened

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2 top-2 flex h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
                <NotificationList onOpenChange={setOpen} />
            </PopoverContent>
        </Popover>
    );
}


'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send, X } from 'lucide-react';
import { ChatMessage, UserRole } from '@/lib/types';
import { addChatMessage, getChatMessages } from '@/lib/data-service';
import { cn } from '@/lib/utils';

interface ChatWidgetProps {
  user: User;
  userRole: UserRole;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ user, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(0);

  useEffect(() => {
    // Only subscribe when the component is mounted, not just when it's open
    const unsubscribe = getChatMessages((newMessages) => {
      if (newMessages.length > prevMessagesCountRef.current && !isOpen) {
        setHasUnreadMessages(true);
      }
      setMessages(newMessages);
      prevMessagesCountRef.current = newMessages.length;
    });

    return () => unsubscribe();
  }, [isOpen]); // Re-subscribing logic depends on isOpen now

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user.email) return;

    const messageData: Omit<ChatMessage, 'id'> = {
      text: newMessage,
      createdAt: new Date(),
      user: {
        id: user.uid,
        email: user.email,
        role: userRole,
      },
    };

    try {
      await addChatMessage(messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleToggleOpen = () => {
    setIsOpen(prev => {
        const newIsOpen = !prev;
        if (newIsOpen) {
            setHasUnreadMessages(false);
        }
        return newIsOpen;
    });
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <Button
          onClick={handleToggleOpen}
          className="fixed top-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          {hasUnreadMessages && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed top-4 right-4 z-50 flex h-[60vh] w-80 flex-col shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-lg">Obrolan Tim</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleToggleOpen} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-4">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-2',
                      msg.user.id === user.uid ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.user.id !== user.uid && (
                        <Avatar className="h-6 w-6">
                           <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${msg.user.email}`} />
                           <AvatarFallback>{msg.user.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg p-2 px-3',
                        msg.user.id === user.uid
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-xs font-semibold capitalize">{msg.user.role}</p>
                      <p className="text-sm">{msg.text}</p>
                       <p className="text-right text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-2">
            <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik pesan..."
                autoComplete="off"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default ChatWidget;

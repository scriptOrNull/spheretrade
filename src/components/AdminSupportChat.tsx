import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Chat {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function AdminSupportChat({ users }: { users: any[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('support_chats')
      .select('*')
      .order('updated_at', { ascending: false });
    setChats((data as Chat[]) || []);
  };

  useEffect(() => {
    fetchChats();
    const channel = supabase
      .channel('admin-support-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats' }, () => {
        fetchChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
      setTimeout(scrollToBottom, 100);
    };
    fetchMessages();

    const channel = supabase
      .channel(`admin-chat-messages-${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${activeChat.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat]);

  const handleSendMessage = async () => {
    if (!user || !activeChat || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      chat_id: activeChat.id,
      sender_id: user.id,
      sender_role: 'admin',
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    }
    setNewMessage('');
    setSending(false);
  };

  const handleCloseChat = async (chatId: string) => {
    await supabase.from('support_chats').update({ status: 'closed' }).eq('id', chatId);
    if (activeChat?.id === chatId) setActiveChat(prev => prev ? { ...prev, status: 'closed' } : null);
    fetchChats();
    toast({ title: 'Chat closed' });
  };

  const getUserEmail = (userId: string) => users.find(u => u.id === userId)?.email || userId.slice(0, 8);

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Chat List */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden">
        <div className="text-xs text-muted-foreground mb-2">{chats.length} conversations</div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                activeChat?.id === chat.id ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:border-primary/20'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{getUserEmail(chat.user_id)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">{chat.subject || 'No subject'}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${chat.status === 'open' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                  {chat.status}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                <Clock className="h-2.5 w-2.5" />
                {new Date(chat.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          {chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No support chats yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeChat ? (
          <>
            <div className="bg-card border border-border rounded-t-xl px-4 py-2.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{activeChat.subject}</h3>
                <span className="text-xs text-muted-foreground">{getUserEmail(activeChat.user_id)}</span>
              </div>
              {activeChat.status === 'open' && (
                <Button size="sm" variant="outline" onClick={() => handleCloseChat(activeChat.id)} className="text-xs h-7">
                  Close Chat
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-card/50 border-x border-border p-4 space-y-3">
              <AnimatePresence>
                {messages.map(msg => {
                  const isAdmin = msg.sender_role === 'admin';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        isAdmin
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-secondary text-foreground rounded-bl-sm'
                      }`}>
                        <div className="text-[10px] opacity-70 mb-0.5">{isAdmin ? 'Admin' : 'User'}</div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className="text-[10px] opacity-50 mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No messages yet.</div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="bg-card border border-border rounded-b-xl p-3 flex gap-2">
              <Input
                placeholder="Reply to user..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                className="bg-secondary border-border text-sm"
                disabled={activeChat.status === 'closed'}
              />
              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim() || activeChat.status === 'closed'}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground border border-border rounded-xl">
            <div className="text-center">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation to reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

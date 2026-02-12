import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Plus, ArrowLeft, Clock } from 'lucide-react';
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

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chats
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      const { data } = await supabase
        .from('support_chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      setChats((data as Chat[]) || []);
    };
    fetchChats();

    const channel = supabase
      .channel('user-support-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` }, () => {
        fetchChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch messages for active chat
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
      .channel(`chat-messages-${activeChat.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${activeChat.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat]);

  const handleCreateChat = async () => {
    if (!user || !newSubject.trim()) return;
    const { data, error } = await supabase
      .from('support_chats')
      .insert({ user_id: user.id, subject: newSubject.trim() })
      .select()
      .single();
    if (error) {
      toast({ title: 'Failed to create chat', variant: 'destructive' });
      return;
    }
    setActiveChat(data as Chat);
    setNewSubject('');
    setShowNewChat(false);
  };

  const handleSendMessage = async () => {
    if (!user || !activeChat || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      chat_id: activeChat.id,
      sender_id: user.id,
      sender_role: 'user',
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
    setNewMessage('');
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 mb-4">
          {activeChat && (
            <Button variant="ghost" size="sm" onClick={() => setActiveChat(null)} className="lg:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground text-sm">Chat with our support team</p>
          </div>
        </div>

        <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
          {/* Chat List */}
          <div className={`w-full lg:w-80 shrink-0 flex flex-col ${activeChat ? 'hidden lg:flex' : 'flex'}`}>
            <Button onClick={() => setShowNewChat(true)} className="w-full mb-3 bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" /> New Conversation
            </Button>

            {showNewChat && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-3 mb-3 space-y-2">
                <Input
                  placeholder="Subject (e.g. Deposit issue)"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="bg-secondary border-border text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleCreateChat()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateChat} className="bg-gradient-primary text-primary-foreground text-xs">Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewChat(false)} className="text-xs">Cancel</Button>
                </div>
              </motion.div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    activeChat?.id === chat.id
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{chat.subject || 'No subject'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${chat.status === 'open' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {chat.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
              {chats.length === 0 && !showNewChat && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation for help</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className={`flex-1 flex flex-col min-h-0 ${!activeChat ? 'hidden lg:flex' : 'flex'}`}>
            {activeChat ? (
              <>
                <div className="bg-card border border-border rounded-t-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{activeChat.subject}</h3>
                    <span className={`text-[10px] ${activeChat.status === 'open' ? 'text-accent' : 'text-muted-foreground'}`}>{activeChat.status}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-card/50 border-x border-border p-4 space-y-3">
                  <AnimatePresence>
                    {messages.map(msg => {
                      const isUser = msg.sender_role === 'user';
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                            isUser
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-secondary text-foreground rounded-bl-sm'
                          }`}>
                            <div className="text-[10px] opacity-70 mb-0.5">{isUser ? 'You' : 'Support'}</div>
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
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No messages yet. Send a message to get started.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="bg-card border border-border rounded-b-xl p-3 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
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
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

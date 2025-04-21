import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import UsernameForm from "@/components/UsernameForm";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import { PublicMessage, ChatRoom } from "@/types/supabase";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ROOM_NAME = "Public Chat Room";
const DEFAULT_ROOM_SLUG = "public";

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [defaultRoom, setDefaultRoom] = useState<ChatRoom | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle joining the chat
  const handleJoin = (name: string) => {
    setUsername(name);
    localStorage.setItem("chatUsername", name);
  };

  // Make sure we scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if username is already in localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("chatUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // Initialize the default room and fetch messages
  useEffect(() => {
    const initializeChat = async () => {
      if (!username) return;
      
      try {
        setIsLoading(true);
        
        // Check if default room exists, create if not
        const { data: rooms, error: roomError } = await supabase
          .from('chat_rooms')
          .select('*')
          .eq('slug', DEFAULT_ROOM_SLUG) as { data: ChatRoom[] | null, error: Error | null };
        
        if (roomError) {
          throw roomError;
        }
        
        let room: ChatRoom;
        
        if (!rooms || rooms.length === 0) {
          // Create the default room
          const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert([{ name: DEFAULT_ROOM_NAME, slug: DEFAULT_ROOM_SLUG }])
            .select() as { data: ChatRoom[] | null, error: Error | null };
            
          if (createError || !newRoom) {
            throw createError || new Error("Failed to create default room");
          }
          
          room = newRoom[0];
        } else {
          room = rooms[0];
        }
        
        setDefaultRoom(room);
        
        // Fetch messages for the default room
        const { data: messageData, error: messageError } = await supabase
          .from('public_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true }) as { data: PublicMessage[] | null, error: Error | null };
        
        if (messageError) {
          throw messageError;
        }
        
        if (messageData) {
          setMessages(messageData);
        }
        
        // Subscribe to new messages and deletions
        const messagesChannel = supabase
          .channel(`public:public_messages:room_id=eq.${room.id}`)
          .on(
            "postgres_changes",
            { 
              event: "*", // Listen to all events
              schema: "public", 
              table: "public_messages",
              filter: `room_id=eq.${room.id}`
            },
            (payload: any) => {
              console.log('Database change received:', payload);
              
              if (payload.eventType === 'INSERT') {
                const newMessage = payload.new as PublicMessage;
                setMessages((prev) => [...prev, newMessage]);
              } else if (payload.eventType === 'DELETE') {
                const deletedMessageId = payload.old.id;
                setMessages((prev) => prev.filter(msg => msg.id !== deletedMessageId));
              }
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });
          
        return () => {
          supabase.removeChannel(messagesChannel);
        };
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast({
          title: "Error",
          description: "Failed to load the chat. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    void initializeChat();
  }, [username, toast]);

  // Send a new message
  const sendMessage = async (text: string, attachmentInfo?: { path: string; type: string }) => {
    if ((!text.trim() && !attachmentInfo) || !defaultRoom) return;
    
    try {
      const messageData: {
        room_id: string;
        sender_name: string;
        content: string;
        has_attachment?: boolean;
        attachment_path?: string;
        attachment_type?: string;
      } = {
        room_id: defaultRoom.id,
        sender_name: username,
        content: text
      };
      
      // Add attachment info if available
      if (attachmentInfo) {
        messageData.has_attachment = true;
        messageData.attachment_path = attachmentInfo.path;
        messageData.attachment_type = attachmentInfo.type;
      }
      
      const { error } = await supabase
        .from('public_messages')
        .insert([messageData]) as { error: Error | null };
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
      
      // Re-throw to let the ChatInput component know it failed
      throw error;
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      console.log('Attempting to delete message:', messageId);
      
      // Delete the message
      const { data, error } = await supabase
        .from('public_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Delete successful:', data);
      
      // Remove the message from the local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      // Force refresh messages for all clients
      const { data: updatedMessages, error: refreshError } = await supabase
        .from('public_messages')
        .select('*')
        .eq('room_id', defaultRoom?.id)
        .order('created_at', { ascending: true });

      if (!refreshError && updatedMessages) {
        setMessages(updatedMessages);
      }
      
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  // If no username, show the join form
  if (!username) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <UsernameForm onSubmit={handleJoin} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ChatHeader username={username} onlineCount={1} />
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="h-12 w-12 mb-2 text-gray-300" />
            <p>No messages yet. Be the first to say hello!</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                username={username}
                onDelete={deleteMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <ChatInput 
        onSendMessage={sendMessage}
        disabled={isLoading || !defaultRoom}
      />
    </div>
  );
};

export default Chat;

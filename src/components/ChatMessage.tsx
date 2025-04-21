import React, { useMemo } from "react";
import { PublicMessage } from "@/types/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText, Image, Paperclip, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: PublicMessage;
  username: string;
  onDelete?: (messageId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, username, onDelete }) => {
  const isCurrentUser = message.sender_name === username;
  
  const timestamp = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
    } catch (error) {
      return "just now";
    }
  }, [message.created_at]);

  // Generate a consistent color for each user based on their username
  const getUserColor = (name: string) => {
    const colors = [
      "text-blue-600",
      "text-purple-600",
      "text-pink-600",
      "text-amber-600",
      "text-emerald-600",
      "text-cyan-600",
      "text-indigo-600",
    ];
    
    // Simple hash function to get a consistent index
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const userColor = getUserColor(message.sender_name);
  
  const getAttachmentUrl = () => {
    if (!message.attachment_path) return null;
    return supabase.storage.from('chat_attachments').getPublicUrl(message.attachment_path).data.publicUrl;
  };
  
  const attachmentUrl = message.has_attachment ? getAttachmentUrl() : null;
  
  const isImage = message.attachment_type?.startsWith('image/');
  const isPdf = message.attachment_type === 'application/pdf';
  const isDocument = message.attachment_type?.includes('word') || message.attachment_type === 'text/plain';
  
  const renderAttachment = () => {
    if (!message.has_attachment || !attachmentUrl) return null;
    
    if (isImage) {
      return (
        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img 
            src={attachmentUrl} 
            alt="Attached image" 
            className="max-w-[240px] max-h-[240px] rounded-md object-cover"
          />
        </a>
      );
    }
    
    if (isPdf) {
      return (
        <a 
          href={attachmentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center mt-2 p-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors"
        >
          <FileText className="h-5 w-5 mr-2" />
          <span className="text-sm truncate">View PDF</span>
        </a>
      );
    }
    
    if (isDocument) {
      return (
        <a 
          href={attachmentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center mt-2 p-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors"
        >
          <FileText className="h-5 w-5 mr-2" />
          <span className="text-sm truncate">View Document</span>
        </a>
      );
    }
    
    return (
      <a 
        href={attachmentUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center mt-2 p-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors"
      >
        <Paperclip className="h-5 w-5 mr-2" />
        <span className="text-sm truncate">Download Attachment</span>
      </a>
    );
  };

  return (
    <div className={cn(
      "flex flex-col mb-4 max-w-[80%] group",
      isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      <div className={cn(
        "rounded-2xl p-3 break-words relative",
        isCurrentUser 
          ? "bg-indigo-600 text-white rounded-br-none" 
          : "bg-gray-100 rounded-bl-none"
      )}>
        {!isCurrentUser && (
          <div className={cn("font-medium mb-1", userColor)}>
            {message.sender_name}
          </div>
        )}
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {renderAttachment()}
        {isCurrentUser && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            onClick={() => onDelete(message.id)}
            title="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
    </div>
  );
};

export default ChatMessage;

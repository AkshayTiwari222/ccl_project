
import React from "react";
import { MessageCircle } from "lucide-react";

interface ChatHeaderProps {
  username: string;
  onlineCount?: number;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ username, onlineCount = 0 }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-2">
        <MessageCircle className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-bold">ChatLinkUp</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>{onlineCount} online</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-medium">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium hidden md:inline">{username}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

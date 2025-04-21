
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { MessageCircle } from "lucide-react";

interface UsernameFormProps {
  onSubmit: (username: string) => void;
}

const UsernameForm: React.FC<UsernameFormProps> = ({ onSubmit }) => {
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to join the chat",
        variant: "destructive",
      });
      return;
    }
    
    onSubmit(username.trim());
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col items-center justify-center space-y-4 mb-6">
        <div className="p-3 bg-indigo-100 rounded-full">
          <MessageCircle className="h-10 w-10 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-center">Join the Conversation</h1>
        <p className="text-gray-600 text-center">
          Enter a username to start chatting
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Your nickname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full"
            maxLength={20}
            autoFocus
          />
        </div>
        <Button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          Join Chat
        </Button>
      </form>
    </div>
  );
};

export default UsernameForm;

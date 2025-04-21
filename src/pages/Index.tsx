
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to chat page
    navigate("/chat");
  }, [navigate]);

  const goToChat = () => {
    navigate("/chat");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="h-10 w-10 text-indigo-600" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4 text-gray-900">ChatLinkUp</h1>
        <p className="text-xl text-gray-600 mb-8">
          Join our live chat where everyone can participate with just a username!
        </p>
        
        <Button 
          onClick={goToChat}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Start Chatting
        </Button>
      </div>
    </div>
  );
};

export default Index;

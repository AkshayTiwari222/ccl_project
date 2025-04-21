
import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Loader2, Paperclip, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { pipeline, env } from "@huggingface/transformers";
import { supabase } from "@/integrations/supabase/client";

// Configure transformers.js to not use local models
env.allowLocalModels = false;
env.useBrowserCache = false;

interface ChatInputProps {
  onSendMessage: (message: string, attachmentInfo?: {
    path: string;
    type: string;
  }) => Promise<void>;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && !attachment) || isSubmitting || disabled) return;
    
    try {
      setIsSubmitting(true);
      
      let attachmentInfo = undefined;
      
      // Upload attachment if present
      if (attachment) {
        setIsUploading(true);
        try {
          const fileName = `${Date.now()}-${attachment.name}`;
          const filePath = `${fileName}`;
          
          const { data, error } = await supabase.storage
            .from('chat_attachments')
            .upload(filePath, attachment, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (error) throw error;
          
          attachmentInfo = {
            path: data.path,
            type: attachment.type
          };
          
          toast({
            title: "File uploaded",
            description: "Your attachment has been uploaded successfully",
          });
        } catch (error) {
          console.error("Error uploading file:", error);
          toast({
            title: "Upload failed",
            description: "Failed to upload attachment. Please try again.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }
      
      await onSendMessage(message.trim(), attachmentInfo);
      setMessage("");
      setAttachment(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Recording started",
          description: "Speak clearly into your microphone",
        });
      };
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        
        try {
          // Process the recorded audio
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
        } catch (error) {
          console.error("Error processing audio:", error);
          toast({
            title: "Error",
            description: "Failed to process speech. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
          
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      // Start recording
      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      toast({
        title: "Processing",
        description: "Converting your speech to text...",
      });
      
      // Initialize the Hugging Face speech recognition pipeline
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-tiny.en",
        { device: "webgpu" }
      );
      
      // Convert Blob to a format that Hugging Face can process
      const audio = await blobToBase64(audioBlob);
      
      // Perform speech recognition
      const result = await transcriber(audio);
      
      // Handle the result which can be a single object or an array
      let transcribedText = "";
      
      if (Array.isArray(result)) {
        // If result is an array, get the text from the first item if it exists
        if (result.length > 0 && result[0].text) {
          transcribedText = result[0].text;
        }
      } else if (result && typeof result === 'object' && 'text' in result) {
        // If result is a single object, get the text directly
        transcribedText = result.text;
      }
      
      if (transcribedText) {
        // Add transcribed text to current message
        setMessage((prev) => prev + (prev ? ' ' : '') + transcribedText);
        toast({
          title: "Success",
          description: "Speech transcribed successfully",
        });
      } else {
        toast({
          title: "No speech detected",
          description: "Please try again and speak clearly",
        });
      }
    } catch (error) {
      console.error("Speech recognition error:", error);
      toast({
        title: "Error",
        description: "Speech recognition failed. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to convert a Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB max
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select an image, PDF, text, or document file",
          variant: "destructive",
        });
        return;
      }
      
      setAttachment(file);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="border-t border-gray-200 bg-white p-4"
    >
      {attachment && (
        <div className="mb-2 flex items-center rounded-md bg-gray-100 p-2">
          <div className="flex-1 truncate text-sm">
            {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={removeAttachment}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-end space-x-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording 
              ? "Listening..." 
              : isProcessing 
                ? "Processing speech..." 
                : isUploading 
                  ? "Uploading attachment..." 
                  : "Type a message..."
          }
          className="flex-1 min-h-[60px] max-h-[120px] resize-none"
          disabled={disabled || isSubmitting || isRecording || isProcessing || isUploading}
          autoFocus
        />
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileInputChange}
          accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        
        <Button 
          type="button" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-gray-200 hover:bg-gray-300"
          onClick={openFileSelector}
          disabled={disabled || isSubmitting || isRecording || isProcessing || isUploading || !!attachment}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5 text-gray-600" />
        </Button>
        
        <Button 
          type="button" 
          size="icon" 
          className={`h-10 w-10 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-700' : isProcessing ? 'bg-amber-500' : 'bg-gray-200 hover:bg-gray-300'}`}
          onClick={toggleRecording}
          disabled={disabled || isProcessing || isUploading}
          title={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : isRecording ? (
            <MicOff className="h-5 w-5 text-white" />
          ) : (
            <Mic className="h-5 w-5 text-gray-600" />
          )}
        </Button>
        
        <Button 
          type="submit" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700"
          disabled={(!message.trim() && !attachment) || isSubmitting || disabled || isRecording || isProcessing || isUploading}
        >
          {isSubmitting || isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;

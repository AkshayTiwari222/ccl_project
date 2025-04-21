
export interface PublicMessage {
  id: string;
  room_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  has_attachment?: boolean;
  attachment_path?: string;
  attachment_type?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

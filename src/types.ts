export interface Message {
  content: string;
  createdAt: Date;
  id?: number;
  role: string;
  title: string;
  tool_call_id?: string;
  userId: number;
}

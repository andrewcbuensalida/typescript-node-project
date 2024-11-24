export interface Message {
  content: string;
  createdAt: Date;
  id?: number;
  role: string;
  title: string;
  tool_call_id?: string;
  userId: number;
  tool_calls?: ToolCall[];
  toolName?: string;
  errorMessage?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: ToolCallFunction;
}
export interface ToolCallFunction {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}
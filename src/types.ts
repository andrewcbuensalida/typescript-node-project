export interface Message {
  content: string
  createdAt: Date
  errorMessage?: string
  id?: number
  role: string
  title: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
  toolName?: string
  userId: number
}

export interface ToolCall {
  id: string
  type: string
  function: ToolCallFunction
}
export interface ToolCallFunction {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

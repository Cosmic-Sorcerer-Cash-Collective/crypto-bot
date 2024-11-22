export interface CommunicationTool {
  sendMessageAll: (message: string) => Promise<void>;
  run: () => void;
}

export type ScanVerdict = {
  interesting: boolean;
  score: number;
  reason: string;
};

export type DraftRequest = {
  chatId: string;
  chatName: string;
  isGroup: boolean;
  replyToMessageId?: string;
  recentMessages: Array<{
    authorName: string;
    body: string;
    fromMe: boolean;
  }>;
  persona: { about: string; voice: string };
};

export type DraftResult = {
  body: string;
  model: string;
};

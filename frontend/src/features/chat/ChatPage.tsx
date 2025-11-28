import React, { useState, useRef, useEffect } from "react";
import { auth } from "../../firebase";
import { Card, Button } from "../../components";
import { FiTarget, FiActivity, FiAlertCircle } from "react-icons/fi";
import { LuScale, LuChartBar } from "react-icons/lu";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  { icon: FiTarget, text: "Who are the best QB options this week?" },
  { icon: FiActivity, text: "Which RBs have favorable matchups?" },
  { icon: FiAlertCircle, text: "Any injury concerns I should know about?" },
  { icon: LuScale, text: "Help me decide between two players" },
  { icon: LuChartBar, text: "What's the DraftKings scoring system?" },
];

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    <div className="flex gap-1">
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
    <span className="text-caption text-text-muted ml-1">Thinking...</span>
  </div>
);

// Message bubble component
const MessageBubble: React.FC<{ message: Message; formatTime: (date: Date) => string }> = ({ message, formatTime }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-primary text-white"
            : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
        }`}>
          {isUser ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </div>

        {/* Message content */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-surface border border-border shadow-card rounded-bl-md"
        }`}>
          <div className={`text-body-sm whitespace-pre-wrap ${isUser ? "text-white" : "text-text-primary"}`}>
            {message.content}
          </div>
          <div className={`text-tiny mt-1.5 ${isUser ? "text-white/60" : "text-text-muted"}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your fantasy football assistant. I can help with player analysis, matchup advice, injury updates, and lineup decisions. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const user = auth.currentUser;
    const text = messageText || input.trim();
    if (!user || !text) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/aiChat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          userId: user.uid,
          leagueId: import.meta.env.VITE_LEAGUE_ID,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Sorry, I couldn't generate a response.",
          timestamp: new Date()
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date()
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px]">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-page-title text-text-primary">AI Assistant</h1>
            <p className="text-body text-text-secondary">
              Get help with player matchups, injury news, and fantasy strategy
            </p>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <Card padding="none" className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-subtle/30">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} formatTime={formatTime} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-surface border border-border shadow-card rounded-2xl rounded-bl-md">
                  <TypingIndicator />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length <= 2 && !loading && (
          <div className="px-4 py-3 border-t border-border bg-surface">
            <p className="text-caption text-text-muted mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => {
                const IconComponent = prompt.icon;
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="inline-flex items-center gap-1.5 text-caption px-3 py-1.5 rounded-full bg-subtle border border-border text-text-secondary hover:bg-primary-soft hover:border-primary/30 hover:text-primary transition-all duration-150"
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{prompt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-border bg-surface">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about players, matchups, or strategy…"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-border bg-page text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 transition-all"
              />
            </div>
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              loading={loading}
              size="lg"
              className="px-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-tiny text-text-subtle text-center mt-2">
            AI responses are for entertainment purposes. Always do your own research.
          </p>
        </div>
      </Card>
    </div>
  );
};


import { memo, useState } from 'react';
import { MessageSquare, ExternalLink, Copy, Check } from 'lucide-react';
import { ConversationMessage } from '../../types';
import { Button } from '../buttonFormat';

export const MessageItem = memo<{ message: ConversationMessage }>(({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGo = () => {
    console.log('Opening conversation in:', message.app);
  };

  return (
    <div className="glass-subtle p-3 rounded-2xl border-glass-border animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-black text-text-primary font-jakarta">{message.user}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full glass-subtle text-accent">
              {message.app}
            </span>
          </div>
          <p className="text-[12px] font-medium text-text-secondary font-jakarta leading-relaxed">{message.text}</p>
          <p className="text-[9px] font-medium opacity-40 mt-1 font-jakarta text-text-secondary">{message.timestamp}</p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-3 pt-2 border-t border-glass-border">
        <Button onClick={handleGo} variant="glass" size="xs" icon={<ExternalLink size={12} />} iconPosition="left" className="flex-1 text-accent">
          Go
        </Button>
        <Button onClick={handleCopy} variant={copied ? 'primary' : 'glass'} size="xs" icon={copied ? <Check size={12} /> : <Copy size={12} />} iconPosition="left" className="flex-1">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  );
});
MessageItem.displayName = 'MessageItem';

export const MessageList = memo<{ messages: ConversationMessage[] }>(({ messages }) => (
  <div className="mt-4 space-y-2">
    {messages.length === 0 ? (
      <div className="p-4 text-center opacity-50">
        <p className="text-[11px] font-semibold font-jakarta">No messages found</p>
      </div>
    ) : (
      messages.map((msg, index) => (
        <div key={msg.id} style={{ animationDelay: `${index * 0.05}s` }}>
          <MessageItem message={msg} />
        </div>
      ))
    )}
  </div>
));
MessageList.displayName = 'MessageList';

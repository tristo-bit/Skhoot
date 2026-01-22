
import React, { useState } from 'react';
import { Send, X } from 'lucide-react';

interface WorkflowInputFormProps {
  prompt: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const WorkflowInputForm: React.FC<WorkflowInputFormProps> = ({ prompt, onSubmit, onCancel }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm font-medium text-amber-400">{prompt}</p>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Type your answer..."
          autoFocus
        />
        
        <button 
          type="submit"
          disabled={!value.trim()}
          className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <Send size={16} />
        </button>
        
        <button 
          type="button"
          onClick={onCancel}
          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );
};

/**
 * WorkflowsPanel - Workflow management with editable prompt chains
 * Uses terminal-style floating panel layout
 */
import React, { useState, useCallback } from 'react';
import { 
  Workflow, Play, Plus, Trash2, Edit3,
  Clock, CheckCircle, XCircle,
  Save, Zap
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';

type TabId = 'workflows' | 'running' | 'history';

interface WorkflowStep {
  id: string;
  prompt: string;
  order: number;
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  lastRun?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  runCount: number;
}

interface WorkflowsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf-1',
    name: 'Code Review',
    description: 'Automated code review workflow',
    steps: [
      { id: 's1', prompt: 'Analyze the code structure and identify potential issues', order: 1 },
      { id: 's2', prompt: 'Check for security vulnerabilities', order: 2 },
      { id: 's3', prompt: 'Suggest performance improvements', order: 3 },
    ],
    lastRun: '2 hours ago',
    status: 'completed',
    runCount: 15,
  },
  {
    id: 'wf-2',
    name: 'Documentation Generator',
    description: 'Generate docs from code',
    steps: [
      { id: 's1', prompt: 'Extract function signatures and types', order: 1 },
      { id: 's2', prompt: 'Generate JSDoc comments', order: 2 },
      { id: 's3', prompt: 'Create README sections', order: 3 },
    ],
    lastRun: '1 day ago',
    status: 'idle',
    runCount: 8,
  },
  {
    id: 'wf-3',
    name: 'Test Generator',
    description: 'Generate unit tests for functions',
    steps: [
      { id: 's1', prompt: 'Identify testable functions', order: 1 },
      { id: 's2', prompt: 'Generate test cases with edge cases', order: 2 },
    ],
    status: 'idle',
    runCount: 3,
  },
];

export const WorkflowsPanel: React.FC<WorkflowsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(MOCK_WORKFLOWS);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const tabs: SecondaryPanelTab[] = [
    { id: 'workflows', title: 'Workflows', icon: <Workflow size={14} /> },
    { id: 'running', title: 'Running', icon: <Zap size={14} /> },
    { id: 'history', title: 'History', icon: <Clock size={14} /> },
  ];

  const handleRunWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(wf => 
      wf.id === workflowId 
        ? { ...wf, status: 'running' as const, runCount: wf.runCount + 1 }
        : wf
    ));
    // Simulate completion after 3 seconds
    setTimeout(() => {
      setWorkflows(prev => prev.map(wf => 
        wf.id === workflowId 
          ? { ...wf, status: 'completed' as const, lastRun: 'Just now' }
          : wf
      ));
    }, 3000);
  }, []);

  const handleDeleteWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.filter(wf => wf.id !== workflowId));
    if (selectedWorkflow === workflowId) {
      setSelectedWorkflow(null);
    }
  }, [selectedWorkflow]);

  const handleCreateWorkflow = useCallback(() => {
    const newWorkflow: WorkflowItem = {
      id: `wf-${Date.now()}`,
      name: 'New Workflow',
      description: 'Add a description...',
      steps: [{ id: `s-${Date.now()}`, prompt: 'Enter your first prompt...', order: 1 }],
      status: 'idle',
      runCount: 0,
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflow(newWorkflow.id);
    setIsEditing(true);
  }, []);

  const headerActions = (
    <button
      onClick={handleCreateWorkflow}
      className="p-1.5 rounded-xl transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
      style={{ color: 'var(--text-secondary)' }}
      title="New Workflow"
    >
      <Plus size={14} />
    </button>
  );

  const selected = workflows.find(wf => wf.id === selectedWorkflow);

  return (
    <SecondaryPanel
      isOpen={isOpen}
      onClose={onClose}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      headerActions={headerActions}
      storageKey="skhoot-workflows-height"
      defaultHeight={400}
      animationName="workflowsSlideUp"
    >
      <div className="h-full flex">
        {/* Workflow List */}
        <div className="w-1/3 border-r border-white/5 overflow-y-auto">
          {activeTab === 'workflows' && (
            <WorkflowList
              workflows={workflows}
              selectedId={selectedWorkflow}
              onSelect={setSelectedWorkflow}
              onRun={handleRunWorkflow}
              onDelete={handleDeleteWorkflow}
            />
          )}
          {activeTab === 'running' && (
            <RunningList workflows={workflows.filter(wf => wf.status === 'running')} />
          )}
          {activeTab === 'history' && (
            <HistoryList workflows={workflows.filter(wf => wf.lastRun)} />
          )}
        </div>

        {/* Workflow Detail */}
        <div className="flex-1 overflow-y-auto p-4">
          {selected ? (
            <WorkflowDetail
              workflow={selected}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={() => setIsEditing(false)}
              onUpdateWorkflow={(updated) => {
                setWorkflows(prev => prev.map(wf => wf.id === updated.id ? updated : wf));
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Workflow size={32} className="mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-sm font-jakarta" style={{ color: 'var(--text-secondary)' }}>
                Select a workflow to view details
              </p>
              <button
                onClick={handleCreateWorkflow}
                className="mt-3 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-all"
              >
                Create New Workflow
              </button>
            </div>
          )}
        </div>
      </div>
    </SecondaryPanel>
  );
};

const WorkflowList: React.FC<{
  workflows: WorkflowItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ workflows, selectedId, onSelect, onRun, onDelete }) => (
  <div className="p-2 space-y-1">
    {workflows.map(wf => (
      <div
        key={wf.id}
        onClick={() => onSelect(wf.id)}
        className={`p-3 rounded-xl cursor-pointer transition-all group ${
          selectedId === wf.id ? 'bg-purple-500/20' : 'hover:bg-white/5'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {wf.name}
          </p>
          <StatusBadge status={wf.status} />
        </div>
        <p className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>
          {wf.steps.length} steps • {wf.runCount} runs
        </p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onRun(wf.id); }}
            disabled={wf.status === 'running'}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
          >
            <Play size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(wf.id); }}
            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

const RunningList: React.FC<{ workflows: WorkflowItem[] }> = ({ workflows }) => (
  <div className="p-2">
    {workflows.length === 0 ? (
      <div className="text-center py-8">
        <Zap size={24} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No workflows running</p>
      </div>
    ) : (
      workflows.map(wf => (
        <div key={wf.id} className="p-3 rounded-xl bg-amber-500/10 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{wf.name}</p>
          </div>
        </div>
      ))
    )}
  </div>
);

const HistoryList: React.FC<{ workflows: WorkflowItem[] }> = ({ workflows }) => (
  <div className="p-2 space-y-1">
    {workflows.map(wf => (
      <div key={wf.id} className="p-3 rounded-xl hover:bg-white/5 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{wf.name}</p>
          <StatusBadge status={wf.status} />
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{wf.lastRun}</p>
      </div>
    ))}
  </div>
);

const StatusBadge: React.FC<{ status: WorkflowItem['status'] }> = ({ status }) => {
  const config = {
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: null },
    running: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: <CheckCircle size={10} /> },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <XCircle size={10} /> },
  };
  const c = config[status];
  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.color} ${c.bg}`}>
      {c.icon}
      {status}
    </span>
  );
};

const WorkflowDetail: React.FC<{
  workflow: WorkflowItem;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdateWorkflow: (workflow: WorkflowItem) => void;
}> = ({ workflow, isEditing, onEdit, onSave, onUpdateWorkflow }) => {
  const [editedName, setEditedName] = useState(workflow.name);
  const [editedDesc, setEditedDesc] = useState(workflow.description);
  const [editedSteps, setEditedSteps] = useState(workflow.steps);

  const handleSave = () => {
    onUpdateWorkflow({
      ...workflow,
      name: editedName,
      description: editedDesc,
      steps: editedSteps,
    });
    onSave();
  };

  const addStep = () => {
    setEditedSteps(prev => [...prev, {
      id: `s-${Date.now()}`,
      prompt: 'Enter prompt...',
      order: prev.length + 1,
    }]);
  };

  const removeStep = (stepId: string) => {
    setEditedSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (stepId: string, prompt: string) => {
    setEditedSteps(prev => prev.map(s => s.id === stepId ? { ...s, prompt } : s));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {isEditing ? (
          <input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-lg font-bold bg-transparent border-b border-purple-500/50 outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{workflow.name}</h3>
        )}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button onClick={handleSave} className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
              <Save size={14} />
            </button>
          ) : (
            <button onClick={onEdit} className="p-2 rounded-xl hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editedDesc}
          onChange={(e) => setEditedDesc(e.target.value)}
          className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none"
          style={{ color: 'var(--text-secondary)' }}
          rows={2}
        />
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{workflow.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Steps</p>
          {isEditing && (
            <button onClick={addStep} className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400">
              <Plus size={14} />
            </button>
          )}
        </div>
        {(isEditing ? editedSteps : workflow.steps).map((step, i) => (
          <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-purple-400">{i + 1}</span>
            </div>
            {isEditing ? (
              <div className="flex-1 flex items-start gap-2">
                <textarea
                  value={step.prompt}
                  onChange={(e) => updateStep(step.id, e.target.value)}
                  className="flex-1 text-sm bg-transparent border-none outline-none resize-none"
                  style={{ color: 'var(--text-primary)' }}
                  rows={2}
                />
                <button onClick={() => removeStep(step.id)} className="p-1 rounded-lg hover:bg-red-500/20 text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <p className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{step.prompt}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowsPanel;

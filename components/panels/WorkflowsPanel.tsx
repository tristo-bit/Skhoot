/**
 * WorkflowsPanel - Workflow management with editable prompt chains
 * Uses terminal-style floating panel layout
 * Performance optimized with memo and useCallback
 * 
 * Features:
 * - Create/edit/delete workflows
 * - Tree-of-decision branching
 * - Trigger configuration for hooks
 * - Output settings
 * - Behavior configuration
 * - Toolcall integration
 */
import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { 
  Workflow, Play, Plus, Trash2, Edit3,
  CheckCircle, XCircle, Settings,
  Save, Zap, GitBranch, FileOutput, Bell,
  Code, Folder, ChevronRight, ChevronDown,
  AlertCircle, Target, Layers
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';
import { 
  workflowService, 
  Workflow as WorkflowType, 
  WorkflowStep,
  WorkflowType as WFType,
  TriggerType,
  OutputSettings,
  WorkflowBehavior,
  ExecutionContext
} from '../../services/workflowService';

type TabId = 'workflows' | 'running' | 'create';

interface WorkflowsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowsPanel = memo<WorkflowsPanelProps>(({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [runningExecutions, setRunningExecutions] = useState<ExecutionContext[]>([]);

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
    
    // Subscribe to workflow events
    const unsubCreate = workflowService.on('workflow_created', loadWorkflows);
    const unsubUpdate = workflowService.on('workflow_updated', loadWorkflows);
    const unsubDelete = workflowService.on('workflow_deleted', loadWorkflows);
    const unsubExecStart = workflowService.on('execution_started', () => {
      setRunningExecutions(workflowService.getActiveExecutions());
    });
    const unsubExecComplete = workflowService.on('execution_completed', () => {
      setRunningExecutions(workflowService.getActiveExecutions());
      loadWorkflows();
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubExecStart();
      unsubExecComplete();
    };
  }, []);

  const loadWorkflows = useCallback(async () => {
    const wfs = await workflowService.list();
    setWorkflows(wfs);
  }, []);

  // Memoize tabs
  const tabs: SecondaryPanelTab[] = useMemo(() => [
    { id: 'workflows', title: 'Workflows', icon: <Workflow size={14} /> },
    { id: 'running', title: 'Running', icon: <Zap size={14} /> },
    { id: 'create', title: 'Create', icon: <Plus size={14} /> },
  ], []);

  const handleRunWorkflow = useCallback(async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      await workflowService.execute(workflowId);
      setRunningExecutions(workflowService.getActiveExecutions());
      
      // Close the panel so user can see the workflow in chat
      onClose();
      
      console.log(`[WorkflowsPanel] Started workflow: ${workflow?.name}`);
    } catch (error) {
      console.error('Failed to run workflow:', error);
    }
  }, [workflows, onClose]);

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    await workflowService.delete(workflowId);
    if (selectedWorkflow === workflowId) {
      setSelectedWorkflow(null);
    }
  }, [selectedWorkflow]);

  const handleCreateWorkflow = useCallback(() => {
    setActiveTab('create');
    setSelectedWorkflow(null);
    setIsEditing(true);
  }, []);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id as TabId);
    if (id !== 'create') {
      setIsEditing(false);
    }
  }, []);

  const headerActions = useMemo(() => (
    <button
      onClick={handleCreateWorkflow}
      className="p-1.5 rounded-xl transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
      style={{ color: 'var(--text-secondary)' }}
      title="New Workflow"
    >
      <Plus size={14} />
    </button>
  ), [handleCreateWorkflow]);

  const selected = useMemo(() => 
    workflows.find(wf => wf.id === selectedWorkflow), [workflows, selectedWorkflow]);

  const handleUpdateWorkflow = useCallback(async (updated: WorkflowType) => {
    await workflowService.update(updated.id, updated);
  }, []);

  const handleSaveNewWorkflow = useCallback(async (workflow: Omit<WorkflowType, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>) => {
    const created = await workflowService.create({
      name: workflow.name,
      description: workflow.description,
      workflowType: workflow.workflowType,
      category: workflow.category,
      steps: workflow.steps,
      intent: workflow.intent,
      trigger: workflow.trigger,
      outputSettings: workflow.outputSettings,
      behavior: workflow.behavior,
    });
    setSelectedWorkflow(created.id);
    setActiveTab('workflows');
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback(() => setIsEditing(true), []);
  const handleSave = useCallback(() => setIsEditing(false), []);

  return (
    <SecondaryPanel
      isOpen={isOpen}
      onClose={onClose}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={handleTabChange}
      headerActions={headerActions}
      storageKey="skhoot-workflows-height"
      defaultHeight={500}
      minHeight={350}
      animationName="workflowsSlideUp"
    >
      <div className="h-full flex">
        {activeTab === 'create' ? (
          <WorkflowCreator onSave={handleSaveNewWorkflow} onCancel={() => setActiveTab('workflows')} />
        ) : (
          <>
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
                <RunningList executions={runningExecutions} workflows={workflows} />
              )}
            </div>

            {/* Workflow Detail */}
            <div className="flex-1 overflow-y-auto p-4">
              {selected ? (
                <WorkflowDetail
                  workflow={selected}
                  isEditing={isEditing}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onUpdateWorkflow={handleUpdateWorkflow}
                />
              ) : (
                <EmptyState onCreateWorkflow={handleCreateWorkflow} />
              )}
            </div>
          </>
        )}
      </div>
    </SecondaryPanel>
  );
});

WorkflowsPanel.displayName = 'WorkflowsPanel';

// ============================================================================
// Sub-components
// ============================================================================

const EmptyState = memo<{ onCreateWorkflow: () => void }>(({ onCreateWorkflow }) => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <Workflow size={32} className="mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
    <p className="text-sm font-jakarta" style={{ color: 'var(--text-secondary)' }}>
      Select a workflow to view details
    </p>
    <button
      onClick={onCreateWorkflow}
      className="mt-3 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-all"
    >
      Create New Workflow
    </button>
  </div>
));
EmptyState.displayName = 'EmptyState';

const WorkflowList = memo<{
  workflows: WorkflowType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ workflows, selectedId, onSelect, onRun, onDelete }) => {
  const groupedWorkflows = useMemo(() => {
    const groups: Record<string, WorkflowType[]> = {};
    workflows.forEach(wf => {
      if (!groups[wf.category]) groups[wf.category] = [];
      groups[wf.category].push(wf);
    });
    return groups;
  }, [workflows]);

  return (
    <div className="p-2 space-y-2">
      {Object.entries(groupedWorkflows).map(([category, wfs]) => (
        <div key={category}>
          <p className="text-[10px] font-bold uppercase tracking-wider px-2 py-1" 
             style={{ color: 'var(--text-secondary)' }}>
            {category}
          </p>
          {wfs.map(wf => (
            <WorkflowListItem
              key={wf.id}
              workflow={wf}
              isSelected={selectedId === wf.id}
              onSelect={onSelect}
              onRun={onRun}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
WorkflowList.displayName = 'WorkflowList';

const WorkflowListItem = memo<{
  workflow: WorkflowType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ workflow, isSelected, onSelect, onRun, onDelete }) => (
  <div
    onClick={() => onSelect(workflow.id)}
    className={`p-3 rounded-xl cursor-pointer transition-all group ${
      isSelected ? 'bg-purple-500/20' : 'hover:bg-white/5'
    }`}
  >
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <WorkflowTypeIcon type={workflow.workflowType} />
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {workflow.name}
        </p>
      </div>
      <StatusBadge status={workflow.status} />
    </div>
    <p className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>
      {workflow.steps.length} steps • {workflow.runCount} runs
      {workflow.behavior.asToolcall && ' • 🔧 Toolcall'}
    </p>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button
        onClick={(e) => { e.stopPropagation(); onRun(workflow.id); }}
        disabled={workflow.status === 'running'}
        className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
        title="Run Workflow"
      >
        <Play size={12} />
      </button>
      {workflow.category !== 'default' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(workflow.id); }}
          className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
          title="Delete Workflow"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  </div>
));
WorkflowListItem.displayName = 'WorkflowListItem';

const WorkflowTypeIcon = memo<{ type: WFType }>(({ type }) => {
  const icons = {
    hook: <Zap size={12} className="text-amber-400" />,
    process: <Layers size={12} className="text-blue-400" />,
    manual: <Target size={12} className="text-purple-400" />,
  };
  return icons[type] || null;
});
WorkflowTypeIcon.displayName = 'WorkflowTypeIcon';

const RunningList = memo<{ executions: ExecutionContext[]; workflows: WorkflowType[] }>(
  ({ executions, workflows }) => (
    <div className="p-2">
      {executions.length === 0 ? (
        <div className="text-center py-8">
          <Zap size={24} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No workflows running</p>
        </div>
      ) : (
        executions.map(exec => {
          const wf = workflows.find(w => w.id === exec.workflowId);
          return (
            <div key={exec.executionId} className="p-3 rounded-xl bg-amber-500/10 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {wf?.name || 'Unknown'}
                </p>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Step: {exec.currentStepId || 'Starting...'}
              </p>
            </div>
          );
        })
      )}
    </div>
  )
);
RunningList.displayName = 'RunningList';

const StatusBadge = memo<{ status: WorkflowType['status'] }>(({ status }) => {
  const config = {
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: null },
    running: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> },
    paused: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: null },
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: <CheckCircle size={10} /> },
    failed: { color: 'text-red-400', bg: 'bg-red-500/20', icon: <XCircle size={10} /> },
    cancelled: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: <XCircle size={10} /> },
  };
  const c = config[status];
  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.color} ${c.bg}`}>
      {c.icon}
      {status}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';


// ============================================================================
// Workflow Detail Component
// ============================================================================

const WorkflowDetail = memo<{
  workflow: WorkflowType;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdateWorkflow: (workflow: WorkflowType) => void;
}>(({ workflow, isEditing, onEdit, onSave, onUpdateWorkflow }) => {
  const [editedWorkflow, setEditedWorkflow] = useState(workflow);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['steps']));

  useEffect(() => {
    setEditedWorkflow(workflow);
  }, [workflow]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleSave = () => {
    onUpdateWorkflow(editedWorkflow);
    onSave();
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setEditedWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, ...updates } : s),
    }));
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: 'New Step',
      prompt: 'Enter prompt...',
      order: editedWorkflow.steps.length + 1,
    };
    setEditedWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const removeStep = (stepId: string) => {
    setEditedWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {isEditing ? (
          <input
            value={editedWorkflow.name}
            onChange={(e) => setEditedWorkflow(prev => ({ ...prev, name: e.target.value }))}
            className="text-lg font-bold bg-transparent border-b border-purple-500/50 outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <WorkflowTypeIcon type={workflow.workflowType} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{workflow.name}</h3>
          </div>
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

      {/* Description */}
      {isEditing ? (
        <textarea
          value={editedWorkflow.description}
          onChange={(e) => setEditedWorkflow(prev => ({ ...prev, description: e.target.value }))}
          className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none"
          style={{ color: 'var(--text-secondary)' }}
          rows={2}
          placeholder="Workflow description..."
        />
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{workflow.description}</p>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          Type: {workflow.workflowType}
        </span>
        <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          Runs: {workflow.runCount}
        </span>
        {workflow.lastRun && (
          <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
            Last: {new Date(workflow.lastRun).toLocaleDateString()}
          </span>
        )}
        {workflow.behavior.asToolcall && (
          <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400">
            🔧 Available as Toolcall
          </span>
        )}
      </div>

      {/* Steps Section */}
      <CollapsibleSection
        title="Steps"
        icon={<Layers size={14} />}
        isExpanded={expandedSections.has('steps')}
        onToggle={() => toggleSection('steps')}
        action={isEditing && (
          <button onClick={addStep} className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400">
            <Plus size={14} />
          </button>
        )}
      >
        <div className="space-y-2">
          {(isEditing ? editedWorkflow.steps : workflow.steps).map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              isEditing={isEditing}
              onUpdate={(updates) => updateStep(step.id, updates)}
              onRemove={() => removeStep(step.id)}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Trigger Section (for hooks) */}
      {(workflow.workflowType === 'hook' || isEditing) && (
        <CollapsibleSection
          title="Trigger"
          icon={<Zap size={14} />}
          isExpanded={expandedSections.has('trigger')}
          onToggle={() => toggleSection('trigger')}
        >
          <TriggerEditor
            trigger={isEditing ? editedWorkflow.trigger : workflow.trigger}
            isEditing={isEditing}
            onChange={(trigger) => setEditedWorkflow(prev => ({ ...prev, trigger }))}
          />
        </CollapsibleSection>
      )}

      {/* Output Settings */}
      <CollapsibleSection
        title="Output Settings"
        icon={<FileOutput size={14} />}
        isExpanded={expandedSections.has('output')}
        onToggle={() => toggleSection('output')}
      >
        <OutputSettingsEditor
          settings={isEditing ? editedWorkflow.outputSettings : workflow.outputSettings}
          isEditing={isEditing}
          onChange={(outputSettings) => setEditedWorkflow(prev => ({ ...prev, outputSettings }))}
        />
      </CollapsibleSection>

      {/* Behavior Settings */}
      <CollapsibleSection
        title="Behavior"
        icon={<Settings size={14} />}
        isExpanded={expandedSections.has('behavior')}
        onToggle={() => toggleSection('behavior')}
      >
        <BehaviorEditor
          behavior={isEditing ? editedWorkflow.behavior : workflow.behavior}
          isEditing={isEditing}
          onChange={(behavior) => setEditedWorkflow(prev => ({ ...prev, behavior }))}
        />
      </CollapsibleSection>
    </div>
  );
});
WorkflowDetail.displayName = 'WorkflowDetail';

// ============================================================================
// Collapsible Section
// ============================================================================

const CollapsibleSection = memo<{
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}>(({ title, icon, isExpanded, onToggle, action, children }) => (
  <div className="rounded-xl bg-white/5 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-all"
    >
      <div className="flex items-center gap-2">
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</span>
      </div>
      {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
    </button>
    {isExpanded && <div className="p-3 pt-0">{children}</div>}
  </div>
));
CollapsibleSection.displayName = 'CollapsibleSection';

// ============================================================================
// Step Card
// ============================================================================

const StepCard = memo<{
  step: WorkflowStep;
  index: number;
  isEditing: boolean;
  onUpdate: (updates: Partial<WorkflowStep>) => void;
  onRemove: () => void;
}>(({ step, index, isEditing, onUpdate, onRemove }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-purple-400">{index + 1}</span>
    </div>
    <div className="flex-1 min-w-0">
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={step.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full text-sm font-medium bg-transparent border-b border-white/10 outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Step name"
          />
          <textarea
            value={step.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none resize-none"
            style={{ color: 'var(--text-primary)' }}
            rows={3}
            placeholder="Step prompt..."
          />
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={step.requiresConfirmation || false}
                onChange={(e) => onUpdate({ requiresConfirmation: e.target.checked })}
                className="rounded"
              />
              <span style={{ color: 'var(--text-secondary)' }}>Requires confirmation</span>
            </label>
          </div>
          {step.decision && (
            <div className="p-2 rounded-lg bg-amber-500/10 text-xs">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                <GitBranch size={12} />
                <span>Decision Branch</span>
              </div>
              <input
                value={step.decision.condition}
                onChange={(e) => onUpdate({ decision: { ...step.decision!, condition: e.target.value } })}
                className="w-full bg-transparent border-b border-amber-500/30 outline-none"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Condition..."
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{step.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{step.prompt}</p>
          {step.decision && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
              <GitBranch size={10} />
              <span>Decision: {step.decision.condition}</span>
            </div>
          )}
        </>
      )}
    </div>
    {isEditing && (
      <button onClick={onRemove} className="p-1 rounded-lg hover:bg-red-500/20 text-red-400">
        <Trash2 size={12} />
      </button>
    )}
  </div>
));
StepCard.displayName = 'StepCard';


// ============================================================================
// Trigger Editor
// ============================================================================

const TriggerEditor = memo<{
  trigger?: TriggerType;
  isEditing: boolean;
  onChange: (trigger?: TriggerType) => void;
}>(({ trigger, isEditing, onChange }) => {
  if (!isEditing && !trigger) {
    return <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No trigger configured</p>;
  }

  const triggerTypes = [
    { value: 'on_file_save', label: 'On File Save' },
    { value: 'on_file_create', label: 'On File Create' },
    { value: 'on_message', label: 'On Message' },
    { value: 'on_git_commit', label: 'On Git Commit' },
    { value: 'on_error', label: 'On Error' },
    { value: 'on_ai_detection', label: 'On AI Detection' },
  ];

  return (
    <div className="space-y-2">
      {isEditing ? (
        <>
          <select
            value={trigger?.type || ''}
            onChange={(e) => onChange(e.target.value ? { type: e.target.value as any } : undefined)}
            className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="">No trigger</option>
            {triggerTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {trigger && (trigger.type === 'on_file_save' || trigger.type === 'on_file_create') && (
            <input
              value={trigger.patterns?.join(', ') || ''}
              onChange={(e) => onChange({ ...trigger, patterns: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="File patterns (e.g., *.ts, src/*.tsx)"
            />
          )}
          {trigger && trigger.type === 'on_message' && (
            <input
              value={trigger.keywords?.join(', ') || ''}
              onChange={(e) => onChange({ ...trigger, keywords: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Keywords (comma separated)"
            />
          )}
          {trigger && trigger.type === 'on_ai_detection' && (
            <input
              value={trigger.intentPatterns?.join(', ') || ''}
              onChange={(e) => onChange({ ...trigger, intentPatterns: e.target.value.split(',').map(s => s.trim()) })}
              className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Intent patterns (comma separated)"
            />
          )}
        </>
      ) : (
        <div className="text-xs space-y-1">
          <p style={{ color: 'var(--text-primary)' }}>Type: {trigger?.type}</p>
          {trigger?.patterns && (
            <p style={{ color: 'var(--text-secondary)' }}>Patterns: {trigger.patterns.join(', ')}</p>
          )}
          {trigger?.keywords && (
            <p style={{ color: 'var(--text-secondary)' }}>Keywords: {trigger.keywords.join(', ')}</p>
          )}
          {trigger?.intentPatterns && (
            <p style={{ color: 'var(--text-secondary)' }}>Intent: {trigger.intentPatterns.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
});
TriggerEditor.displayName = 'TriggerEditor';

// ============================================================================
// Output Settings Editor
// ============================================================================

const OutputSettingsEditor = memo<{
  settings: OutputSettings;
  isEditing: boolean;
  onChange: (settings: OutputSettings) => void;
}>(({ settings, isEditing, onChange }) => {
  if (!isEditing && !settings.folder && !settings.filePattern) {
    return <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Default output settings</p>;
  }

  return (
    <div className="space-y-2">
      {isEditing ? (
        <>
          <div className="flex items-center gap-2">
            <Folder size={14} style={{ color: 'var(--text-secondary)' }} />
            <input
              value={settings.folder || ''}
              onChange={(e) => onChange({ ...settings, folder: e.target.value })}
              className="flex-1 text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Output folder (e.g., reports)"
            />
          </div>
          <input
            value={settings.filePattern || ''}
            onChange={(e) => onChange({ ...settings, filePattern: e.target.value })}
            className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="File pattern (e.g., {name}-{timestamp}.md)"
          />
          <textarea
            value={settings.formatDescription || ''}
            onChange={(e) => onChange({ ...settings, formatDescription: e.target.value })}
            className="w-full text-sm bg-white/5 rounded-lg p-2 border-none outline-none resize-none"
            style={{ color: 'var(--text-primary)' }}
            rows={2}
            placeholder="Describe the output format in natural language..."
          />
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={settings.timestamped || false}
                onChange={(e) => onChange({ ...settings, timestamped: e.target.checked })}
                className="rounded"
              />
              <span style={{ color: 'var(--text-secondary)' }}>Timestamped</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={settings.appendMode || false}
                onChange={(e) => onChange({ ...settings, appendMode: e.target.checked })}
                className="rounded"
              />
              <span style={{ color: 'var(--text-secondary)' }}>Append mode</span>
            </label>
          </div>
        </>
      ) : (
        <div className="text-xs space-y-1">
          {settings.folder && (
            <p style={{ color: 'var(--text-primary)' }}>Folder: {settings.folder}</p>
          )}
          {settings.filePattern && (
            <p style={{ color: 'var(--text-secondary)' }}>Pattern: {settings.filePattern}</p>
          )}
          {settings.formatDescription && (
            <p style={{ color: 'var(--text-secondary)' }}>Format: {settings.formatDescription}</p>
          )}
        </div>
      )}
    </div>
  );
});
OutputSettingsEditor.displayName = 'OutputSettingsEditor';

// ============================================================================
// Behavior Editor
// ============================================================================

const BehaviorEditor = memo<{
  behavior: WorkflowBehavior;
  isEditing: boolean;
  onChange: (behavior: WorkflowBehavior) => void;
}>(({ behavior, isEditing, onChange }) => {
  const options = [
    { key: 'asToolcall', label: 'Available as AI Toolcall', icon: <Code size={12} /> },
    { key: 'autoRetry', label: 'Auto-retry on failure', icon: <AlertCircle size={12} /> },
    { key: 'background', label: 'Run in background', icon: <Layers size={12} /> },
    { key: 'notifyOnComplete', label: 'Notify on completion', icon: <Bell size={12} /> },
    { key: 'logExecution', label: 'Log execution details', icon: <FileOutput size={12} /> },
  ];

  return (
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.key} className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={(behavior as any)[opt.key] || false}
            onChange={(e) => onChange({ ...behavior, [opt.key]: e.target.checked })}
            disabled={!isEditing}
            className="rounded"
          />
          {opt.icon}
          <span style={{ color: 'var(--text-secondary)' }}>{opt.label}</span>
        </label>
      ))}
      {behavior.autoRetry && isEditing && (
        <div className="flex items-center gap-2 ml-5">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Max retries:</span>
          <input
            type="number"
            value={behavior.maxRetries || 3}
            onChange={(e) => onChange({ ...behavior, maxRetries: parseInt(e.target.value) || 3 })}
            className="w-16 text-xs bg-white/5 rounded-lg p-1 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            min={1}
            max={10}
          />
        </div>
      )}
    </div>
  );
});
BehaviorEditor.displayName = 'BehaviorEditor';

// ============================================================================
// Workflow Creator
// ============================================================================

const WorkflowCreator = memo<{
  onSave: (workflow: Omit<WorkflowType, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>) => void;
  onCancel: () => void;
}>(({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowType, setWorkflowType] = useState<WFType>('manual');
  const [category, setCategory] = useState('custom');
  const [intent, setIntent] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: 'step-1', name: 'Step 1', prompt: '', order: 1 }
  ]);
  const [trigger, setTrigger] = useState<TriggerType | undefined>();
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({});
  const [behavior, setBehavior] = useState<WorkflowBehavior>({
    notifyOnComplete: true,
    logExecution: true,
  });

  const addStep = () => {
    setSteps(prev => [...prev, {
      id: `step-${Date.now()}`,
      name: `Step ${prev.length + 1}`,
      prompt: '',
      order: prev.length + 1,
    }]);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
  };

  const removeStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      description,
      workflowType,
      category,
      steps,
      intent: intent || undefined,
      trigger,
      outputSettings,
      behavior,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Create Workflow</h3>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-sm hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded-xl text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-lg font-medium bg-transparent border-b border-white/10 outline-none pb-2"
          style={{ color: 'var(--text-primary)' }}
          placeholder="Workflow name..."
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none"
          style={{ color: 'var(--text-secondary)' }}
          rows={2}
          placeholder="Description..."
        />
        <div className="flex gap-3">
          <select
            value={workflowType}
            onChange={(e) => setWorkflowType(e.target.value as WFType)}
            className="flex-1 text-sm bg-white/5 rounded-xl p-2 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="manual">Manual</option>
            <option value="process">Process</option>
            <option value="hook">Hook</option>
          </select>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 text-sm bg-white/5 rounded-xl p-2 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Category"
          />
        </div>
        <input
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          className="w-full text-sm bg-white/5 rounded-xl p-2 border-none outline-none"
          style={{ color: 'var(--text-primary)' }}
          placeholder="Intent keywords (for AI detection)..."
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Steps</p>
          <button onClick={addStep} className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400">
            <Plus size={14} />
          </button>
        </div>
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            isEditing={true}
            onUpdate={(updates) => updateStep(step.id, updates)}
            onRemove={() => removeStep(step.id)}
          />
        ))}
      </div>

      {/* Trigger (for hooks) */}
      {workflowType === 'hook' && (
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Trigger</p>
          <TriggerEditor trigger={trigger} isEditing={true} onChange={setTrigger} />
        </div>
      )}

      {/* Output Settings */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Output Settings</p>
        <OutputSettingsEditor settings={outputSettings} isEditing={true} onChange={setOutputSettings} />
      </div>

      {/* Behavior */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Behavior</p>
        <BehaviorEditor behavior={behavior} isEditing={true} onChange={setBehavior} />
      </div>
    </div>
  );
});
WorkflowCreator.displayName = 'WorkflowCreator';

export default WorkflowsPanel;

/**
 * AgentsPanel - Agent management with creation and execution
 * Uses terminal-style floating panel layout
 * Performance optimized with memo and useCallback
 * 
 * Features:
 * - List/view/edit/delete agents
 * - Create new agents
 * - Monitor running executions
 * - State management (on/off/sleeping/failing)
 * - Trigger configuration
 */
import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { 
  Bot, Plus, Trash2, Edit3, CheckCircle, XCircle, Settings,
  Save, Zap, Power, PowerOff, Moon, AlertCircle, Play, X,
  ChevronRight, ChevronDown, Code, Target, Layers, Tag
} from 'lucide-react';
import { SecondaryPanel, SecondaryPanelTab } from '../ui/SecondaryPanel';
import { 
  agentService, 
  Agent, 
  AgentExecution,
  AgentState,
  TriggerConfig,
  AgentConfig,
  CreateAgentRequest
} from '../../services/agentService';

type TabId = 'agents' | 'running' | 'create';

interface AgentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentsPanel = memo<AgentsPanelProps>(({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [runningExecutions, setRunningExecutions] = useState<AgentExecution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load agents on mount
  useEffect(() => {
    loadAgents();
    
    // Subscribe to agent events
    const unsubCreate = agentService.on('agent_created', loadAgents);
    const unsubUpdate = agentService.on('agent_updated', loadAgents);
    const unsubDelete = agentService.on('agent_deleted', loadAgents);
    const unsubExecStart = agentService.on('execution_started', () => {
      console.log('[AgentsPanel] Execution started event received');
      const activeExecs = agentService.getActiveExecutions();
      console.log('[AgentsPanel] Active executions:', activeExecs.length, activeExecs);
      setRunningExecutions(activeExecs);
    });
    const unsubExecComplete = agentService.on('execution_completed', () => {
      console.log('[AgentsPanel] Execution completed event received');
      setRunningExecutions(agentService.getActiveExecutions());
      loadAgents();
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubExecStart();
      unsubExecComplete();
    };
  }, []);

  const loadAgents = useCallback(async () => {
    const agentsList = await agentService.list();
    setAgents(agentsList);
  }, []);

  // Memoize tabs
  const tabs: SecondaryPanelTab[] = useMemo(() => [
    { id: 'agents', title: 'Agents', icon: <Bot size={14} /> },
    { id: 'running', title: 'Running', icon: <Zap size={14} /> },
    { id: 'create', title: 'Create', icon: <Plus size={14} /> },
  ], []);

  const handleRunAgent = useCallback(async (agentId: string) => {
    try {
      console.log('[AgentsPanel] Running agent:', agentId);
      const execution = await agentService.execute(agentId);
      console.log('[AgentsPanel] Execution created:', execution.id);
      
      const activeExecs = agentService.getActiveExecutions();
      console.log('[AgentsPanel] Setting running executions:', activeExecs.length);
      setRunningExecutions(activeExecs);
      
      // Close the panel so user can see the agent in chat
      onClose();
      
      const agent = agents.find(a => a.id === agentId);
      console.log(`[AgentsPanel] Started agent: ${agent?.name}`);
    } catch (error) {
      console.error('[AgentsPanel] Failed to run agent:', error);
    }
  }, [agents, onClose]);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    try {
      await agentService.delete(agentId);
      if (selectedAgentId === agentId) {
        setSelectedAgentId(null);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  }, [selectedAgentId]);

  const handleToggleState = useCallback(async (agentId: string) => {
    try {
      await agentService.toggleState(agentId);
    } catch (error) {
      console.error('Failed to toggle agent state:', error);
    }
  }, []);

  const handleCreateAgent = useCallback(() => {
    setActiveTab('create');
    setSelectedAgentId(null);
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
      onClick={handleCreateAgent}
      className="p-1.5 rounded-xl transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
      style={{ color: 'var(--text-secondary)' }}
      title="New Agent"
    >
      <Plus size={14} />
    </button>
  ), [handleCreateAgent]);

  const selectedAgent = useMemo(() => 
    agents.find(a => a.id === selectedAgentId), [agents, selectedAgentId]);

  const handleUpdateAgent = useCallback(async (updated: Agent) => {
    await agentService.update(updated.id, {
      name: updated.name,
      description: updated.description,
      tags: updated.tags,
      masterPrompt: updated.masterPrompt,
      workflows: updated.workflows,
      allowedTools: updated.allowedTools,
      allowedWorkflows: updated.allowedWorkflows,
      trigger: updated.trigger,
      config: updated.config,
    });
  }, []);

  const handleSaveNewAgent = useCallback(async (request: CreateAgentRequest) => {
    const created = await agentService.create(request);
    setSelectedAgentId(created.id);
    setActiveTab('agents');
    setIsEditing(false);
  }, []);

  const handleEdit = useCallback(() => setIsEditing(true), []);
  const handleSave = useCallback(() => setIsEditing(false), []);

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const query = searchQuery.toLowerCase();
    return agents.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [agents, searchQuery]);

  return (
    <SecondaryPanel
      isOpen={isOpen}
      onClose={onClose}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={handleTabChange}
      headerActions={headerActions}
      storageKey="skhoot-agents-height"
      defaultHeight={500}
      minHeight={350}
      animationName="agentsSlideUp"
    >
      <div className="h-full flex">
        {activeTab === 'create' ? (
          <AgentCreator onSave={handleSaveNewAgent} onCancel={() => setActiveTab('agents')} />
        ) : (
          <>
            {/* Agent List */}
            <div className="w-1/3 border-r border-white/5 overflow-y-auto custom-scrollbar flex flex-col">
              {activeTab === 'agents' && (
                <>
                  {/* Search Bar */}
                  <div className="p-2 border-b border-white/5">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full text-xs bg-white/5 rounded-lg px-3 py-2 border-none outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                  <AgentList
                    agents={filteredAgents}
                    selectedId={selectedAgentId}
                    onSelect={setSelectedAgentId}
                    onRun={handleRunAgent}
                    onToggleState={handleToggleState}
                    onDelete={handleDeleteAgent}
                  />
                </>
              )}
              {activeTab === 'running' && (
                <RunningList executions={runningExecutions} agents={agents} />
              )}
            </div>

            {/* Agent Detail */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {selectedAgent ? (
                <AgentDetail
                  agent={selectedAgent}
                  isEditing={isEditing}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onUpdateAgent={handleUpdateAgent}
                />
              ) : (
                <EmptyState onCreateAgent={handleCreateAgent} />
              )}
            </div>
          </>
        )}
      </div>
    </SecondaryPanel>
  );
});

AgentsPanel.displayName = 'AgentsPanel';

// ============================================================================
// Sub-components
// ============================================================================

const EmptyState = memo<{ onCreateAgent: () => void }>(({ onCreateAgent }) => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <Bot size={32} className="mb-3 opacity-40" style={{ color: 'var(--text-secondary)' }} />
    <p className="text-sm font-jakarta" style={{ color: 'var(--text-secondary)' }}>
      Select an agent to view details
    </p>
    <button
      onClick={onCreateAgent}
      className="mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all"
    >
      Create New Agent
    </button>
  </div>
));
EmptyState.displayName = 'EmptyState';

const AgentList = memo<{
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onToggleState: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ agents, selectedId, onSelect, onRun, onToggleState, onDelete }) => {
  // Group agents by state
  const groupedAgents = useMemo(() => {
    const groups: Record<string, Agent[]> = {
      on: [],
      off: [],
      sleeping: [],
      failing: []
    };
    agents.forEach(agent => {
      groups[agent.state].push(agent);
    });
    return groups;
  }, [agents]);

  const stateOrder: AgentState[] = ['on', 'sleeping', 'failing', 'off'];

  return (
    <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
      {stateOrder.map(state => {
        const stateAgents = groupedAgents[state];
        if (stateAgents.length === 0) return null;

        return (
          <div key={state}>
            <p className="text-[10px] font-bold uppercase tracking-wider px-2 py-1" 
               style={{ color: 'var(--text-secondary)' }}>
              {state} ({stateAgents.length})
            </p>
            {stateAgents.map(agent => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={selectedId === agent.id}
                onSelect={onSelect}
                onRun={onRun}
                onToggleState={onToggleState}
                onDelete={onDelete}
              />
            ))}
          </div>
        );
      })}
      {agents.length === 0 && (
        <div className="text-center py-8">
          <Bot size={24} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No agents found</p>
        </div>
      )}
    </div>
  );
});
AgentList.displayName = 'AgentList';

const AgentListItem = memo<{
  agent: Agent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRun: (id: string) => void;
  onToggleState: (id: string) => void;
  onDelete: (id: string) => void;
}>(({ agent, isSelected, onSelect, onRun, onToggleState, onDelete }) => (
  <div
    onClick={() => onSelect(agent.id)}
    className={`p-3 rounded-xl cursor-pointer transition-all group ${
      isSelected ? 'bg-emerald-500/20' : 'hover:bg-white/5'
    }`}
  >
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <StateIcon state={agent.state} />
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {agent.name}
        </p>
        {agent.isDefault && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
            DEFAULT
          </span>
        )}
      </div>
    </div>
    <p className="text-xs truncate mb-2" style={{ color: 'var(--text-secondary)' }}>
      {agent.description}
    </p>
    {agent.tags && agent.tags.length > 0 && (
      <div className="flex flex-wrap gap-1 mb-2">
        {agent.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: 'var(--text-secondary)' }}>
            {tag}
          </span>
        ))}
        {agent.tags.length > 3 && (
          <span className="text-[9px] px-1.5 py-0.5" style={{ color: 'var(--text-secondary)' }}>
            +{agent.tags.length - 3}
          </span>
        )}
      </div>
    )}
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button
        onClick={(e) => { e.stopPropagation(); onRun(agent.id); }}
        disabled={agent.state !== 'on'}
        className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50"
        title="Run Agent"
      >
        <Play size={12} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleState(agent.id); }}
        className={`p-1 rounded-lg ${agent.state === 'on' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-emerald-500/20 text-emerald-400'}`}
        title={agent.state === 'on' ? 'Disable' : 'Enable'}
      >
        {agent.state === 'on' ? <PowerOff size={12} /> : <Power size={12} />}
      </button>
      {!agent.isDefault && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}
          className="p-1 rounded-lg hover:bg-red-500/20 text-red-400"
          title="Delete Agent"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  </div>
));
AgentListItem.displayName = 'AgentListItem';

const StateIcon = memo<{ state: AgentState }>(({ state }) => {
  const icons = {
    on: <CheckCircle size={12} className="text-emerald-400" />,
    off: <XCircle size={12} className="text-gray-400" />,
    sleeping: <Moon size={12} className="text-blue-400" />,
    failing: <AlertCircle size={12} className="text-red-400" />,
  };
  return icons[state] || null;
});
StateIcon.displayName = 'StateIcon';

const RunningList = memo<{ executions: AgentExecution[]; agents: Agent[] }>(
  ({ executions, agents }) => (
    <div className="p-2">
      {executions.length === 0 ? (
        <div className="text-center py-8">
          <Zap size={24} className="mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No agents running</p>
        </div>
      ) : (
        executions.map(exec => {
          const agent = agents.find(a => a.id === exec.agentId);
          return (
            <div key={exec.id} className="p-3 rounded-xl bg-amber-500/10 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {agent?.name || 'Unknown'}
                </p>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Execution: {exec.id}
              </p>
              {exec.currentWorkflowId && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Workflow: {exec.currentWorkflowId}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  )
);
RunningList.displayName = 'RunningList';

// Agent Detail and Creator components will be in the next part...
// (Continuing in next message due to length)

// ============================================================================
// Agent Detail Component
// ============================================================================

const AgentDetail = memo<{
  agent: Agent;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdateAgent: (agent: Agent) => void;
}>(({ agent, isEditing, onEdit, onSave, onUpdateAgent }) => {
  const [editedAgent, setEditedAgent] = useState(agent);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  useEffect(() => {
    setEditedAgent(agent);
  }, [agent]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleSave = () => {
    onUpdateAgent(editedAgent);
    onSave();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {isEditing ? (
          <input
            value={editedAgent.name}
            onChange={(e) => setEditedAgent(prev => ({ ...prev, name: e.target.value }))}
            className="text-lg font-bold bg-transparent border-b border-emerald-500/50 outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <StateIcon state={agent.state} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{agent.name}</h3>
            {agent.isDefault && (
              <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-bold">
                DEFAULT
              </span>
            )}
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

      {/* Basic Info */}
      <CollapsibleSection
        title="Basic Information"
        icon={<Bot size={14} />}
        isExpanded={expandedSections.has('basic')}
        onToggle={() => toggleSection('basic')}
      >
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editedAgent.description}
              onChange={(e) => setEditedAgent(prev => ({ ...prev, description: e.target.value }))}
              className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none"
              style={{ color: 'var(--text-secondary)' }}
              rows={2}
              placeholder="Description..."
            />
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Tags (comma-separated)
              </label>
              <input
                value={editedAgent.tags?.join(', ') || ''}
                onChange={(e) => setEditedAgent(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                }))}
                className="w-full text-sm bg-white/5 rounded-xl p-2 border-none outline-none"
                style={{ color: 'var(--text-primary)' }}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{agent.description}</p>
            {agent.tags && agent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agent.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 rounded bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                    <Tag size={10} className="inline mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs mt-2">
              <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                State: {agent.state}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                Usage: {agent.usageCount} times
              </span>
              {agent.lastUsedAt && (
                <span className="px-2 py-1 rounded-lg bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                  Last: {new Date(agent.lastUsedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Master Prompt */}
      <CollapsibleSection
        title="Master Prompt"
        icon={<Code size={14} />}
        isExpanded={expandedSections.has('prompt')}
        onToggle={() => toggleSection('prompt')}
      >
        {isEditing ? (
          <textarea
            value={editedAgent.masterPrompt}
            onChange={(e) => setEditedAgent(prev => ({ ...prev, masterPrompt: e.target.value }))}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none font-mono"
            style={{ color: 'var(--text-primary)' }}
            rows={6}
            placeholder="Master prompt defining agent behavior..."
          />
        ) : (
          <pre className="text-xs whitespace-pre-wrap font-mono p-3 bg-white/5 rounded-xl" style={{ color: 'var(--text-secondary)' }}>
            {agent.masterPrompt}
          </pre>
        )}
      </CollapsibleSection>

      {/* Capabilities */}
      <CollapsibleSection
        title="Capabilities"
        icon={<Layers size={14} />}
        isExpanded={expandedSections.has('capabilities')}
        onToggle={() => toggleSection('capabilities')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Workflows ({agent.workflows?.length || 0})
            </label>
            {agent.workflows && agent.workflows.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {agent.workflows.map(wf => (
                  <span key={wf} className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                    {wf}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No workflows assigned</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Allowed Tools ({agent.allowedTools?.length || 0})
            </label>
            {agent.allowedTools && agent.allowedTools.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {agent.allowedTools.map(tool => (
                  <span key={tool} className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                    {tool}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No tools allowed</p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Trigger */}
      {agent.trigger && (
        <CollapsibleSection
          title="Trigger"
          icon={<Zap size={14} />}
          isExpanded={expandedSections.has('trigger')}
          onToggle={() => toggleSection('trigger')}
        >
          <div className="space-y-2 text-xs">
            <p style={{ color: 'var(--text-primary)' }}>Type: {agent.trigger.type}</p>
            {agent.trigger.keywords && (
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>Keywords:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.trigger.keywords.map(kw => (
                    <span key={kw} className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {agent.trigger.patterns && (
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>Patterns:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.trigger.patterns.map(p => (
                    <span key={p} className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)' }}>
              Auto-activate: {agent.trigger.autoActivate ? 'Yes' : 'No'}
            </p>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
});
AgentDetail.displayName = 'AgentDetail';

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
// Agent Creator
// ============================================================================

const AgentCreator = memo<{
  onSave: (request: CreateAgentRequest) => void;
  onCancel: () => void;
}>(({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [workflows, setWorkflows] = useState('');
  const [allowedTools, setAllowedTools] = useState('');

  const handleSave = () => {
    if (!name.trim() || !masterPrompt.trim()) return;
    
    onSave({
      name: name.trim(),
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      masterPrompt: masterPrompt.trim(),
      workflows: workflows.split(',').map(w => w.trim()).filter(Boolean),
      allowedTools: allowedTools.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  const canSave = name.trim() && masterPrompt.trim();

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Create Agent</h3>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-sm hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!canSave}
            className="px-3 py-1.5 rounded-xl text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Agent name..."
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none"
            style={{ color: 'var(--text-secondary)' }}
            rows={2}
            placeholder="What does this agent do?"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Tags
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="tag1, tag2, tag3"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Comma-separated tags for organization
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Master Prompt *
          </label>
          <textarea
            value={masterPrompt}
            onChange={(e) => setMasterPrompt(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none resize-none font-mono"
            style={{ color: 'var(--text-primary)' }}
            rows={8}
            placeholder="You are an agent that..."
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Define the agent's behavior and personality
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Workflows
          </label>
          <input
            value={workflows}
            onChange={(e) => setWorkflows(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="workflow-1, workflow-2"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Comma-separated workflow IDs
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            Allowed Tools
          </label>
          <input
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
            className="w-full text-sm bg-white/5 rounded-xl p-3 border-none outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="read_file, write_file, search_files"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Comma-separated tool names
          </p>
        </div>
      </div>
    </div>
  );
});
AgentCreator.displayName = 'AgentCreator';

export default AgentsPanel;

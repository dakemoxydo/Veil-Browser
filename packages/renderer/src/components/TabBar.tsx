import React, { useState, useRef, useEffect } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { ProfileSwitcher } from './ProfileSwitcher';

interface ContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

const WIN_BTN_STYLE: React.CSSProperties = {
  width: '46px',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '10px',
  transition: 'background 100ms ease-out',
};

export const TabBar: React.FC = React.memo(() => {
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const dispatch = useVeilStore((s) => s.dispatch);
  const tabGroups = useVeilStore((s) => s.tabGroups);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const draggedTabId = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const handleTablistKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    let nextIndex: number;

    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const nextTab = tabs[nextIndex];
    if (nextTab) {
      dispatch({ type: 'TAB_FOCUS', payload: { id: nextTab.id } });
      const tabEl = document.querySelector(`[role="tab"][aria-label="${CSS.escape(nextTab.title)}"]`) as HTMLElement | null;
      tabEl?.focus();
    }
  };

  const handleTabKeyDown = (tabId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'TAB_FOCUS', payload: { id: tabId } });
    }
  };

  const handleCloseKeyDown = (tabId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: 'TAB_CLOSE', payload: { id: tabId } });
    }
  };

  const handleDragStart = (tabId: string) => (e: React.DragEvent) => {
    draggedTabId.current = tabId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragOver = (tabId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedTabId.current && draggedTabId.current !== tabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTabId(null);
    const sourceId = draggedTabId.current;
    draggedTabId.current = null;
    if (sourceId && sourceId !== targetId) {
      dispatch({ type: 'TAB_REORDER', payload: { sourceId, targetId } });
    }
  };

  const handleDragEnd = () => {
    draggedTabId.current = null;
    setDragOverTabId(null);
  };

  const handleMinimize = async () => {
    try { await window.veil?.minimize(); } catch (e) { console.error('[TabBar] Minimize:', e); }
  };

  const handleMaximize = async () => {
    try { await window.veil?.maximize(); } catch (e) { console.error('[TabBar] Maximize:', e); }
  };

  const handleClose = async () => {
    try { await window.veil?.close(); } catch (e) { console.error('[TabBar] Close:', e); }
  };

  const handleCreateGroup = (tabId: string) => {
    const name = prompt('Group name:');
    if (!name) return;
    const color = `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`;
    dispatch({ type: 'TAB_GROUP_CREATE', payload: { name, color } });
    // After group is created, we need to move the tab into it.
    // Since the group ID is generated server-side, we'll use a workaround:
    // The group will be created and the user can move tabs via the context menu.
    setContextMenu(null);
  };

  const handleRemoveFromGroup = (tabId: string) => {
    dispatch({ type: 'TAB_MOVE_TO_GROUP', payload: { tabId, groupId: null } });
    setContextMenu(null);
  };

  const handleToggleGroup = (groupId: string) => {
    dispatch({ type: 'TAB_GROUP_TOGGLE', payload: { id: groupId } });
  };

  // Group tabs: tabs with groupId are grouped, tabs without are ungrouped
  const ungroupedTabs = tabs.filter(t => !t.groupId);
  const groupedTabs = new Map<string, typeof tabs>();
  for (const tab of tabs) {
    if (tab.groupId) {
      if (!groupedTabs.has(tab.groupId)) {
        groupedTabs.set(tab.groupId, []);
      }
      groupedTabs.get(tab.groupId)!.push(tab);
    }
  }

  const renderTab = (tab: typeof tabs[0]) => {
    const isActive = tab.id === activeTabId;
    const isDragOver = tab.id === dragOverTabId;
    return (
      <div
        key={tab.id}
        role="tab"
        tabIndex={0}
        aria-selected={isActive}
        aria-label={tab.title}
        className={`tab-item ${isActive ? 'active' : ''}`}
        draggable
        onClick={() => dispatch({ type: 'TAB_FOCUS', payload: { id: tab.id } })}
        onKeyDown={handleTabKeyDown(tab.id)}
        onDragStart={handleDragStart(tab.id)}
        onDragOver={handleDragOver(tab.id)}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop(tab.id)}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id });
        }}
        style={{
          borderLeft: isDragOver ? '2px solid var(--accent)' : undefined,
        }}
      >
        {tab.favicon ? (
          <img
            src={tab.favicon}
            alt=""
            style={{ width: '16px', height: '16px', marginRight: '8px', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: '16px',
              height: '16px',
              marginRight: '8px',
              borderRadius: '50%',
              background: 'var(--bg-active)',
              flexShrink: 0,
            }}
          />
        )}
        {tab.isPlayingAudio && !tab.muted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', flexShrink: 0 }}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
        {tab.muted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', flexShrink: 0 }}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-weight-normal)',
          }}
        >
          {tab.title}
        </div>
        <div
          className="close-btn"
          role="button"
          tabIndex={0}
          aria-label={`Close ${tab.title}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'TAB_CLOSE', payload: { id: tab.id } });
          }}
          onKeyDown={handleCloseKeyDown(tab.id)}
        >
          &times;
        </div>
      </div>
    );
  };

  return (
    <div
      className="tab-bar-container"
      role="tablist"
      onKeyDown={handleTablistKeyDown}
      style={{
        display: 'flex',
        background: 'var(--bg-toolbar)',
        minHeight: 'calc(var(--tab-height) + 6px)',
        boxSizing: 'border-box',
        alignItems: 'stretch',
      }}
    >
      {/* Tabs area — empty space is draggable via parent, tabs/buttons are no-drag via CSS */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: '1px',
          padding: '6px 8px 0',
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'flex-end',
          scrollbarWidth: 'none',
        }}
      >
        {/* Ungrouped tabs first */}
        {ungroupedTabs.map(renderTab)}

        {/* Grouped tabs */}
        {Array.from(groupedTabs.entries()).map(([groupId, groupTabs]) => {
          const group = tabGroups.find(g => g.id === groupId);
          if (!group) return groupTabs.map(renderTab);
          const isCollapsed = group.collapsed;
          const hasActive = groupTabs.some(t => t.id === activeTabId);

          return (
            <div key={groupId} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {/* Group header */}
              <button
                onClick={() => handleToggleGroup(groupId)}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} group ${group.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px 4px 0 0',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 500,
                  transition: 'background 100ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: group.color,
                    flexShrink: 0,
                  }}
                />
                <span>{group.name}</span>
                <span style={{ fontSize: '10px', opacity: 0.6 }}>
                  {isCollapsed ? `[${groupTabs.length}]` : '\u25BC'}
                </span>
              </button>
              {/* Group tabs (hidden when collapsed) */}
              {!isCollapsed && groupTabs.map(renderTab)}
            </div>
          );
        })}

        <button
          type="button"
          className="toolbar-btn"
          aria-label="New tab"
          onClick={() => dispatch({ type: 'TAB_NEW', payload: {} })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dispatch({ type: 'TAB_NEW', payload: {} });
            }
          }}
          style={{
            width: '28px',
            height: '28px',
            margin: '0 4px 4px',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      {/* Profile switcher */}
      <div className="no-drag" style={{ display: 'flex', alignItems: 'center', paddingRight: '4px' }}>
        <ProfileSwitcher />
      </div>

      {/* Window controls */}
      <div
        className="no-drag"
        style={{ display: 'flex', flexShrink: 0, alignSelf: 'stretch' }}
      >
        <button
          aria-label="Minimize"
          onClick={handleMinimize}
          style={WIN_BTN_STYLE}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          aria-label="Maximize"
          onClick={handleMaximize}
          style={WIN_BTN_STYLE}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          aria-label="Close"
          onClick={handleClose}
          style={WIN_BTN_STYLE}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>

      {/* Tab context menu */}
      {contextMenu && (
        <div
          role="menu"
          className="tab-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {[
            { label: 'Close tab', action: 'TAB_CLOSE' },
            { label: 'Close other tabs', action: 'TAB_CLOSE_OTHERS' },
            { label: 'Close tabs to the right', action: 'TAB_CLOSE_TO_RIGHT' },
            { type: 'separator' as const },
            { label: tabs.find(t => t.id === contextMenu.tabId)?.pinned ? 'Unpin tab' : 'Pin tab', action: 'TAB_PIN' },
            { label: tabs.find(t => t.id === contextMenu.tabId)?.muted ? 'Unmute tab' : 'Mute tab', action: 'TAB_MUTE' },
            { type: 'separator' as const },
            // Group actions
            ...(tabs.find(t => t.id === contextMenu.tabId)?.groupId
              ? [{ label: 'Remove from group', action: 'REMOVE_FROM_GROUP' as const }]
              : []),
            { label: 'Add to new group...', action: 'CREATE_GROUP' as const },
            // Add to existing groups
            ...tabGroups.map(g => ({
              label: `Move to "${g.name}"`,
              action: 'MOVE_TO_GROUP' as const,
              groupId: g.id,
            })),
          ].map((item, i) => {
            if ('type' in item && item.type === 'separator') {
              return <div key={i} className="tab-context-menu-divider" />;
            }
            return (
              <button
                key={i}
                role="menuitem"
                className="tab-context-menu-item"
                onClick={() => {
                  if (item.action === 'REMOVE_FROM_GROUP') {
                    handleRemoveFromGroup(contextMenu.tabId);
                  } else if (item.action === 'CREATE_GROUP') {
                    handleCreateGroup(contextMenu.tabId);
                  } else if (item.action === 'MOVE_TO_GROUP') {
                    dispatch({ type: 'TAB_MOVE_TO_GROUP', payload: { tabId: contextMenu.tabId, groupId: (item as { groupId: string }).groupId } });
                    setContextMenu(null);
                  } else {
                    dispatch({ type: item.action as 'TAB_CLOSE' | 'TAB_CLOSE_OTHERS' | 'TAB_CLOSE_TO_RIGHT' | 'TAB_PIN' | 'TAB_MUTE', payload: { id: contextMenu.tabId } });
                    setContextMenu(null);
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

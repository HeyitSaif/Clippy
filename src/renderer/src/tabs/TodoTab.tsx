import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TodoItem, TodoList, TodoPriority } from "@shared/types";
import { TODO_SYSTEM_LIST_IDS } from "@shared/types";
import { Toast } from "../components/Toast";
import {
  IconBell,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "../components/icons";
import { useTodos, listLabel, type TodoFilter } from "../hooks/useTodos";
import { useToast } from "../hooks/useToast";
import { cn, isOverdue } from "../lib/utils";

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  0: "—",
  1: "Low",
  2: "Med",
  3: "High",
};

const FILTERS: { id: TodoFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "overdue", label: "Late" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

const EMPTY: Record<string, string> = {
  [TODO_SYSTEM_LIST_IDS.inbox]: "Inbox is clear — add a task above",
  [TODO_SYSTEM_LIST_IDS.daily]: "Nothing for today yet",
  [TODO_SYSTEM_LIST_IDS.weekly]: "No weekly tasks yet",
};

function emptyMessage(list: TodoList | null, filter: TodoFilter): string {
  if (filter === "done") return "No completed tasks";
  if (filter === "overdue") return "No overdue tasks";
  if (filter === "active" && list) {
    return EMPTY[list.id] ?? `No active tasks in ${listLabel(list)}`;
  }
  if (list) return EMPTY[list.id] ?? `No tasks in ${listLabel(list)}`;
  return "No tasks";
}

function toDateInput(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInput(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

function toDatetimeLocal(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromDatetimeLocal(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

export function TodoTab() {
  const {
    lists,
    todos,
    loading,
    selectedListId,
    setSelectedListId,
    selectedList,
    filter,
    setFilter,
    query,
    setQuery,
    showCompleted,
    settings,
    createTodo,
    toggleComplete,
    updateTodo,
    cyclePriority,
    deleteTodo,
    createList,
  } = useTodos();

  const remindersEnabled = settings?.todoRemindersEnabled ?? true;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const newListRef = useRef<HTMLInputElement>(null);
  const { message, show } = useToast();

  const visibleFilters = useMemo(
    () => FILTERS.filter((f) => showCompleted || f.id !== "done"),
    [showCompleted],
  );

  const selectedIndex = useMemo(
    () => (selectedId ? todos.findIndex((t) => t.id === selectedId) : -1),
    [todos, selectedId],
  );

  useEffect(() => {
    setSelectedId(todos[0]?.id ?? null);
  }, [selectedListId, filter, query]);

  useEffect(() => {
    if (selectedId && !todos.some((t) => t.id === selectedId)) {
      setSelectedId(todos[0]?.id ?? null);
    }
  }, [todos, selectedId]);

  useEffect(() => {
    const unsub = window.clippy.onWindowFocused(() => {
      addRef.current?.focus();
    });
    addRef.current?.focus();
    return unsub;
  }, []);

  useEffect(() => {
    if (addingList) newListRef.current?.focus();
  }, [addingList]);

  const handleCreate = useCallback(async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    const item = await createTodo(title);
    if (item) {
      setSelectedId(item.id);
      show("Added");
    } else {
      show("Could not add todo");
    }
  }, [draft, createTodo, show]);

  const handleCreateList = useCallback(async () => {
    const name = newListName.trim();
    if (!name) {
      setAddingList(false);
      setNewListName("");
      return;
    }
    const list = await createList(name);
    setNewListName("");
    setAddingList(false);
    if (list) show("List created");
    else show("Could not create list");
  }, [newListName, createList, show]);

  const handleToggle = useCallback(
    async (id: string) => {
      const ok = await toggleComplete(id);
      if (!ok) show("Action failed");
    },
    [toggleComplete, show],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteTodo(id);
      if (ok) show("Deleted");
      else show("Delete failed");
    },
    [deleteTodo, show],
  );

  const handleCyclePriority = useCallback(
    async (id: string) => {
      const ok = await cyclePriority(id);
      if (!ok) show("Update failed");
    },
    [cyclePriority, show],
  );

  const handleUpdate = useCallback(
    async (id: string, partial: Parameters<typeof updateTodo>[1]) => {
      const ok = await updateTodo(id, partial);
      if (!ok) show("Update failed");
      return ok;
    },
    [updateTodo, show],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (editingId) {
          setEditingId(null);
          e.preventDefault();
          return;
        }
        if (addingList) {
          setAddingList(false);
          setNewListName("");
          e.preventDefault();
          return;
        }
        void window.clippy.hideWindow();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (inInput && !((e.metaKey || e.ctrlKey) && e.key === "Backspace"))
        return;
      if (todos.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(Math.max(selectedIndex, 0) + 1, todos.length - 1);
        setSelectedId(todos[next]?.id ?? null);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(Math.max(selectedIndex, 0) - 1, 0);
        setSelectedId(todos[next]?.id ?? null);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        void handleToggle(todos[selectedIndex].id);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "p" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleCyclePriority(todos[selectedIndex].id);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Backspace" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleDelete(todos[selectedIndex].id);
      } else if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleDelete(todos[selectedIndex].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    todos,
    selectedIndex,
    handleToggle,
    handleDelete,
    handleCyclePriority,
    editingId,
    addingList,
  ]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="no-drag toolbar shrink-0">
        <div className="filter-row" style={{ marginTop: 0, flexWrap: "wrap" }}>
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setSelectedListId(list.id)}
              className={cn(
                "filter-chip",
                selectedListId === list.id && "filter-chip-active",
              )}
            >
              {listLabel(list)}
            </button>
          ))}
          {addingList ? (
            <input
              ref={newListRef}
              type="text"
              value={newListName}
              placeholder="List name…"
              className="todo-list-input"
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateList();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setAddingList(false);
                  setNewListName("");
                }
              }}
              onBlur={() => {
                if (newListName.trim()) void handleCreateList();
                else {
                  setAddingList(false);
                  setNewListName("");
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="filter-chip"
              onClick={() => setAddingList(true)}
              title="New list"
            >
              <IconPlus size={10} className="inline-block" /> List
            </button>
          )}
        </div>

        <div className="search-wrap" style={{ marginTop: 6 }}>
          <IconSearch size={12} className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="glass-search glass-search-compact"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <IconX size={11} />
            </button>
          )}
        </div>

        <div className="search-wrap" style={{ marginTop: 6 }}>
          <input
            ref={addRef}
            type="text"
            placeholder="Add a todo… ↵"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
            className="glass-search glass-search-compact"
            style={{ paddingLeft: 10, paddingRight: 10 }}
          />
        </div>

        <div className="filter-row">
          {visibleFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "filter-chip",
                filter === f.id && "filter-chip-active",
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="clip-count">{loading ? "…" : todos.length}</span>
        </div>
      </div>

      {loading && todos.length === 0 ? (
        <div className="flex flex-1 flex-col gap-1 px-3 py-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shimmer h-9 rounded-md" />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <div className="empty-state">
          {emptyMessage(selectedList, filter)}
        </div>
      ) : (
        <div className="clip-scroll flex-1 overflow-y-auto px-1.5 pb-1.5">
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              selected={todo.id === selectedId}
              editing={todo.id === editingId}
              remindersEnabled={remindersEnabled}
              onSelect={setSelectedId}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onCyclePriority={handleCyclePriority}
              onUpdate={handleUpdate}
              onStartEdit={() => setEditingId(todo.id)}
              onEndEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}

function TodoRow({
  todo,
  selected,
  editing,
  remindersEnabled,
  onSelect,
  onToggle,
  onDelete,
  onCyclePriority,
  onUpdate,
  onStartEdit,
  onEndEdit,
}: {
  todo: TodoItem;
  selected: boolean;
  editing: boolean;
  remindersEnabled: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCyclePriority: (id: string) => void;
  onUpdate: (
    id: string,
    partial: Parameters<typeof window.clippy.updateTodo>[1],
  ) => Promise<boolean>;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTitleDraft(todo.title);
      requestAnimationFrame(() => {
        editRef.current?.focus();
        editRef.current?.select();
      });
    }
  }, [editing, todo.title]);

  const commitTitle = async (): Promise<void> => {
    const next = titleDraft.trim();
    onEndEdit();
    if (!next || next === todo.title) {
      setTitleDraft(todo.title);
      return;
    }
    await onUpdate(todo.id, { title: next });
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(todo.id)}
      className={cn(
        "clip-row todo-row",
        selected && "clip-row-selected",
        todo.isCompleted && "todo-row-done",
      )}
    >
      <button
        type="button"
        className={cn(
          "todo-check",
          todo.isCompleted && "todo-check-done",
        )}
        aria-label={todo.isCompleted ? "Mark incomplete" : "Mark complete"}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(todo.id);
        }}
      >
        {todo.isCompleted ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 12 5 5L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-1">
        {editing ? (
          <input
            ref={editRef}
            type="text"
            className="todo-title-input"
            value={titleDraft}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitTitle();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setTitleDraft(todo.title);
                onEndEdit();
              }
            }}
          />
        ) : (
          <p
            className={cn("clip-preview todo-title", todo.isCompleted && "todo-title-done")}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            title="Double-click to edit"
          >
            {todo.title}
          </p>
        )}
      </div>

      <button
        type="button"
        className={cn(
          "todo-priority",
          `todo-priority-${todo.priority}`,
        )}
        title="Cycle priority"
        onClick={(e) => {
          e.stopPropagation();
          void onCyclePriority(todo.id);
        }}
      >
        {PRIORITY_LABELS[todo.priority]}
      </button>

      <div
        className="todo-meta"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="date"
          className={cn(
            "todo-date-input",
            isOverdue(todo) && "todo-date-input-overdue",
          )}
          value={toDateInput(todo.dueAt)}
          title={todo.dueAt ? "Due date" : "Set due date"}
          onChange={(e) => {
            void onUpdate(todo.id, { dueAt: fromDateInput(e.target.value) });
          }}
        />
        {todo.dueAt != null && (
          <button
            type="button"
            className="todo-meta-clear"
            aria-label="Clear due date"
            title="Clear due"
            onClick={() => void onUpdate(todo.id, { dueAt: null })}
          >
            <IconX size={8} />
          </button>
        )}
      </div>

      {remindersEnabled && (
        <div
          className="todo-meta todo-meta-remind"
          onClick={(e) => e.stopPropagation()}
        >
          <IconBell
            size={9}
            className={
              todo.remindAt
                ? "text-[var(--accent)] shrink-0"
                : "text-[var(--text-tertiary)] shrink-0 opacity-60"
            }
          />
          <input
            type="datetime-local"
            className="todo-datetime-input"
            value={toDatetimeLocal(todo.remindAt)}
            title={todo.remindAt ? "Reminder" : "Set reminder"}
            onChange={(e) => {
              void onUpdate(todo.id, {
                remindAt: fromDatetimeLocal(e.target.value),
              });
            }}
          />
          {todo.remindAt != null && (
            <button
              type="button"
              className="todo-meta-clear"
              aria-label="Clear reminder"
              title="Clear reminder"
              onClick={() => void onUpdate(todo.id, { remindAt: null })}
            >
              <IconX size={8} />
            </button>
          )}
        </div>
      )}

      <div className="todo-row-actions no-drag">
        {!editing && (
          <button
            type="button"
            className="clip-action-btn"
            aria-label="Edit"
            title="Edit title"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
          >
            <IconPencil size={11} />
          </button>
        )}
        <button
          type="button"
          className="clip-action-btn clip-action-btn-danger"
          aria-label="Delete"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(todo.id);
          }}
        >
          <IconTrash size={11} />
        </button>
      </div>
    </div>
  );
}

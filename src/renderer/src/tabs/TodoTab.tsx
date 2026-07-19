import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TodoItem, TodoList, TodoPriority } from "@shared/types";
import { TODO_SYSTEM_LIST_IDS } from "@shared/types";
import { IconTip } from "../components/IconTip";
import { Toast } from "../components/Toast";
import {
  IconBell,
  IconCalendar,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "../components/icons";
import { useTodos, listLabel, type TodoFilter } from "../hooks/useTodos";
import { useToast } from "../hooks/useToast";
import { cn, formatRemindTime, isOverdue } from "../lib/utils";

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

function formatDueTooltip(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function openNativePicker(input: HTMLInputElement | null): void {
  if (!input) return;
  try {
    if (typeof input.showPicker === "function") {
      void input.showPicker();
      return;
    }
  } catch {
    // showPicker can throw if not triggered by a user gesture in some engines
  }
  input.focus();
  input.click();
}

export function TodoTab({
  reminderFocus,
  onReminderFocusHandled,
}: {
  reminderFocus?: { todoId: string; listId: string } | null;
  onReminderFocusHandled?: () => void;
} = {}) {
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
    moveTodo,
    createList,
    renameList,
    deleteList,
  } = useTodos();

  const remindersEnabled = settings?.todoRemindersEnabled ?? true;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const newListRef = useRef<HTMLInputElement>(null);
  const renameListRef = useRef<HTMLInputElement>(null);
  const pendingReminderTodoId = useRef<string | null>(null);
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
    if (!reminderFocus) return;
    pendingReminderTodoId.current = reminderFocus.todoId;
    setFilter("active");
    setQuery("");
    setSelectedListId(reminderFocus.listId);
    setSelectedId(reminderFocus.todoId);
    onReminderFocusHandled?.();
  }, [
    reminderFocus,
    setFilter,
    setQuery,
    setSelectedListId,
    onReminderFocusHandled,
  ]);

  useEffect(() => {
    if (pendingReminderTodoId.current) return;
    setSelectedId(todos[0]?.id ?? null);
  }, [selectedListId, filter, query]);

  useEffect(() => {
    const pending = pendingReminderTodoId.current;
    if (pending && todos.some((t) => t.id === pending)) {
      setSelectedId(pending);
      pendingReminderTodoId.current = null;
      return;
    }
    if (selectedId && !todos.some((t) => t.id === selectedId)) {
      setSelectedId(todos[0]?.id ?? null);
    }
  }, [todos, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const el = document.querySelector(
      `[data-todo-id="${CSS.escape(selectedId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedId, todos]);

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

  useEffect(() => {
    if (renamingListId) renameListRef.current?.focus();
  }, [renamingListId]);

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

  const handleRenameList = useCallback(async () => {
    if (!renamingListId) return;
    const name = renameDraft.trim();
    setRenamingListId(null);
    setRenameDraft("");
    if (!name) return;
    const ok = await renameList(renamingListId, name);
    if (ok) show("List renamed");
    else show("Could not rename list");
  }, [renamingListId, renameDraft, renameList, show]);

  const handleDeleteList = useCallback(async () => {
    if (!selectedList || selectedList.kind !== "custom") return;
    const ok = await deleteList(selectedList.id);
    if (ok) show("List deleted");
    else show("Could not delete list");
  }, [selectedList, deleteList, show]);

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

  const handleMove = useCallback(
    async (id: string, direction: -1 | 1) => {
      const ok = await moveTodo(id, direction);
      if (!ok) show("Could not reorder");
    },
    [moveTodo, show],
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
        if (renamingListId) {
          setRenamingListId(null);
          setRenameDraft("");
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
        if (e.altKey && selectedIndex >= 0) {
          void handleMove(todos[selectedIndex].id, 1);
          return;
        }
        const next = Math.min(Math.max(selectedIndex, 0) + 1, todos.length - 1);
        setSelectedId(todos[next]?.id ?? null);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (e.altKey && selectedIndex >= 0) {
          void handleMove(todos[selectedIndex].id, -1);
          return;
        }
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
    handleMove,
    editingId,
    addingList,
    renamingListId,
  ]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="no-drag toolbar shrink-0">
        <div className="filter-row" style={{ marginTop: 0, flexWrap: "wrap" }}>
          {lists.map((list) =>
            renamingListId === list.id ? (
              <input
                key={list.id}
                ref={renameListRef}
                type="text"
                value={renameDraft}
                className="todo-list-input"
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleRenameList();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setRenamingListId(null);
                    setRenameDraft("");
                  }
                }}
                onBlur={() => void handleRenameList()}
              />
            ) : (
              <button
                key={list.id}
                type="button"
                onClick={() => setSelectedListId(list.id)}
                onDoubleClick={() => {
                  if (list.kind !== "custom") return;
                  setRenamingListId(list.id);
                  setRenameDraft(list.name);
                }}
                className={cn(
                  "filter-chip",
                  selectedListId === list.id && "filter-chip-active",
                )}
                title={
                  list.kind === "custom"
                    ? "Double-click to rename"
                    : listLabel(list)
                }
              >
                {listLabel(list)}
              </button>
            ),
          )}
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
          {selectedList?.kind === "custom" && (
            <button
              type="button"
              className="filter-chip todo-list-delete"
              title="Delete list"
              aria-label="Delete list"
              onClick={() => void handleDeleteList()}
            >
              <IconTrash size={10} />
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
        <div className="empty-state">{emptyMessage(selectedList, filter)}</div>
      ) : (
        <div className="clip-scroll flex-1 overflow-y-auto px-1.5 pb-1.5">
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              lists={lists}
              selected={todo.id === selectedId}
              editing={todo.id === editingId}
              remindersEnabled={remindersEnabled}
              onSelect={setSelectedId}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onCyclePriority={handleCyclePriority}
              onMove={handleMove}
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
  lists,
  selected,
  editing,
  remindersEnabled,
  onSelect,
  onToggle,
  onDelete,
  onCyclePriority,
  onMove,
  onUpdate,
  onStartEdit,
  onEndEdit,
}: {
  todo: TodoItem;
  lists: TodoList[];
  selected: boolean;
  editing: boolean;
  remindersEnabled: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCyclePriority: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (
    id: string,
    partial: Parameters<typeof window.clippy.updateTodo>[1],
  ) => Promise<boolean>;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const [titleDraft, setTitleDraft] = useState(todo.title);
  const [notesDraft, setNotesDraft] = useState(todo.notes ?? "");
  const editRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const dueInputRef = useRef<HTMLInputElement>(null);
  const remindInputRef = useRef<HTMLInputElement>(null);
  const overdue = isOverdue(todo);

  useEffect(() => {
    if (editing) {
      setTitleDraft(todo.title);
      requestAnimationFrame(() => {
        editRef.current?.focus();
        editRef.current?.select();
      });
    }
  }, [editing, todo.title]);

  useEffect(() => {
    setNotesDraft(todo.notes ?? "");
  }, [todo.notes, todo.id]);

  const commitTitle = async (): Promise<void> => {
    const next = titleDraft.trim();
    onEndEdit();
    if (!next || next === todo.title) {
      setTitleDraft(todo.title);
      return;
    }
    await onUpdate(todo.id, { title: next });
  };

  const commitNotes = async (): Promise<void> => {
    const next = notesDraft.trim();
    const prev = todo.notes?.trim() ?? "";
    if (next === prev) return;
    await onUpdate(todo.id, { notes: next || null });
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      data-todo-id={todo.id}
      onClick={() => onSelect(todo.id)}
      className={cn(
        "clip-row todo-row",
        selected && "clip-row-selected",
        todo.isCompleted && "todo-row-done",
        selected && "todo-row-expanded",
      )}
    >
      <div className="todo-row-main">
        <button
          type="button"
          className={cn("todo-check", todo.isCompleted && "todo-check-done")}
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
              className={cn(
                "clip-preview todo-title",
                todo.isCompleted && "todo-title-done",
              )}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              title={todo.notes?.trim() || "Double-click to edit"}
            >
              {todo.title}
              {todo.notes?.trim() ? (
                <span className="todo-notes-hint"> · note</span>
              ) : null}
            </p>
          )}
        </div>

        <button
          type="button"
          className={cn("todo-priority", `todo-priority-${todo.priority}`)}
          title={`Priority: ${PRIORITY_LABELS[todo.priority]} — click to cycle`}
          aria-label={`Priority ${PRIORITY_LABELS[todo.priority]}, cycle priority`}
          onClick={(e) => {
            e.stopPropagation();
            void onCyclePriority(todo.id);
          }}
        >
          {PRIORITY_LABELS[todo.priority]}
        </button>

        <div className="todo-meta" onClick={(e) => e.stopPropagation()}>
          <input
            ref={dueInputRef}
            type="date"
            className="todo-picker-input"
            tabIndex={-1}
            value={toDateInput(todo.dueAt)}
            onChange={(e) => {
              void onUpdate(todo.id, { dueAt: fromDateInput(e.target.value) });
            }}
          />
          <IconTip
            label={
              todo.dueAt != null
                ? overdue
                  ? `Due ${formatDueTooltip(todo.dueAt)} · Overdue`
                  : `Due ${formatDueTooltip(todo.dueAt)}`
                : "Set due date"
            }
            accent={todo.dueAt != null && !overdue}
            danger={overdue}
            className={cn(
              "todo-meta-trigger",
              todo.dueAt != null && "todo-meta-trigger-set",
              overdue && "todo-meta-trigger-overdue",
            )}
            onClick={(e) => {
              e.stopPropagation();
              openNativePicker(dueInputRef.current);
            }}
          >
            <IconCalendar size={12} />
          </IconTip>
          {todo.dueAt != null && (
            <IconTip
              label="Clear due date"
              danger
              className="todo-meta-clear"
              onClick={(e) => {
                e.stopPropagation();
                void onUpdate(todo.id, { dueAt: null });
              }}
            >
              <IconX size={9} />
            </IconTip>
          )}
        </div>

        {remindersEnabled && (
          <div className="todo-meta" onClick={(e) => e.stopPropagation()}>
            <input
              ref={remindInputRef}
              type="datetime-local"
              className="todo-picker-input"
              tabIndex={-1}
              value={toDatetimeLocal(todo.remindAt)}
              onChange={(e) => {
                void onUpdate(todo.id, {
                  remindAt: fromDatetimeLocal(e.target.value),
                });
              }}
            />
            <IconTip
              label={
                todo.remindAt != null
                  ? `Remind ${formatRemindTime(todo.remindAt)}`
                  : "Set reminder"
              }
              accent={todo.remindAt != null}
              className={cn(
                "todo-meta-trigger",
                todo.remindAt != null && "todo-meta-trigger-set",
              )}
              onClick={(e) => {
                e.stopPropagation();
                openNativePicker(remindInputRef.current);
              }}
            >
              <IconBell size={12} />
            </IconTip>
            {todo.remindAt != null && (
              <IconTip
                label="Clear reminder"
                danger
                className="todo-meta-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  void onUpdate(todo.id, { remindAt: null });
                }}
              >
                <IconX size={9} />
              </IconTip>
            )}
          </div>
        )}

        <select
          className="todo-move-select"
          value={todo.listId}
          title="Move to list"
          aria-label="Move to list"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const listId = e.target.value;
            if (listId === todo.listId) return;
            void onUpdate(todo.id, { listId });
          }}
        >
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {listLabel(list)}
            </option>
          ))}
        </select>

        <div className="todo-row-actions no-drag">
          <IconTip
            label="Move up (⌥↑)"
            onClick={(e) => {
              e.stopPropagation();
              onMove(todo.id, -1);
            }}
          >
            ↑
          </IconTip>
          <IconTip
            label="Move down (⌥↓)"
            onClick={(e) => {
              e.stopPropagation();
              onMove(todo.id, 1);
            }}
          >
            ↓
          </IconTip>
          {!editing && (
            <IconTip
              label="Edit title"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              <IconPencil size={11} />
            </IconTip>
          )}
          <IconTip
            label="Delete"
            danger
            onClick={(e) => {
              e.stopPropagation();
              void onDelete(todo.id);
            }}
          >
            <IconTrash size={11} />
          </IconTip>
        </div>
      </div>

      {selected && (
        <textarea
          ref={notesRef}
          className="todo-notes"
          placeholder="Notes…"
          rows={2}
          value={notesDraft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => void commitNotes()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setNotesDraft(todo.notes ?? "");
              notesRef.current?.blur();
            }
          }}
        />
      )}
    </div>
  );
}

import type Database from "better-sqlite3";
import {
  TODO_SYSTEM_LIST_IDS,
  type TodoFilterQuery,
  type TodoItem,
  type TodoList,
  type TodoListKind,
  type TodoPriority,
} from "@shared/types";
import {
  getLogicalDateKey,
  getLogicalIsoWeekKey,
  shouldRotateDaily,
  shouldRotateWeekly,
} from "@shared/todo-rotate";

const META_TODO_SEEDED = "todo_seeded";
const META_LAST_DAILY_ROTATE = "last_todo_rotate_date";
const META_LAST_WEEKLY_ROTATE = "last_todo_rotate_week";

const SYSTEM_KINDS = new Set<TodoListKind>(["inbox", "daily", "weekly"]);

const DEFAULT_LISTS: {
  id: string;
  name: string;
  kind: TodoListKind;
  sortOrder: number;
}[] = [
  {
    id: TODO_SYSTEM_LIST_IDS.inbox,
    name: "Inbox",
    kind: "inbox",
    sortOrder: 0,
  },
  {
    id: TODO_SYSTEM_LIST_IDS.daily,
    name: "Daily",
    kind: "daily",
    sortOrder: 1,
  },
  {
    id: TODO_SYSTEM_LIST_IDS.weekly,
    name: "Weekly",
    kind: "weekly",
    sortOrder: 2,
  },
];

function listRowToList(row: Record<string, unknown>): TodoList {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as TodoListKind,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function todoRowToItem(row: Record<string, unknown>): TodoItem {
  return {
    id: row.id as string,
    listId: row.list_id as string,
    title: row.title as string,
    notes: (row.notes as string | null) ?? null,
    isCompleted: Boolean(row.is_completed),
    priority: clampPriority(row.priority as number),
    dueAt: (row.due_at as number | null) ?? null,
    remindAt: (row.remind_at as number | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
    completedAt: (row.completed_at as number | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

function clampPriority(p: number | undefined | null): TodoPriority {
  if (p === undefined || p === null || !Number.isFinite(p)) return 0;
  const n = Math.floor(p);
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 3;
}

function getMeta(db: Database.Database, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function setMeta(db: Database.Database, key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

function readSettingJson(db: Database.Database, key: string): unknown {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.value) as unknown;
  } catch {
    return undefined;
  }
}

function writeSettingJson(
  db: Database.Database,
  key: string,
  value: unknown,
): void {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, JSON.stringify(value));
}

/** When a system list id is remapped, keep todoDefaultListId in sync. */
function remapDefaultListSetting(
  db: Database.Database,
  oldId: string,
  newId: string,
): void {
  const current = readSettingJson(db, "todoDefaultListId");
  if (current === oldId) {
    writeSettingJson(db, "todoDefaultListId", newId);
  }
}

/** If todoDefaultListId points at a missing list, fall back to Inbox. */
function repairDefaultListSetting(db: Database.Database): void {
  const current = readSettingJson(db, "todoDefaultListId");
  if (typeof current !== "string" || !current) {
    writeSettingJson(db, "todoDefaultListId", TODO_SYSTEM_LIST_IDS.inbox);
    return;
  }
  const exists = db
    .prepare("SELECT 1 AS ok FROM todo_lists WHERE id = ? LIMIT 1")
    .get(current) as { ok: number } | undefined;
  if (!exists) {
    writeSettingJson(db, "todoDefaultListId", TODO_SYSTEM_LIST_IDS.inbox);
  }
}

export interface CreateTodoInput {
  title: string;
  listId: string;
  priority?: TodoPriority;
  dueAt?: number | null;
  notes?: string | null;
  remindAt?: number | null;
}

export type UpdateTodoPartial = Partial<{
  title: string;
  notes: string | null;
  listId: string;
  priority: TodoPriority;
  dueAt: number | null;
  remindAt: number | null;
  sortOrder: number;
  isCompleted: boolean;
}>;

export interface RotateResult {
  /** True when daily completed items were cleared. */
  daily: boolean;
  /** True when weekly completed items were cleared. */
  weekly: boolean;
}

export class TodoRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Seed Inbox / Daily / Weekly lists if missing (meta key `todo_seeded`).
   * Migrates legacy UUID system-list ids → stable `todo-list-*` ids so settings
   * and createTodo (which use TODO_SYSTEM_LIST_IDS) keep working across upgrades.
   */
  static ensureDefaults(db: Database.Database): void {
    const now = Date.now();
    const insert = db.prepare(
      `INSERT INTO todo_lists (id, name, kind, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const findById = db.prepare(
      "SELECT id FROM todo_lists WHERE id = ? LIMIT 1",
    );
    const findByKind = db.prepare(
      "SELECT id FROM todo_lists WHERE kind = ? LIMIT 1",
    );
    const renameList = db.prepare(
      "UPDATE todo_lists SET id = ?, name = ?, sort_order = ?, updated_at = ? WHERE id = ?",
    );
    const reassignTodos = db.prepare(
      "UPDATE todos SET list_id = ? WHERE list_id = ?",
    );

    // PK remaps need FKs off briefly (todos.list_id → todo_lists.id).
    db.pragma("foreign_keys = OFF");
    try {
      for (const def of DEFAULT_LISTS) {
        const byId = findById.get(def.id) as { id: string } | undefined;
        if (byId) continue;

        const byKind = findByKind.get(def.kind) as { id: string } | undefined;
        if (byKind) {
          const oldId = byKind.id;
          if (oldId !== def.id) {
            renameList.run(def.id, def.name, def.sortOrder, now, oldId);
            reassignTodos.run(def.id, oldId);
            remapDefaultListSetting(db, oldId, def.id);
          }
          continue;
        }

        insert.run(def.id, def.name, def.kind, def.sortOrder, now, now);
      }
    } finally {
      db.pragma("foreign_keys = ON");
    }

    repairDefaultListSetting(db);

    if (getMeta(db, META_TODO_SEEDED) !== "true") {
      setMeta(db, META_TODO_SEEDED, "true");
    }
  }

  ensureDefaults(): void {
    TodoRepository.ensureDefaults(this.db);
  }

  listLists(): TodoList[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM todo_lists ORDER BY sort_order ASC, created_at ASC",
      )
      .all() as Record<string, unknown>[];
    return rows.map(listRowToList);
  }

  getListById(id: string): TodoList | null {
    const row = this.db
      .prepare("SELECT * FROM todo_lists WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? listRowToList(row) : null;
  }

  getListByKind(kind: TodoListKind): TodoList | null {
    const row = this.db
      .prepare(
        "SELECT * FROM todo_lists WHERE kind = ? ORDER BY sort_order ASC LIMIT 1",
      )
      .get(kind) as Record<string, unknown> | undefined;
    return row ? listRowToList(row) : null;
  }

  createList(name: string): TodoList {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("List name is required");

    const now = Date.now();
    const id = crypto.randomUUID();
    const maxRow = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM todo_lists")
      .get() as { m: number };
    const sortOrder = maxRow.m + 1;
    this.db
      .prepare(
        `INSERT INTO todo_lists (id, name, kind, sort_order, created_at, updated_at)
         VALUES (?, ?, 'custom', ?, ?, ?)`,
      )
      .run(id, trimmed, sortOrder, now, now);
    return this.getListById(id)!;
  }

  renameList(id: string, name: string): TodoList | null {
    const list = this.getListById(id);
    if (!list) return null;
    const trimmed = name.trim();
    if (!trimmed) throw new Error("List name is required");
    this.db
      .prepare("UPDATE todo_lists SET name = ?, updated_at = ? WHERE id = ?")
      .run(trimmed, Date.now(), id);
    return this.getListById(id);
  }

  /**
   * Delete a custom list (and its todos via CASCADE).
   * System lists (inbox / daily / weekly) cannot be deleted.
   */
  deleteList(id: string): boolean {
    const list = this.getListById(id);
    if (!list) return false;
    if (SYSTEM_KINDS.has(list.kind)) {
      throw new Error(`Cannot delete system list of kind "${list.kind}"`);
    }
    this.db.prepare("DELETE FROM todo_lists WHERE id = ?").run(id);
    return true;
  }

  listTodos(query: TodoFilterQuery = {}): TodoItem[] {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (query.listId) {
      filters.push("list_id = ?");
      params.push(query.listId);
    }
    if (query.completed === true) {
      filters.push("is_completed = 1");
    } else if (query.completed === false) {
      filters.push("is_completed = 0");
    }
    if (query.q?.trim()) {
      const like = `%${query.q.trim().replace(/([%_\\])/g, "\\$1")}%`;
      filters.push(
        `(title LIKE ? ESCAPE '\\' OR IFNULL(notes, '') LIKE ? ESCAPE '\\')`,
      );
      params.push(like, like);
    }

    const where = filters.length ? filters.join(" AND ") : "1=1";
    const sql = `SELECT * FROM todos WHERE ${where}
      ORDER BY is_completed ASC,
        priority DESC,
        CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
        due_at ASC,
        sort_order ASC,
        created_at DESC`;
    const rows = this.db.prepare(sql).all(...params) as Record<
      string,
      unknown
    >[];
    return rows.map(todoRowToItem);
  }

  getTodoById(id: string): TodoItem | null {
    const row = this.db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? todoRowToItem(row) : null;
  }

  /** Incomplete todos with a due reminder at or before `now`. */
  listDueReminders(now: number): TodoItem[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM todos
         WHERE is_completed = 0
           AND remind_at IS NOT NULL
           AND remind_at <= ?
         ORDER BY remind_at ASC`,
      )
      .all(now) as Record<string, unknown>[];
    return rows.map(todoRowToItem);
  }

  createTodo(input: CreateTodoInput): TodoItem {
    const title = input.title.trim();
    if (!title) throw new Error("Todo title is required");
    const list = this.getListById(input.listId);
    if (!list) throw new Error("List not found");

    const now = Date.now();
    const id = crypto.randomUUID();
    const maxRow = this.db
      .prepare(
        "SELECT COALESCE(MAX(sort_order), -1) AS m FROM todos WHERE list_id = ?",
      )
      .get(input.listId) as { m: number };
    const sortOrder = maxRow.m + 1;
    const priority = clampPriority(input.priority);

    this.db
      .prepare(
        `INSERT INTO todos (
          id, list_id, title, notes, is_completed, priority,
          due_at, remind_at, sort_order, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        id,
        input.listId,
        title,
        input.notes ?? null,
        priority,
        input.dueAt ?? null,
        input.remindAt ?? null,
        sortOrder,
        now,
        now,
      );
    return this.getTodoById(id)!;
  }

  updateTodo(id: string, partial: UpdateTodoPartial): TodoItem | null {
    const existing = this.getTodoById(id);
    if (!existing) return null;

    if (partial.listId !== undefined && partial.listId !== existing.listId) {
      const list = this.getListById(partial.listId);
      if (!list) throw new Error("List not found");
    }

    const title =
      partial.title !== undefined ? partial.title.trim() : existing.title;
    if (!title) throw new Error("Todo title is required");

    const notes = partial.notes !== undefined ? partial.notes : existing.notes;
    const listId = partial.listId ?? existing.listId;
    const priority =
      partial.priority !== undefined
        ? clampPriority(partial.priority)
        : existing.priority;
    const dueAt = partial.dueAt !== undefined ? partial.dueAt : existing.dueAt;
    const remindAt =
      partial.remindAt !== undefined ? partial.remindAt : existing.remindAt;
    const sortOrder =
      partial.sortOrder !== undefined ? partial.sortOrder : existing.sortOrder;

    let isCompleted = existing.isCompleted;
    let completedAt = existing.completedAt;
    if (
      partial.isCompleted !== undefined &&
      partial.isCompleted !== existing.isCompleted
    ) {
      isCompleted = partial.isCompleted;
      completedAt = isCompleted ? Date.now() : null;
    }

    const now = Date.now();
    this.db
      .prepare(
        `UPDATE todos SET
          list_id = ?, title = ?, notes = ?, is_completed = ?, priority = ?,
          due_at = ?, remind_at = ?, sort_order = ?, completed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        listId,
        title,
        notes,
        isCompleted ? 1 : 0,
        priority,
        dueAt,
        remindAt,
        sortOrder,
        completedAt,
        now,
        id,
      );
    return this.getTodoById(id);
  }

  toggleComplete(id: string): TodoItem | null {
    const existing = this.getTodoById(id);
    if (!existing) return null;
    return this.updateTodo(id, { isCompleted: !existing.isCompleted });
  }

  deleteTodo(id: string): boolean {
    const result = this.db.prepare("DELETE FROM todos WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Simple reorder within a list: set sort_order to the index of each id.
   */
  reorderTodos(listId: string, orderedIds: string[]): void {
    const list = this.getListById(listId);
    if (!list) throw new Error("List not found");

    const update = this.db.prepare(
      "UPDATE todos SET sort_order = ?, updated_at = ? WHERE id = ? AND list_id = ?",
    );
    const now = Date.now();
    const tx = this.db.transaction(() => {
      orderedIds.forEach((todoId, index) => {
        update.run(index, now, todoId, listId);
      });
    });
    tx();
  }

  /**
   * Rotate Daily / Weekly lists when the logical day or ISO week advances.
   *
   * - Daily: delete completed todos; incomplete stay for the new day.
   * - Weekly: same on ISO week boundary.
   * - First run seeds meta markers without clearing (null → current key).
   *
   * Meta: `last_todo_rotate_date` (YYYY-MM-DD), `last_todo_rotate_week` (YYYY-Www).
   */
  runMidnightRotate(nowMs: number, rotateHour: number): RotateResult {
    const result: RotateResult = { daily: false, weekly: false };
    const dateKey = getLogicalDateKey(nowMs, rotateHour);
    const weekKey = getLogicalIsoWeekKey(nowMs, rotateHour);

    const lastDaily = getMeta(this.db, META_LAST_DAILY_ROTATE);
    if (lastDaily === null) {
      setMeta(this.db, META_LAST_DAILY_ROTATE, dateKey);
    } else if (shouldRotateDaily(lastDaily, nowMs, rotateHour)) {
      const daily = this.getListByKind("daily");
      if (daily) {
        this.db
          .prepare("DELETE FROM todos WHERE list_id = ? AND is_completed = 1")
          .run(daily.id);
      }
      setMeta(this.db, META_LAST_DAILY_ROTATE, dateKey);
      result.daily = true;
    }

    const lastWeekly = getMeta(this.db, META_LAST_WEEKLY_ROTATE);
    if (lastWeekly === null) {
      setMeta(this.db, META_LAST_WEEKLY_ROTATE, weekKey);
    } else if (shouldRotateWeekly(lastWeekly, nowMs, rotateHour)) {
      const weekly = this.getListByKind("weekly");
      if (weekly) {
        this.db
          .prepare("DELETE FROM todos WHERE list_id = ? AND is_completed = 1")
          .run(weekly.id);
      }
      setMeta(this.db, META_LAST_WEEKLY_ROTATE, weekKey);
      result.weekly = true;
    }

    return result;
  }
}

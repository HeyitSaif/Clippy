import { Notification } from "electron";
import log from "electron-log";
import type { SettingsRepository } from "../db/database";
import type { TodoRepository } from "../db/todos";

const INTERVAL_MS = 30_000;

export interface TodoReminderTarget {
  todoId: string;
  listId: string;
}

/**
 * Polls for due todo reminders and fires Electron Notifications.
 * Clears `remind_at` after a notification is shown so it does not re-fire.
 * Clicking a notification opens Clippy on that todo.
 */
export class TodoReminderService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Avoid re-entrant poll work if a previous tick is still finishing. */
  private ticking = false;

  constructor(
    private readonly todoRepo: TodoRepository,
    private readonly settingsRepo: SettingsRepository,
    private readonly onRemindersFired: () => void,
    private readonly onOpenReminder: (target: TodoReminderTarget) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.poll();
    this.timer = setInterval(() => this.poll(), INTERVAL_MS);
    this.timer.unref?.();
    log.info("TodoReminderService started");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
  }

  /** Immediate check (e.g. after settings change or window focus). */
  checkNow(): void {
    this.poll();
  }

  poll(): void {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const settings = this.settingsRepo.getAll();
      if (!settings.todoRemindersEnabled) return;

      if (!Notification.isSupported()) {
        log.warn(
          "TodoReminderService: Notification API not supported on this platform",
        );
        return;
      }

      const now = Date.now();
      const due = this.todoRepo
        .listTodos({ completed: false })
        .filter((t) => t.remindAt != null && t.remindAt <= now);

      if (due.length === 0) return;

      let fired = 0;
      for (const todo of due) {
        try {
          const notification = new Notification({
            title: todo.title,
            body: todo.notes?.trim() ? todo.notes.trim() : "Todo reminder",
            silent: !settings.todoReminderSound,
            timeoutType: "default",
          });
          const target: TodoReminderTarget = {
            todoId: todo.id,
            listId: todo.listId,
          };
          notification.on("click", () => {
            this.onOpenReminder(target);
          });
          notification.show();
          this.todoRepo.updateTodo(todo.id, { remindAt: null });
          fired++;
        } catch (err) {
          log.error(`TodoReminderService failed for todo ${todo.id}`, err);
        }
      }

      if (fired > 0) {
        log.info(`TodoReminderService fired ${fired} reminder(s)`);
        this.onRemindersFired();
      }
    } catch (err) {
      log.error("TodoReminderService poll failed", err);
    } finally {
      this.ticking = false;
    }
  }
}

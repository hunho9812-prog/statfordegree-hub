export interface Page {
  id: string;
  title: string;
  emoji: string;
  content: string; // TipTap JSON stringified
  parentId: string | null;
  children: string[];
  createdAt: string;
  updatedAt: string;
  isExpanded: boolean;
}

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  pages: Record<string, Page>;
  rootPageIds: string[];
  tasks: Task[];
  sidebarCollapsed: boolean;
  // Page actions
  createPage: (parentId?: string | null, insertAfter?: string) => string;
  updatePage: (id: string, updates: Partial<Omit<Page, "id">>) => void;
  deletePage: (id: string) => void;
  togglePageExpand: (id: string) => void;
  // Task actions
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, updates: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  // UI actions
  toggleSidebar: () => void;
}

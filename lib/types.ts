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

export type ContactMethod = "메일" | "카톡" | "크몽" | "";
export type CustomerStatus = "제출완료" | "외주분석중" | "프리랜서응대" | "";

export interface Customer {
  id: string;
  name: string;
  assignee: string;
  contact_method: ContactMethod;
  total_amount: number | null;
  balance: number | null;
  review_proposed: boolean;
  balance_received: boolean;
  kmong_review: boolean;
  kakao_review: boolean;
  submit_date: string;
  status: CustomerStatus;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceState {
  pages: Record<string, Page>;
  rootPageIds: string[];
  tasks: Task[];
  customers: Customer[];
  sidebarCollapsed: boolean;
  darkMode: boolean;
  // Page actions
  createPage: (parentId?: string | null, insertAfter?: string) => string;
  updatePage: (id: string, updates: Partial<Omit<Page, "id">>) => void;
  deletePage: (id: string) => void;
  togglePageExpand: (id: string) => void;
  // Task actions
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, updates: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  // Customer actions
  createCustomer: (customer: Omit<Customer, "id" | "created_at" | "updated_at">) => string;
  updateCustomer: (id: string, updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  deleteCustomer: (id: string) => void;
  // UI actions
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

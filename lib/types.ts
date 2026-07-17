export interface Page {
  id: string;
  title: string;
  emoji: string;
  content: string;
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

export type CustomerRoute = "크몽" | "메일" | "";

export type StatusCategory = "할 일" | "진행 중" | "완료";

export interface StatusOption {
  id: string;
  label: string;
  color: string;       // background color (hex or tailwind-compatible)
  textColor: string;   // text color
  category: StatusCategory;
}

// ─── Dynamic (user-managed) checkbox columns ─────────────────────────────────
// Replaces the old hardcoded 후기제안/잔금받음?/크몽후기/카톡후기 boolean columns.
// Values live in Customer.custom_fields, keyed by CustomColumnDef.id.

export type CustomColumnType = "checkbox";

export interface CustomColumnDef {
  id: string;
  label: string;
  type: CustomColumnType;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  assignee: string;
  route: CustomerRoute;           // display: "Tags" (크몽/메일 dropdown)
  settlement_amount: number | null; // display: "정산금액"
  alba: string;                   // 알바 (자유 입력)
  total_amount: number | null;    // 전체금액
  balance: number | null;         // 잔금
  custom_fields: Record<string, boolean>; // dynamic checkbox columns, keyed by CustomColumnDef.id
  submit_date: string;
  status: string;                 // references a StatusOption id or label
  memo: string;
  monthPageId: string | null;     // associates customer with a month page (null = global)
  created_at: string;
  updated_at: string;
}

// ─── Manual tree ─────────────────────────────────────────────────────────────

export interface ManualNode {
  id: string;
  text: string;
  children: string[];       // ordered list of child node IDs
  parentId: string | null;
  isExpanded: boolean;
  isPinned: boolean;
}

export interface ManualPageData {
  rootItems: string[];                  // ordered top-level node IDs
  items: Record<string, ManualNode>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface WorkspaceState {
  pages: Record<string, Page>;
  rootPageIds: string[];
  tasks: Task[];
  customers: Customer[];
  customerStatuses: StatusOption[];
  customColumns: CustomColumnDef[];
  manualPages: Record<string, ManualPageData>;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  createPage: (parentId?: string | null, insertAfter?: string) => string;
  updatePage: (id: string, updates: Partial<Omit<Page, "id">>) => void;
  deletePage: (id: string) => void;
  togglePageExpand: (id: string) => void;
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => string;
  updateTask: (id: string, updates: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  createCustomer: (customer: Omit<Customer, "id" | "created_at" | "updated_at">) => string;
  updateCustomer: (id: string, updates: Partial<Omit<Customer, "id" | "created_at">>) => void;
  deleteCustomer: (id: string) => void;
  upsertCustomerStatus: (status: StatusOption) => void;
  deleteCustomerStatus: (id: string) => void;
  upsertCustomColumn: (column: CustomColumnDef) => void;
  deleteCustomColumn: (id: string) => void;
  reorderCustomColumns: (orderedIds: string[]) => void;
  addManualNode: (pageId: string, parentId: string | null, afterId?: string) => string;
  updateManualNode: (pageId: string, nodeId: string, updates: Partial<Pick<ManualNode, "text" | "isExpanded" | "isPinned">>) => void;
  deleteManualNode: (pageId: string, nodeId: string) => void;
  moveManualNode: (pageId: string, nodeId: string, afterNodeId: string) => void;
  isRefreshing: boolean;
  syncError: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  loadFromSupabase: () => Promise<void>;
  syncNow: () => Promise<void>;
}

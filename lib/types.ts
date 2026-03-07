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

export interface Customer {
  id: string;
  name: string;
  assignee: string;
  route: CustomerRoute;           // display: "Tags" (크몽/메일 dropdown)
  settlement_amount: number | null; // display: "정산금액"
  alba: string;                   // 알바 (자유 입력)
  total_amount: number | null;    // 전체금액
  balance: number | null;         // 잔금
  review_proposed: boolean;
  balance_received: boolean;
  kmong_review: boolean;
  kakao_review: boolean;
  submit_date: string;
  status: string;                 // references a StatusOption id or label
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceState {
  pages: Record<string, Page>;
  rootPageIds: string[];
  tasks: Task[];
  customers: Customer[];
  customerStatuses: StatusOption[];
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
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

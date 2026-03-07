import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { WorkspaceState, Page, Task, Customer, StatusOption } from "./types";

// Fixed IDs for the 5 main menu sections
export const MENU_IDS = {
  MANUAL: "menu-manual",
  MANUAL_ANALYSIS: "menu-manual-analysis",
  MANUAL_CHECKLIST: "menu-manual-checklist",
  MANUAL_OTHER: "menu-manual-other",
  TAX: "menu-tax",
  ADMATCH: "menu-admatch",
  STATGENIE: "menu-statgenie",
} as const;

const now = new Date().toISOString();

function makeEmptyDoc(text: string) {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text }],
      },
      { type: "paragraph", content: [] },
    ],
  });
}

const initialPages: Record<string, Page> = {
  [MENU_IDS.MANUAL]: {
    id: MENU_IDS.MANUAL,
    title: "메뉴얼",
    emoji: "📋",
    content: makeEmptyDoc("메뉴얼"),
    parentId: null,
    children: [MENU_IDS.MANUAL_ANALYSIS, MENU_IDS.MANUAL_CHECKLIST, MENU_IDS.MANUAL_OTHER],
    createdAt: now,
    updatedAt: now,
    isExpanded: true,
  },
  [MENU_IDS.MANUAL_ANALYSIS]: {
    id: MENU_IDS.MANUAL_ANALYSIS,
    title: "분석시 메뉴얼",
    emoji: "📊",
    content: makeEmptyDoc("분석시 메뉴얼"),
    parentId: MENU_IDS.MANUAL,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [MENU_IDS.MANUAL_CHECKLIST]: {
    id: MENU_IDS.MANUAL_CHECKLIST,
    title: "크레도/응대 체크리스트",
    emoji: "✅",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "크레도/응대 체크리스트" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "고객 첫 응대 완료" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "요구사항 파악" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "분석 일정 확인" }] }],
            },
          ],
        },
      ],
    }),
    parentId: MENU_IDS.MANUAL,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [MENU_IDS.MANUAL_OTHER]: {
    id: MENU_IDS.MANUAL_OTHER,
    title: "기타 문서",
    emoji: "📁",
    content: makeEmptyDoc("기타 문서"),
    parentId: MENU_IDS.MANUAL,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [MENU_IDS.TAX]: {
    id: MENU_IDS.TAX,
    title: "세금 메뉴얼",
    emoji: "💰",
    content: makeEmptyDoc("세금 메뉴얼"),
    parentId: null,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [MENU_IDS.ADMATCH]: {
    id: MENU_IDS.ADMATCH,
    title: "AdMatch",
    emoji: "📢",
    content: makeEmptyDoc("AdMatch"),
    parentId: null,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [MENU_IDS.STATGENIE]: {
    id: MENU_IDS.STATGENIE,
    title: "스탯지니",
    emoji: "🤖",
    content: makeEmptyDoc("스탯지니"),
    parentId: null,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
};

const initialTasks: Task[] = [
  {
    id: uuidv4(),
    title: "팀 메뉴얼 초안 작성",
    description: "온보딩 가이드와 주요 프로세스 문서화",
    status: "in-progress",
    priority: "high",
    assignee: "팀원1",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["문서", "온보딩"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: uuidv4(),
    title: "업무 프로세스 정리",
    description: "주요 업무 흐름을 단계별로 정리",
    status: "todo",
    priority: "medium",
    assignee: "팀원2",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["프로세스"],
    createdAt: now,
    updatedAt: now,
  },
];

const initialCustomers: Customer[] = [];

const initialCustomerStatuses: StatusOption[] = [
  { id: "status-1", label: "분석전작업", color: "#f3f0ff", textColor: "#7c3aed", category: "할 일" },
  { id: "status-2", label: "프리랜서응대", color: "#fef9c3", textColor: "#854d0e", category: "진행 중" },
  { id: "status-3", label: "A/S중", color: "#fff7ed", textColor: "#9a3412", category: "진행 중" },
  { id: "status-4", label: "외주or분석중", color: "#eff6ff", textColor: "#1d4ed8", category: "진행 중" },
  { id: "status-5", label: "제출완료", color: "#f0fdf4", textColor: "#166534", category: "완료" },
];

// Default fields for Customer (handles migration from old schema)
const customerDefaults: Partial<Customer> = {
  route: "",
  settlement_amount: null,
  alba: "",
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      pages: initialPages,
      rootPageIds: [MENU_IDS.MANUAL, MENU_IDS.TAX, MENU_IDS.ADMATCH, MENU_IDS.STATGENIE],
      tasks: initialTasks,
      customers: initialCustomers,
      customerStatuses: initialCustomerStatuses,
      sidebarCollapsed: false,
      darkMode: false,

      createPage: (parentId = null, insertAfter) => {
        const id = uuidv4();
        const newPage: Page = {
          id,
          title: "제목 없음",
          emoji: "📄",
          content: JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph" }],
          }),
          parentId,
          children: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isExpanded: false,
        };

        set((state) => {
          const newPages = { ...state.pages, [id]: newPage };

          if (parentId) {
            const parent = { ...state.pages[parentId] };
            if (insertAfter) {
              const idx = parent.children.indexOf(insertAfter);
              const newChildren = [...parent.children];
              newChildren.splice(idx + 1, 0, id);
              parent.children = newChildren;
            } else {
              parent.children = [...parent.children, id];
            }
            parent.isExpanded = true;
            newPages[parentId] = parent;
            return { pages: newPages };
          } else {
            let newRootIds = [...state.rootPageIds];
            if (insertAfter) {
              const idx = newRootIds.indexOf(insertAfter);
              newRootIds.splice(idx + 1, 0, id);
            } else {
              newRootIds = [...newRootIds, id];
            }
            return { pages: newPages, rootPageIds: newRootIds };
          }
        });

        return id;
      },

      updatePage: (id, updates) => {
        set((state) => ({
          pages: {
            ...state.pages,
            [id]: {
              ...state.pages[id],
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      },

      deletePage: (id) => {
        set((state) => {
          const page = state.pages[id];
          if (!page) return state;

          const deleteRecursive = (
            pageId: string,
            pages: Record<string, Page>
          ): Record<string, Page> => {
            const p = pages[pageId];
            if (!p) return pages;
            let result = { ...pages };
            for (const childId of p.children) {
              result = deleteRecursive(childId, result);
            }
            delete result[pageId];
            return result;
          };

          let newPages = deleteRecursive(id, state.pages);

          if (page.parentId) {
            const parent = newPages[page.parentId];
            if (parent) {
              newPages = {
                ...newPages,
                [page.parentId]: {
                  ...parent,
                  children: parent.children.filter((c) => c !== id),
                },
              };
            }
          }

          const newRootIds = state.rootPageIds.filter((rid) => rid !== id);
          return { pages: newPages, rootPageIds: newRootIds };
        });
      },

      togglePageExpand: (id) => {
        set((state) => ({
          pages: {
            ...state.pages,
            [id]: {
              ...state.pages[id],
              isExpanded: !state.pages[id].isExpanded,
            },
          },
        }));
      },

      createTask: (taskData) => {
        const id = uuidv4();
        const task: Task = {
          id,
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      createCustomer: (customerData) => {
        const id = uuidv4();
        const customer: Customer = {
          id,
          ...customerDefaults,
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ customers: [...state.customers, customer] }));
        return id;
      },

      updateCustomer: (id, updates) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, ...updates, updated_at: new Date().toISOString() }
              : c
          ),
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      upsertCustomerStatus: (status) => {
        set((state) => {
          const exists = state.customerStatuses.find((s) => s.id === status.id);
          if (exists) {
            return {
              customerStatuses: state.customerStatuses.map((s) =>
                s.id === status.id ? status : s
              ),
            };
          }
          return { customerStatuses: [...state.customerStatuses, status] };
        });
      },

      deleteCustomerStatus: (id) => {
        set((state) => ({
          customerStatuses: state.customerStatuses.filter((s) => s.id !== id),
        }));
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      toggleDarkMode: () => {
        set((state) => {
          const next = !state.darkMode;
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next);
          }
          return { darkMode: next };
        });
      },
    }),
    {
      name: "statfordegree-hub-storage",
      version: 3,
      migrate: () => ({
        pages: initialPages,
        rootPageIds: [MENU_IDS.MANUAL, MENU_IDS.TAX, MENU_IDS.ADMATCH, MENU_IDS.STATGENIE],
        tasks: initialTasks,
        customers: initialCustomers,
        customerStatuses: initialCustomerStatuses,
        sidebarCollapsed: false,
        darkMode: false,
      }),
    }
  )
);

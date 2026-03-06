import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { WorkspaceState, Page, Task } from "./types";

const welcomePageId = "welcome-page";
const manualPageId = "manual-page";
const projectPageId = "project-page";
const taskGuideId = "task-guide-page";

const now = new Date().toISOString();

const initialPages: Record<string, Page> = {
  [welcomePageId]: {
    id: welcomePageId,
    title: "Statfordegree Hub 시작하기",
    emoji: "👋",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Statfordegree Hub에 오신 것을 환영합니다!" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "이 공간은 우리 팀의 지식관리 시스템입니다. 업무 메뉴얼, 프로젝트 문서, 팀 정보를 한 곳에 정리하세요.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "⚡ 주요 기능" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "페이지 관리" },
                    { type: "text", text: " — 좌측 사이드바에서 새 페이지를 만들고 계층적으로 정리하세요" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "리치 텍스트 에디터" },
                    { type: "text", text: " — 제목, 목록, 체크박스, 코드 블록 등 다양한 포맷 지원" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "업무 관리" },
                    { type: "text", text: " — 칸반 보드로 팀 업무를 시각적으로 관리하세요" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "자동 저장" },
                    { type: "text", text: " — 모든 변경사항이 자동으로 저장됩니다" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "📝 에디터 사용법" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "에디터에서 텍스트를 선택하면 서식 도구 모음이 나타납니다. 아래 단축키도 사용할 수 있습니다:" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "code" }], text: "Ctrl+B" },
                    { type: "text", text: " — 굵게" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "code" }], text: "Ctrl+I" },
                    { type: "text", text: " — 기울임" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "code" }], text: "Ctrl+U" },
                    { type: "text", text: " — 밑줄" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "code" }], text: "Ctrl+Shift+H" },
                    { type: "text", text: " — 형광펜" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "✅ 할 일" }],
        },
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Statfordegree Hub 계정 생성" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "팀원들과 공유하기" }],
                },
              ],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "첫 번째 팀 메뉴얼 작성하기" }],
                },
              ],
            },
          ],
        },
      ],
    }),
    parentId: null,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [manualPageId]: {
    id: manualPageId,
    title: "팀 메뉴얼",
    emoji: "📚",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "팀 메뉴얼" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "팀의 업무 프로세스, 규칙, 가이드라인을 정리하는 공간입니다.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "📋 목차" }],
        },
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "온보딩 가이드" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "업무 프로세스" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "커뮤니케이션 규칙" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "도구 사용 가이드" }] },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "🚀 온보딩 가이드" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "새 팀원을 위한 온보딩 내용을 여기에 작성하세요..." },
          ],
        },
        { type: "paragraph", content: [] },
      ],
    }),
    parentId: null,
    children: [],
    createdAt: now,
    updatedAt: now,
    isExpanded: false,
  },
  [projectPageId]: {
    id: projectPageId,
    title: "프로젝트",
    emoji: "🗂️",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "프로젝트" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "진행 중인 프로젝트와 계획을 정리하는 공간입니다.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "🟢 진행 중" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "현재 진행 중인 프로젝트를 여기에 정리하세요..." }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "🔜 예정" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "예정된 프로젝트를 여기에 정리하세요..." }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "✅ 완료" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "완료된 프로젝트를 여기에 기록하세요..." }],
        },
      ],
    }),
    parentId: null,
    children: [taskGuideId],
    createdAt: now,
    updatedAt: now,
    isExpanded: true,
  },
  [taskGuideId]: {
    id: taskGuideId,
    title: "업무 관리 가이드",
    emoji: "✅",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "업무 관리 가이드" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "좌측 사이드바의 '업무 보드' 메뉴에서 칸반 보드를 이용해 팀 업무를 관리할 수 있습니다.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "칸반 보드 사용법" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "할 일 (Todo)" },
                    { type: "text", text: " — 아직 시작하지 않은 업무" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "진행 중 (In Progress)" },
                    { type: "text", text: " — 현재 작업 중인 업무" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", marks: [{ type: "bold" }], text: "완료 (Done)" },
                    { type: "text", text: " — 완료된 업무" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
    parentId: projectPageId,
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
  {
    id: uuidv4(),
    title: "Statfordegree Hub 셋업 완료",
    description: "팀원 모두가 사용할 수 있도록 환경 구성",
    status: "done",
    priority: "high",
    assignee: "팀장",
    dueDate: null,
    tags: ["셋업"],
    createdAt: now,
    updatedAt: now,
  },
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      pages: initialPages,
      rootPageIds: [welcomePageId, manualPageId, projectPageId],
      tasks: initialTasks,
      sidebarCollapsed: false,

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

          // Remove from parent or root
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

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: "statfordegree-hub-storage",
      version: 1,
    }
  )
);

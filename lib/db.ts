import { supabase } from "./supabase";
import type { Page, Task, Customer, StatusOption, CustomColumnDef, ManualNode } from "./types";

// ── Type mappers ──────────────────────────────────────────────────────────────

function dbToPage(r: Record<string, unknown>): Page {
  return {
    id: r.id as string,
    title: r.title as string,
    emoji: r.emoji as string,
    content: r.content as string,
    parentId: r.parent_id as string | null,
    children: (r.children as string[]) ?? [],
    isExpanded: r.is_expanded as boolean,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function pageToDb(p: Page) {
  return {
    id: p.id,
    title: p.title,
    emoji: p.emoji,
    content: p.content,
    parent_id: p.parentId,
    children: p.children,
    is_expanded: p.isExpanded,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function dbToTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string,
    status: r.status as Task["status"],
    priority: r.priority as Task["priority"],
    assignee: r.assignee as string,
    dueDate: r.due_date as string | null,
    tags: (r.tags as string[]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function taskToDb(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee,
    due_date: t.dueDate,
    tags: t.tags,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function dbToCustomer(r: Record<string, unknown>): Customer {
  return {
    id: r.id as string,
    name: r.name as string,
    assignee: r.assignee as string,
    route: r.route as Customer["route"],
    settlement_amount: r.settlement_amount as number | null,
    alba: r.alba as string,
    total_amount: r.total_amount as number | null,
    balance: r.balance as number | null,
    custom_fields: (r.custom_fields as Record<string, boolean>) ?? {},
    submit_date: (r.submit_date as string) ?? "",
    status: r.status as string,
    memo: r.memo as string,
    monthPageId: r.month_page_id as string | null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function customerToDb(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    assignee: c.assignee,
    route: c.route,
    settlement_amount: c.settlement_amount,
    alba: c.alba,
    total_amount: c.total_amount,
    balance: c.balance,
    custom_fields: c.custom_fields ?? {},
    submit_date: c.submit_date || null,
    status: c.status,
    memo: c.memo,
    month_page_id: c.monthPageId,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function dbToStatus(r: Record<string, unknown>): StatusOption {
  return {
    id: r.id as string,
    label: r.label as string,
    color: r.color as string,
    textColor: r.text_color as string,
    category: r.category as StatusOption["category"],
  };
}

function statusToDb(s: StatusOption) {
  return {
    id: s.id,
    label: s.label,
    color: s.color,
    text_color: s.textColor,
    category: s.category,
  };
}

function dbToColumn(r: Record<string, unknown>): CustomColumnDef {
  return {
    id: r.id as string,
    label: r.label as string,
    type: r.type as CustomColumnDef["type"],
    order: r.sort_order as number,
  };
}

function columnToDb(c: CustomColumnDef) {
  return {
    id: c.id,
    label: c.label,
    type: c.type,
    sort_order: c.order,
  };
}

function dbToManualNode(r: Record<string, unknown>): ManualNode {
  return {
    id: r.id as string,
    text: r.text as string,
    children: (r.children as string[]) ?? [],
    parentId: r.parent_id as string | null,
    isExpanded: r.is_expanded as boolean,
    isPinned: r.is_pinned as boolean,
  };
}

function manualNodeToDb(node: ManualNode, pageId: string) {
  return {
    id: node.id,
    page_id: pageId,
    text: node.text,
    children: node.children,
    parent_id: node.parentId,
    is_expanded: node.isExpanded,
    is_pinned: node.isPinned,
  };
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export const dbPages = {
  async fetchAll(): Promise<Record<string, Page>> {
    if (!supabase) return {};
    const { data, error } = await supabase.from("pages").select("*");
    if (error) { console.error("dbPages.fetchAll", error); return {}; }
    return Object.fromEntries((data ?? []).map((r) => [r.id, dbToPage(r)]));
  },

  async upsert(page: Page): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("pages").upsert(pageToDb(page));
    if (error) console.error("dbPages.upsert", error);
  },

  async upsertMany(pages: Page[]): Promise<void> {
    if (!supabase || pages.length === 0) return;
    const { error } = await supabase.from("pages").upsert(pages.map(pageToDb));
    if (error) console.error("dbPages.upsertMany", error);
  },

  async update(id: string, fields: Partial<Omit<Page, "id">>): Promise<void> {
    if (!supabase) return;
    const row: Record<string, unknown> = {};
    if (fields.title !== undefined) row.title = fields.title;
    if (fields.emoji !== undefined) row.emoji = fields.emoji;
    if (fields.content !== undefined) row.content = fields.content;
    if (fields.parentId !== undefined) row.parent_id = fields.parentId;
    if (fields.children !== undefined) row.children = fields.children;
    if (fields.isExpanded !== undefined) row.is_expanded = fields.isExpanded;
    if (fields.updatedAt !== undefined) row.updated_at = fields.updatedAt;
    const { error } = await supabase.from("pages").update(row).eq("id", id);
    if (error) console.error("dbPages.update", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) console.error("dbPages.delete", error);
  },
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const dbTasks = {
  async fetchAll(): Promise<Task[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("tasks").select("*").order("created_at");
    if (error) { console.error("dbTasks.fetchAll", error); return []; }
    return (data ?? []).map(dbToTask);
  },

  async upsert(task: Task): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("tasks").upsert(taskToDb(task));
    if (error) console.error("dbTasks.upsert", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) console.error("dbTasks.delete", error);
  },
};

// ── Customers ─────────────────────────────────────────────────────────────────

export const dbCustomers = {
  async fetchAll(): Promise<Customer[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("customers").select("*").order("created_at");
    if (error) { console.error("dbCustomers.fetchAll", error); return []; }
    return (data ?? []).map(dbToCustomer);
  },

  async upsert(customer: Customer): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("customers").upsert(customerToDb(customer));
    if (error) console.error("dbCustomers.upsert", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) console.error("dbCustomers.delete", error);
  },
};

// ── Customer Statuses ─────────────────────────────────────────────────────────

export const dbCustomerStatuses = {
  async fetchAll(): Promise<StatusOption[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("customer_statuses").select("*");
    if (error) { console.error("dbCustomerStatuses.fetchAll", error); return []; }
    return (data ?? []).map(dbToStatus);
  },

  async upsert(status: StatusOption): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("customer_statuses").upsert(statusToDb(status));
    if (error) console.error("dbCustomerStatuses.upsert", error);
  },

  async upsertMany(statuses: StatusOption[]): Promise<void> {
    if (!supabase || statuses.length === 0) return;
    const { error } = await supabase.from("customer_statuses").upsert(statuses.map(statusToDb));
    if (error) console.error("dbCustomerStatuses.upsertMany", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("customer_statuses").delete().eq("id", id);
    if (error) console.error("dbCustomerStatuses.delete", error);
  },
};

// ── Table Columns (dynamic checkbox columns metadata) ─────────────────────────

export const dbTableColumns = {
  async fetchAll(): Promise<CustomColumnDef[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("table_columns").select("*").order("sort_order");
    if (error) { console.error("dbTableColumns.fetchAll", error); return []; }
    return (data ?? []).map(dbToColumn);
  },

  async upsert(column: CustomColumnDef): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("table_columns").upsert(columnToDb(column));
    if (error) console.error("dbTableColumns.upsert", error);
  },

  async upsertMany(columns: CustomColumnDef[]): Promise<void> {
    if (!supabase || columns.length === 0) return;
    const { error } = await supabase.from("table_columns").upsert(columns.map(columnToDb));
    if (error) console.error("dbTableColumns.upsertMany", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("table_columns").delete().eq("id", id);
    if (error) console.error("dbTableColumns.delete", error);
  },
};

// ── Manual Nodes ──────────────────────────────────────────────────────────────

export const dbManualNodes = {
  async fetchAll(): Promise<{ pageId: string; node: ManualNode }[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("manual_nodes").select("*");
    if (error) { console.error("dbManualNodes.fetchAll", error); return []; }
    return (data ?? []).map((r) => ({ pageId: r.page_id as string, node: dbToManualNode(r) }));
  },

  async upsert(node: ManualNode, pageId: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("manual_nodes").upsert(manualNodeToDb(node, pageId));
    if (error) console.error("dbManualNodes.upsert", error);
  },

  async delete(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from("manual_nodes").delete().eq("id", id);
    if (error) console.error("dbManualNodes.delete", error);
  },

  async deleteMany(ids: string[]): Promise<void> {
    if (!supabase || ids.length === 0) return;
    const { error } = await supabase.from("manual_nodes").delete().in("id", ids);
    if (error) console.error("dbManualNodes.deleteMany", error);
  },
};

// ── Manual Page Roots ─────────────────────────────────────────────────────────

export const dbManualPageRoots = {
  async fetchAll(): Promise<Record<string, string[]>> {
    if (!supabase) return {};
    const { data, error } = await supabase.from("manual_page_roots").select("*");
    if (error) { console.error("dbManualPageRoots.fetchAll", error); return {}; }
    return Object.fromEntries(
      (data ?? []).map((r) => [r.page_id as string, (r.root_items as string[]) ?? []])
    );
  },

  async upsert(pageId: string, rootItems: string[]): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("manual_page_roots")
      .upsert({ page_id: pageId, root_items: rootItems });
    if (error) console.error("dbManualPageRoots.upsert", error);
  },
};

// ── Workspace Config ──────────────────────────────────────────────────────────

export const dbWorkspaceConfig = {
  async get(key: string): Promise<unknown> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("workspace_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) { console.error("dbWorkspaceConfig.get", error); return null; }
    return data?.value ?? null;
  },

  async set(key: string, value: unknown): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("workspace_config")
      .upsert({ key, value });
    if (error) console.error("dbWorkspaceConfig.set", error);
  },
};

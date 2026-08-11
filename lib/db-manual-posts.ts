import { supabase } from "./supabase";

export interface ManualPost {
  id: number;
  title: string;
  content: string;
  author_id: string | null;
  author_name: string;
  category: string;
  prefix: string;
  is_notice: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManualPostInput {
  title: string;
  content: string;
  author_id: string | null;
  author_name: string;
  category: string;
  prefix: string;
  is_notice?: boolean;
}

export const PREFIXES = ["", "[공유]", "[지침]"] as const;
export type Prefix = (typeof PREFIXES)[number];

export async function fetchPosts(opts?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ posts: ManualPost[]; total: number }> {
  if (!supabase) return { posts: [], total: 0 };

  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("manual_posts")
    .select("*", { count: "exact" })
    .order("is_notice", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (opts?.search) {
    query = query.ilike("title", `%${opts.search}%`);
  }

  const { data, error, count } = await query;
  if (error) { console.error(error); return { posts: [], total: 0 }; }
  return { posts: (data ?? []) as ManualPost[], total: count ?? 0 };
}

export async function fetchPost(id: number): Promise<ManualPost | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("manual_posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error(error); return null; }
  return data as ManualPost;
}

export async function createPost(input: ManualPostInput): Promise<ManualPost | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("manual_posts")
    .insert(input)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data as ManualPost;
}

export async function updatePost(id: number, input: Partial<ManualPostInput>): Promise<ManualPost | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("manual_posts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data as ManualPost;
}

export async function deletePost(id: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("manual_posts").delete().eq("id", id);
  if (error) { console.error(error); return false; }
  return true;
}

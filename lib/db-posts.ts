import { supabase } from "./supabase";

export interface Post {
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

export interface PostInput {
  title: string;
  content: string;
  author_id: string | null;
  author_name: string;
  category: string;
  prefix: string;
  is_notice?: boolean;
}

// 메뉴얼/버그신고 등 "게시판형" 테이블에 공통으로 쓰는 CRUD. 테이블 이름만 바꿔서
// 완전히 독립된 게시판을 만들 수 있도록 테이블명을 주입받는 팩토리 형태로 둠.
export function createPostApi(table: string) {
  async function fetchPosts(opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ posts: Post[]; total: number }> {
    if (!supabase) return { posts: [], total: 0 };

    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order("is_notice", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (opts?.search) {
      query = query.ilike("title", `%${opts.search}%`);
    }

    const { data, error, count } = await query;
    if (error) { console.error(error); return { posts: [], total: 0 }; }
    return { posts: (data ?? []) as Post[], total: count ?? 0 };
  }

  async function fetchPost(id: number): Promise<Post | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();
    if (error) { console.error(error); return null; }
    return data as Post;
  }

  async function createPost(input: PostInput): Promise<Post | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(table)
      .insert(input)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data as Post;
  }

  async function updatePost(id: number, input: Partial<PostInput>): Promise<Post | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(table)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data as Post;
  }

  async function deletePost(id: number): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { console.error(error); return false; }
    return true;
  }

  return { fetchPosts, fetchPost, createPost, updatePost, deletePost };
}

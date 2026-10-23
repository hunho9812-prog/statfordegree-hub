import { createPostApi, type Post, type PostInput } from "./db-posts";

export type BugPost = Post;
export type BugPostInput = PostInput;

export const PREFIXES = ["", "[버그]", "[건의]"] as const;
export type Prefix = (typeof PREFIXES)[number];

const api = createPostApi("bug_reports");
export const fetchPosts = api.fetchPosts;
export const fetchPost = api.fetchPost;
export const createPost = api.createPost;
export const updatePost = api.updatePost;
export const deletePost = api.deletePost;

import { createPostApi, type Post, type PostInput } from "./db-posts";

export type ManualPost = Post;
export type ManualPostInput = PostInput;

export const PREFIXES = ["", "[공유]", "[지침]"] as const;
export type Prefix = (typeof PREFIXES)[number];

const api = createPostApi("manual_posts");
export const fetchPosts = api.fetchPosts;
export const fetchPost = api.fetchPost;
export const createPost = api.createPost;
export const updatePost = api.updatePost;
export const deletePost = api.deletePost;

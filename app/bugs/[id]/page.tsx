import BugPostView from "@/components/BugPostView";

export default async function BugPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BugPostView postId={Number(id)} />;
}

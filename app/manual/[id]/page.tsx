import ManualPostView from "@/components/ManualPostView";

export default async function ManualPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManualPostView postId={Number(id)} />;
}

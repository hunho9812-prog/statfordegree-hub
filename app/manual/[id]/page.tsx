import ManualPostViewWrapper from "@/components/ManualPostViewWrapper";

export default async function ManualPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManualPostViewWrapper postId={Number(id)} />;
}

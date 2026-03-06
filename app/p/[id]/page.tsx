import PageEditorWrapper from "@/components/PageEditorWrapper";

export default async function PageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PageEditorWrapper pageId={id} />;
}

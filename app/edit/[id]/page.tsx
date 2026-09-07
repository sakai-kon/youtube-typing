import { redirect } from 'next/navigation';

export default async function EditMapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/create?edit=${encodeURIComponent(id)}`);
}

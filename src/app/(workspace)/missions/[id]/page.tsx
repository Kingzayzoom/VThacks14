import { Field } from "@/components/field";
export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Field missionId={id} />;
}

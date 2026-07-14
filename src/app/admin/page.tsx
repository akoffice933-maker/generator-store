import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/requireRole";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Панель сотрудников — Generator Store" };

export default async function AdminPage() {
  const session = await requireStaff();
  if (!session) redirect("/login");
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><span className="text-sm font-semibold uppercase tracking-wide text-[#E0561E]">Для сотрудников</span><h1 className="font-display mt-2 text-3xl font-bold">Панель управления</h1><p className="mt-3 text-sm text-gray-400">Вы вошли как {session.name}. Роль: {session.role}.</p><div className="mt-8"><AdminDashboard /></div></main>;
}

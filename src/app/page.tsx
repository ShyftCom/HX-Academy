import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if ((session.user as any)?.isPlayer) redirect("/player");
  redirect("/dashboard");
}

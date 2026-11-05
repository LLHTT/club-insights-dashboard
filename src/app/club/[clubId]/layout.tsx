import { ClubSwitcher } from "@/components/club-switcher";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">Club Insights</span>
        <ClubSwitcher activeClubId={clubId} />
      </header>
      {children}
    </div>
  );
}

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
      <header className="border-b px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Club Insights</span>
          <ClubSwitcher activeClubId={clubId} />
        </div>
      </header>
      {children}
    </div>
  );
}

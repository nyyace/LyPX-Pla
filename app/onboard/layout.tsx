export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800">
        <span className="text-sm font-semibold text-white tracking-wide">LyPX</span>
        <span className="text-xs text-gray-500 ml-2">Driver Registration</span>
      </header>
      <main className="flex-1 flex items-start justify-center pt-12 px-4 pb-16">
        {children}
      </main>
    </div>
  );
}

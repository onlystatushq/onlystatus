import Image from "next/image";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <aside className="col-span-1 flex w-full flex-col gap-4 border border-border bg-sidebar p-4 backdrop-blur-[2px] md:p-8 xl:col-span-2">
        <a href="/" className="relative h-8 w-8">
          <Image
            src="/icon.png"
            alt="OnlyStatus"
            height={32}
            width={32}
            className="rounded-full border border-border"
          />
        </a>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 text-center md:text-left">
          <div className="mx-auto grid gap-3">
            <h1 className="font-cal text-3xl text-foreground">
              Self-Hosted Monitoring
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitor your websites and APIs, create status pages, and get
              alerts when things break. Fully self-hosted, no cloud
              dependencies.
            </p>
          </div>
        </div>
        <div className="md:h-8" />
      </aside>
      <main className="container col-span-1 mx-auto flex items-center justify-center md:col-span-1 xl:col-span-3">
        {children}
      </main>
    </div>
  );
}

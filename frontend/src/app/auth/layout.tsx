import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-6 pt-[env(safe-area-inset-top)]">
      <Image
        src="/logo.png"
        alt="School Tools"
        width={104}
        height={104}
        priority
      />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
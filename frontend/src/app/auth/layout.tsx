import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-6 bg-background">
      <Image src="/logo.png" alt="School Tools" width={128} height={128} priority />
      {children}
    </div>
  )
}
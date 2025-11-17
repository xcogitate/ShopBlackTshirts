import Image from "next/image"
import Link from "next/link"

type SiteLogoProps = {
  className?: string
  priority?: boolean
  size?: "sm" | "md" | "lg"
}

export default function SiteLogo({ className = "", priority = false, size = "md" }: SiteLogoProps) {
  const baseClasses = "inline-flex items-center"
  const classes = className ? `${baseClasses} ${className}` : baseClasses
  const sizeClasses: Record<NonNullable<SiteLogoProps["size"]>, string> = {
    sm: "h-8 sm:h-10",
    md: "h-11 sm:h-16 lg:h-22",
    lg: "h-16 sm:h-24 lg:h-30",
  }
  const heights = sizeClasses[size]

  return (
    <Link href="/" className={classes} aria-label="Shopblacktshirts home">
      <Image
        src="/shopblacktshirts-logo.png"
        alt="Shopblacktshirts logo"
        width={768}
        height={768}
        priority={priority}
        className={`${heights} w-auto object-contain`}
      />
    </Link>
  )
}

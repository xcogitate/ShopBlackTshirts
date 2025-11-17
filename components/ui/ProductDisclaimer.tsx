import { cn } from "@/lib/utils"

type ProductDisclaimerProps = {
  className?: string
}

export default function ProductDisclaimer({ className }: ProductDisclaimerProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#1f1f1f] bg-gradient-to-b from-[#111] to-[#0b0b0b] p-6 text-sm leading-relaxed text-gray-300",
        className,
      )}
    >
      <p className="text-white">
        Disclaimer: ShopBlackTShirts is a one-man, self-taught creative studio — every piece is personally crafted with
        care. Because each shirt is made by hand, slight variations in print or finish may occur, adding to the uniqueness
        of every garment. We&apos;re not a mass-production brand or factory line — just a passion-driven effort to deliver
        bold, art-inspired designs you won&apos;t find anywhere else.
      </p>
      <p className="mt-3">
        Thank you for supporting independent creativity and being part of a movement that celebrates originality and
        culture through every stitch.
      </p>
    </section>
  )
}

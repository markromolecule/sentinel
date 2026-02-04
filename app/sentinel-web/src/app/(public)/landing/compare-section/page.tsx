import Image from "next/image";
import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/app/(public)/landing/_constants";

export default function CompareSection() {
  return (
    <section id="compare" className="py-20 md:py-28 bg-[#0f0f10] relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-start text-left md:items-center md:text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 mb-4 md:mb-6">
            <Image src="/icons/icon0.svg" alt="Sentinel" width={20} height={20} className="w-5 h-5" />
            <span className="text-base text-gray-400 font-medium tracking-wide">Quick Comparison</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-normal text-blue-200 mb-4 md:mb-6 font-sans tracking-tight max-w-3xl leading-tight">
            How Sentinel stands out.
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl">
            A side-by-side comparison of the next-generation proctoring features.
          </p>
        </div>

        <div className="max-w-6xl mx-auto relative group">
          {/* Decorative Side Dots (Hidden on Mobile) */}
          <div className="absolute -left-12 top-0 bottom-0 py-12 hidden lg:flex flex-col justify-between items-center opacity-30">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-gray-500/50" />
            ))}
          </div>

          {/* Responsive Table Container */}
          <div className="rounded-3xl border border-white/5 bg-[#131315]/50 backdrop-blur-sm shadow-2xl overflow-hidden relative">
            <div className="overflow-x-auto scroller">
              <Table className="min-w-[600px] md:min-w-0">
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-white/5 h-16 md:h-24">
                    <TableHead className="py-4 md:py-8 pl-6 md:pl-10 text-xs font-bold text-gray-500 uppercase tracking-[0.2em] w-[200px] md:w-auto">Feature</TableHead>
                    <TableHead className="text-center py-4 md:py-8 text-sm md:text-lg font-bold text-blue-400 bg-blue-400/[0.03] w-[120px] md:min-w-[200px] border-x border-white/5">Sentinel</TableHead>
                    <TableHead className="text-center py-4 md:py-8 text-sm md:text-lg font-medium text-gray-400 w-[120px] md:min-w-[200px]">ProctorU</TableHead>
                    <TableHead className="text-center py-4 md:py-8 text-sm md:text-lg font-medium text-gray-400 w-[120px] md:min-w-[200px]">SEB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEATURES.map((feature, index) => (
                    <TableRow key={index} className="border-white/5 hover:bg-white/5 transition-colors group/row">
                      <TableCell className="font-medium pl-6 md:pl-10 py-4 md:py-8">
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover/row:border-blue-400/20 group-hover/row:bg-blue-400/[0.03] transition-all flex-shrink-0">
                            <feature.icon className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover/row:text-blue-400 transition-colors" strokeWidth={1.5} />
                          </div>
                          <div className="flex flex-col gap-0.5 md:gap-1">
                            <span className="text-sm md:text-base text-gray-200 font-semibold tracking-tight whitespace-nowrap md:whitespace-normal">{feature.name}</span>
                            <span className="hidden md:block text-xs text-gray-500 font-normal">{feature.description}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Sentinel Column (Highlighted) */}
                      <TableCell className="text-center py-4 md:py-8 bg-blue-400/[0.03] border-x border-white/5">
                        <ComparisonValue value={feature.sentinel} isPrimary />
                      </TableCell>

                      {/* ProctorU Column */}
                      <TableCell className="text-center py-4 md:py-8">
                        <ComparisonValue value={feature.proctorU} />
                      </TableCell>

                      {/* SEB Column */}
                      <TableCell className="text-center py-4 md:py-8">
                        <ComparisonValue value={feature.seb} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Scroll Hint for Mobile */}
          <div className="md:hidden text-center mt-4 text-xs text-gray-600 font-medium tracking-wide">
            Scroll horizontally to see more
          </div>

        </div>
      </div>
    </section>
  );
}

function ComparisonValue({ value, isPrimary = false }: { value: string | boolean, isPrimary?: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className={cn(
          "rounded-full flex items-center justify-center",
          "w-5 h-5 md:w-6 md:h-6",
          isPrimary ? "bg-blue-400/20 text-blue-400" : "bg-white/10 text-gray-400"
        )}>
          <Check className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
        </div>
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex justify-center">
        <div className={cn(
          "rounded-full flex items-center justify-center bg-white/5 text-gray-700",
          "w-5 h-5 md:w-6 md:h-6"
        )}>
          <X className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 md:gap-2">
      <span className={cn(
        "text-xs md:text-sm font-semibold tracking-wide text-center",
        isPrimary ? "text-blue-400" : "text-gray-500"
      )}>
        {value}
      </span>
    </div>
  );
}

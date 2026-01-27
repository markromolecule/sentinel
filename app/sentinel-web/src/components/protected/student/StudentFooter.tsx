export default function StudentFooter() {
    return (
        <footer className="border-t border-white/10 bg-[#0f0f10] py-8 mt-auto">
            <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Sentinel</span>
                    <span className="text-white/40 text-sm">© 2026</span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                        Privacy Policy
                    </a>
                    <a href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                        Terms and Conditions
                    </a>
                </div>
            </div>
        </footer>
    );
}

export default function StudentFooter() {
    return (
        <footer className="border-t border-border/40 bg-background py-8 mt-auto">
            <div className="container mx-auto px-4 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Sentinel</span>
                    <span className="text-muted-foreground text-sm">© 2026</span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Privacy Policy
                    </a>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Terms and Conditions
                    </a>
                </div>
            </div>
        </footer>
    );
}

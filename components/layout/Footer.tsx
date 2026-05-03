export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-khoj-border bg-khoj-card">
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-display font-bold mb-3 text-khoj-accent">KHOJ</h3>
            <p className="text-sm text-khoj-subtle">Compete. Win. Grow.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-khoj-subtle">
              <li><a href="#" className="hover:text-khoj-accent">Tournaments</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Leaderboard</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Jobs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Resources</h4>
            <ul className="space-y-2 text-sm text-khoj-subtle">
              <li><a href="#" className="hover:text-khoj-accent">Docs</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Blog</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Help</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-khoj-subtle">
              <li><a href="#" className="hover:text-khoj-accent">Privacy</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Terms</a></li>
              <li><a href="#" className="hover:text-khoj-accent">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-khoj-border pt-8 text-sm text-khoj-subtle text-center">
          <p>&copy; {currentYear} KHOJ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

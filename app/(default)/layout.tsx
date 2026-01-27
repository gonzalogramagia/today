import Footer from '../components/footer'

export default function DefaultLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="max-w-xl mx-auto px-4 mt-24">
            <main className="flex-auto min-w-0 mt-6 flex flex-col">
                {children}
                <Footer />
            </main>
        </div>
    )
}

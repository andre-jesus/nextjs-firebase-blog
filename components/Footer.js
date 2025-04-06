import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 dark:bg-gray-900 text-white py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p>&copy; {year} My Blog. All rights reserved.</p>
          </div>
          <div className="flex space-x-4">
            <Link href="/about" className="hover:text-blue-300">
              About
            </Link>
            <Link href="/privacy" className="hover:text-blue-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-blue-300">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-blue-300">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
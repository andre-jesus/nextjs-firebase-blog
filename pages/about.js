import Head from 'next/head';

export default function About() {
  return (
    <>
      <Head>
        <title>About | My Blog</title>
        <meta name="description" content="Learn more about our blog" />
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">About</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 prose max-w-none">
          <p>
            Welcome to our blog! This is a platform built with Next.js and
            Firebase, designed to showcase articles on various topics of
            interest.
          </p>
          
          <h2>Our Mission</h2>
          <p>
            Our mission is to provide high-quality, informative, and engaging
            content. We aim to share knowledge, insights, and perspectives on
            subjects that matter.
          </p>
          
          <h2>The Team</h2>
          <p>
            Our team consists of passionate writers, developers, and content
            creators who are dedicated to bringing you the best articles and
            insights.
          </p>
          
          <h2>Technology</h2>
          <p>
            This blog is built using modern web technologies:
          </p>
          <ul>
            <li>Next.js for the frontend</li>
            <li>Firebase for authentication and database</li>
            <li>Tailwind CSS for styling</li>
            <li>Markdown for content formatting</li>
          </ul>
          
          <h2>Contact</h2>
          <p>
            We'd love to hear from you! If you have any questions, suggestions,
            or feedback, please feel free to contact us via the contact form or
            through our social media channels.
          </p>
        </div>
      </div>
    </>
  );
}
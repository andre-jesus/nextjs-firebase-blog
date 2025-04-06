import Head from 'next/head';

export default function SEO({ 
  title, 
  description, 
  ogType = 'website',
  ogImage,
  canonicalUrl,
  twitterHandle = '@yourtwitterhandle' 
}) {
  // Create the full title with site name
  const fullTitle = title ? `${title} | My Blog` : 'My Blog';
  
  // Use default description if not provided
  const metaDescription = description || 'A blog built with Next.js and Firebase';
  
  // Use default OG image if not provided
  const ogImageUrl = ogImage || 'https://yourdomain.com/og-default.jpg';

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content="My Blog" />
      
      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
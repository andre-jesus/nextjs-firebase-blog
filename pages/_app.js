import '../styles/globals.css';
import { ThemeProvider } from '../lib/ThemeContext';
import Layout from '../components/layout/Layout';

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  )
}

export default MyApp

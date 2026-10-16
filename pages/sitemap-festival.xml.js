import { sendFeed } from '../src/utils/feedResponse'
import { generateFestivalSitemap } from '../src/utils/sitemapGenerator'

export default function Feed() { return null }

export async function getServerSideProps({ res }) {
  return sendFeed(res, 'application/xml; charset=utf-8', await generateFestivalSitemap())
}

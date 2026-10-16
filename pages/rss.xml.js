import { sendFeed } from '../src/utils/feedResponse'
import { buildRss } from '../src/utils/seoFeeds'

export default function Feed() { return null }

export async function getServerSideProps({ res }) {
  return sendFeed(res, 'application/rss+xml; charset=utf-8', buildRss())
}

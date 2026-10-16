import { sendFeed } from '../src/utils/feedResponse'
import { buildRobots } from '../src/utils/seoFeeds'

export default function Feed() { return null }

export async function getServerSideProps({ res }) {
  return sendFeed(res, 'text/plain; charset=utf-8', buildRobots(), 'public, s-maxage=86400, stale-while-revalidate=604800')
}

import ParkingThemePage from '../../src/components/Parking/ThemePage'

export default function FreeParkingPage(props) {
  return <ParkingThemePage kind="free" {...props} />
}

export async function getStaticProps() {
  const { themeProps } = await import('../../src/services/parkingServer')
  return themeProps('free')
}

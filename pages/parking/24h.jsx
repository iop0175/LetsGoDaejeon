import ParkingThemePage from '../../src/components/Parking/ThemePage'

export default function AllDayParkingPage(props) {
  return <ParkingThemePage kind="24h" {...props} />
}

export async function getStaticProps() {
  const { themeProps } = await import('../../src/services/parkingServer')
  return themeProps('24h')
}

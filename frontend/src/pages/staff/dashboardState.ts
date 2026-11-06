/** Router `location.state` accepted by the Staff Dashboard. */
export interface DashboardLocationState {
  checkedIn?: {
    model: string
    licensePlate: string
  }
}

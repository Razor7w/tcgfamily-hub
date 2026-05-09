import DashboardUserNav from '@/components/navigation/DashboardUserNav'

export default function DashboardSidebar({
  isAdmin,
  isOwner
}: {
  isAdmin: boolean
  isOwner: boolean
}) {
  return <DashboardUserNav isAdmin={isAdmin} isOwner={isOwner} />
}

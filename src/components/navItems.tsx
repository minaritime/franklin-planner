import { AimOutlined, CalendarOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons'
import type { NavItem } from './SideNav'

export const NAV: readonly NavItem[] = [
  { key: 'day', label: '하루', icon: <ScheduleOutlined /> },
  { key: 'calendar', label: '달력', icon: <CalendarOutlined /> },
  { key: 'goals', label: '목표', icon: <AimOutlined /> },
  { key: 'settings', label: '설정', icon: <SettingOutlined /> },
]

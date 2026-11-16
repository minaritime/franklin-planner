import { FieldTimeOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import type { CSSProperties } from 'react'
import type { ZoneState } from './Timeline'

interface UnscheduleZoneProps {
  readonly zone: ZoneState
  /** 넓은 화면: 우선 업무 칸을 덮는다. 좁은 화면: 목록이 화면 밖일 수 있어 화면 위쪽에 띠로 붙인다 */
  readonly docked: 'cover' | 'top'
}

/** 일정표의 할일을 끄는 동안만 보이는 '시간 빼기' 칸. 여기에 놓으면 할일은 남고 시간만 빠진다 */
export default function UnscheduleZone({ zone, docked }: UnscheduleZoneProps) {
  const { token } = theme.useToken()
  if (zone === 'off') return null
  const over = zone === 'over'
  const place: CSSProperties =
    docked === 'cover'
      ? { position: 'absolute', inset: 0, borderRadius: token.borderRadiusLG, paddingTop: 96, justifyContent: 'flex-start' }
      : { position: 'fixed', top: 12, left: 16, right: 16, height: 96, borderRadius: token.borderRadiusLG, justifyContent: 'center' }

  return (
    <div
      data-unschedule-zone
      role="region"
      aria-label="시간 빼기"
      style={{
        ...place,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        border: `2px dashed ${over ? token.colorError : token.colorBorder}`,
        background: over ? token.colorErrorBg : token.colorBgElevated,
        boxShadow: over ? `0 0 0 4px ${token.colorErrorBg}` : token.boxShadowTertiary,
        color: over ? token.colorError : token.colorTextSecondary,
        transition: `background ${token.motionDurationFast}, border-color ${token.motionDurationFast}, box-shadow ${token.motionDurationFast}, color ${token.motionDurationFast}`,
        animation: 'unschedule-zone-in 120ms ease-out',
        pointerEvents: 'auto',
      }}
    >
      <FieldTimeOutlined style={{ fontSize: over ? 28 : 24, transition: `font-size ${token.motionDurationFast}` }} />
      <div style={{ fontSize: 15, fontWeight: 600 }}>여기에 놓으면 시간 빼기</div>
      <div style={{ fontSize: 12, color: over ? token.colorError : token.colorTextTertiary }}>할일은 목록에 그대로 남아요</div>
    </div>
  )
}

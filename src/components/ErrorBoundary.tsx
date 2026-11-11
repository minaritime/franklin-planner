import { Button, Result } from 'antd'
import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly message: string | null
}

/** 화면이 깨져도 데이터는 그대로 두고, 다시 열 수 있게만 한다 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.message === null) return this.props.children
    return (
      <Result
        status="warning"
        title="화면을 그리다 문제가 생겼습니다"
        subTitle={this.state.message}
        extra={
          <Button
            onClick={() => {
              window.location.hash = ''
              window.location.reload()
            }}
          >
            다시 열기
          </Button>
        }
      />
    )
  }
}

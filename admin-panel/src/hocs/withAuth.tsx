import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()

    useEffect(() => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true })
      }
    }, [isAuthenticated, navigate])

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}


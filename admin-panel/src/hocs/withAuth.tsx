import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const navigate = useNavigate()
    const { isAuthenticated, initialize } = useAuthStore()
    const [isChecking, setIsChecking] = useState(true)

    // Initialize auth state and check localStorage on mount
    useEffect(() => {
      initialize()
      
      // Check localStorage directly - this is the source of truth
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      
      if (!token || !user) {
        navigate('/login', { replace: true })
        return
      }
      
      // Small delay to ensure state is synced
      setTimeout(() => {
        setIsChecking(false)
      }, 100)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Show nothing while checking
    if (isChecking) {
      return null
    }

    // Final check before rendering - use localStorage as source of truth
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      return null
    }

    return <Component {...props} />
  }
}

